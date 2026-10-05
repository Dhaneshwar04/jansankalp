import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { config } from '../config/index.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { generateComplaintNumber } from '../utils/reference.js';
import { calculateSla } from '../utils/sla.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

function canAccessComplaint(user: NonNullable<Request['user']>, complaint: any): boolean {
  if (user.role === 'superadmin') return true;
  if (user.role === 'citizen') return complaint.citizen_id === user.id;
  if (user.role === 'officer') {
    return complaint.assigned_user_id === user.id || complaint.department_id === user.department_id;
  }
  if (user.role === 'mla') return complaint.constituency_id === user.constituency_id;
  if (user.role === 'staff') {
    return complaint.constituency_id === user.constituency_id || complaint.department_id === user.department_id;
  }
  return false;
}

// Configure Multer for File Uploads
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `evidence_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Supported: JPG, PNG, WEBP, MP4, PDF'));
    }
  },
});

// 1. Duplicate Complaint Detection (SRS Section 22)
// Checks if another complaint exists near specified coordinates with same category within N meters
router.get('/duplicate-check', (req: Request, res: Response) => {
  try {
    const { lat, lng, category_id, radius_meters = 200 } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ success: false, message: 'Latitude and Longitude are required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusM = parseFloat(radius_meters as string);

    let query = `
      SELECT c.id, c.complaint_number, c.title, c.description, c.status, c.priority,
             COALESCE(c.support_count, 1) as support_count,
             c.latitude, c.longitude, c.location_address, c.created_at,
             cat.name as category_name,
             ROUND(haversine_meters(?, ?, c.latitude, c.longitude), 1) as distance_meters
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.status NOT IN ('resolved', 'closed', 'rejected')
        AND haversine_meters(?, ?, c.latitude, c.longitude) <= ?
    `;

    const params: any[] = [latitude, longitude, latitude, longitude, radiusM];

    if (category_id) {
      query += ` AND c.category_id = ?`;
      params.push(category_id);
    }

    query += ` ORDER BY distance_meters ASC LIMIT 5`;

    const duplicates = db.prepare(query).all(...params);

    res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      radiusMeters: radiusM,
      count: duplicates.length,
      duplicates,
      message: duplicates.length > 0
        ? `Found ${duplicates.length} similar active complaint(s) within ${radiusM} meters.`
        : 'No similar complaints found in this vicinity.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'DUPLICATE_CHECK_ERROR' });
  }
});

// 2. Geospatial Map Data (SRS Section 24, 45)
router.get('/map', optionalAuth, (req: Request, res: Response) => {
  try {
    const { constituency_id, category_id, status, priority, department_id, ward_id } = req.query;

    let query = `
      SELECT c.id, c.complaint_number, c.title, c.status, c.priority,
             c.latitude, c.longitude, c.location_address, c.landmark,
             c.sla_due_at, c.is_sla_breached, c.created_at,
             cat.name as category_name, cat.icon as category_icon,
             d.name as department_name,
             w.name as ward_name
      FROM complaints c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN wards w ON c.ward_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based scoping for MLA: scope to own constituency by default
    if (req.user?.role === 'mla' && req.user.constituency_id) {
      query += ` AND c.constituency_id = ?`;
      params.push(req.user.constituency_id);
    } else if (constituency_id) {
      query += ` AND c.constituency_id = ?`;
      params.push(constituency_id);
    }

    if (category_id) {
      query += ` AND c.category_id = ?`;
      params.push(category_id);
    }
    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (priority) {
      query += ` AND c.priority = ?`;
      params.push(priority);
    }
    if (department_id) {
      query += ` AND c.department_id = ?`;
      params.push(department_id);
    }
    if (ward_id) {
      query += ` AND c.ward_id = ?`;
      params.push(ward_id);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 500`;

    const markers = db.prepare(query).all(...params);

    res.json({
      success: true,
      count: markers.length,
      markers
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'MAP_ERROR' });
  }
});

// 3. Paginated & Filterable Complaints List
router.get('/', authenticate, (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 15,
      status,
      priority,
      category_id,
      department_id,
      constituency_id,
      ward_id,
      citizen_id,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    if (req.user!.role === 'mla' && !req.user!.constituency_id) {
      res.status(403).json({ success: false, message: 'Your account is not assigned to a constituency', errorCode: 'MISSING_CONSTITUENCY' });
      return;
    }
    if (req.user!.role === 'staff' && !req.user!.constituency_id && !req.user!.department_id) {
      res.status(403).json({ success: false, message: 'Your account is not assigned to a constituency or department', errorCode: 'MISSING_ASSIGNMENT' });
      return;
    }

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Access Scoping based on Role
    if (req.user!.role === 'citizen') {
      whereClause += ` AND c.citizen_id = ?`;
      params.push(req.user!.id);
    } else if (req.user!.role === 'mla') {
      if (req.user!.constituency_id) {
        whereClause += ` AND c.constituency_id = ?`;
        params.push(req.user!.constituency_id);
      }
    } else if (req.user!.role === 'staff') {
      if (req.user!.constituency_id && req.user!.department_id) {
        whereClause += ` AND (c.constituency_id = ? OR c.department_id = ?)`;
        params.push(req.user!.constituency_id, req.user!.department_id);
      } else if (req.user!.constituency_id) {
        whereClause += ` AND c.constituency_id = ?`;
        params.push(req.user!.constituency_id);
      } else if (req.user!.department_id) {
        whereClause += ` AND c.department_id = ?`;
        params.push(req.user!.department_id);
      }
    } else if (req.user!.role === 'officer') {
        whereClause += ` AND (c.assigned_user_id = ? OR c.department_id = ?)`;
        params.push(req.user!.id, req.user!.department_id);
    }

    if (status) {
      whereClause += ` AND c.status = ?`;
      params.push(status);
    }
    if (priority) {
      whereClause += ` AND c.priority = ?`;
      params.push(priority);
    }
    if (category_id) {
      whereClause += ` AND c.category_id = ?`;
      params.push(category_id);
    }
    if (department_id) {
      whereClause += ` AND c.department_id = ?`;
      params.push(department_id);
    }
    if (constituency_id && !whereClause.includes('c.constituency_id = ?')) {
      whereClause += ` AND c.constituency_id = ?`;
      params.push(constituency_id);
    }
    if (ward_id) {
      whereClause += ` AND c.ward_id = ?`;
      params.push(ward_id);
    }
    if (citizen_id && !whereClause.includes('c.citizen_id = ?')) {
      whereClause += ` AND c.citizen_id = ?`;
      params.push(citizen_id);
    }

    if (search) {
      whereClause += ` AND (c.complaint_number LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.location_address LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Count Total
    const countSql = `SELECT COUNT(*) as total FROM complaints c ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };
    const total = totalRow?.total || 0;

    // Fetch Records
    const dataSql = `
      SELECT c.id, c.complaint_number, c.citizen_id, c.title, c.description,
             c.category_id, c.subcategory_id, c.priority, c.status,
             c.department_id, c.assigned_user_id, c.constituency_id, c.ward_id,
             c.latitude, c.longitude, c.location_address, c.landmark,
             c.sla_hours, c.sla_due_at, c.is_sla_breached, c.reopen_count,
             c.created_at, c.updated_at, c.resolved_at,
             u.name as citizen_name, u.mobile as citizen_mobile,
             cat.name as category_name, cat.icon as category_icon,
             sub.name as subcategory_name,
             dept.name as department_name, dept.code as department_code,
             assigned.name as assigned_officer_name,
             const.name as constituency_name,
             w.name as ward_name,
             (SELECT file_url FROM complaint_media WHERE complaint_id = c.id LIMIT 1) as thumbnail_url,
             (SELECT COUNT(*) FROM complaint_comments WHERE complaint_id = c.id) as comments_count,
             fb.rating as citizen_rating
      FROM complaints c
      LEFT JOIN users u ON c.citizen_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN subcategories sub ON c.subcategory_id = sub.id
      LEFT JOIN departments dept ON c.department_id = dept.id
      LEFT JOIN users assigned ON c.assigned_user_id = assigned.id
      LEFT JOIN constituencies const ON c.constituency_id = const.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN complaint_feedback fb ON c.id = fb.complaint_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const data = db.prepare(dataSql).all(...params, limitNum, offset);

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'FETCH_COMPLAINTS_ERROR' });
  }
});

// 4. Get Single Complaint Details (SRS Section 15, 16)
router.get('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const complaint = db.prepare(`
      SELECT c.*,
             u.name as citizen_name, u.email as citizen_email, u.mobile as citizen_mobile, u.avatar_url as citizen_avatar,
             cat.name as category_name, cat.icon as category_icon,
             sub.name as subcategory_name,
             dept.name as department_name, dept.code as department_code, dept.contact_phone as department_phone,
             assigned.name as assigned_officer_name, assigned.mobile as assigned_officer_phone, assigned.designation as assigned_officer_title,
             const.name as constituency_name,
             w.name as ward_name, w.ward_number
      FROM complaints c
      LEFT JOIN users u ON c.citizen_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN subcategories sub ON c.subcategory_id = sub.id
      LEFT JOIN departments dept ON c.department_id = dept.id
      LEFT JOIN users assigned ON c.assigned_user_id = assigned.id
      LEFT JOIN constituencies const ON c.constituency_id = const.id
      LEFT JOIN wards w ON c.ward_id = w.id
      WHERE c.id = ? OR c.complaint_number = ?
    `).get(id, id) as any;

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    if (!canAccessComplaint(req.user!, complaint)) {
      res.status(403).json({ success: false, message: 'You do not have access to this complaint', errorCode: 'FORBIDDEN' });
      return;
    }

    // Media
    const media = db.prepare(`
      SELECT m.*, u.name as uploader_name
      FROM complaint_media m
      LEFT JOIN users u ON m.uploaded_by = u.id
      WHERE m.complaint_id = ?
      ORDER BY m.created_at ASC
    `).all(complaint.id);

    // Status Timeline History
    const history = db.prepare(`
      SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
      FROM complaint_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.created_at ASC
    `).all(complaint.id);

    // Comments
    const comments = db.prepare(`
      SELECT com.*, u.name as author_name, u.role as author_role, u.avatar_url as author_avatar
      FROM complaint_comments com
      LEFT JOIN users u ON com.user_id = u.id
      WHERE com.complaint_id = ?
        AND (com.is_internal = 0 OR ? IN ('mla', 'staff', 'officer', 'superadmin'))
      ORDER BY com.created_at ASC
    `).all(complaint.id, req.user!.role);

    // Citizen Feedback
    const feedback = db.prepare(`
      SELECT * FROM complaint_feedback WHERE complaint_id = ?
    `).get(complaint.id);

    // Calculate SLA time remaining or overdue
    const dueTime = new Date(complaint.sla_due_at).getTime();
    const nowTime = Date.now();
    const diffHours = (dueTime - nowTime) / (1000 * 3600);
    const slaStatus = diffHours < 0 ? 'breached' : diffHours < (complaint.sla_hours * 0.2) ? 'approaching' : 'on_track';

    const hasSupported = req.user ? Boolean(db.prepare('SELECT 1 FROM complaint_supports WHERE complaint_id = ? AND user_id = ?').get(complaint.id, (req.user as any).id)) : false;

    res.json({
      success: true,
      complaint: {
        ...complaint,
        support_count: complaint.support_count || 1,
        has_supported: hasSupported,
        media,
        history,
        comments,
        feedback,
        slaStatus,
        slaHoursRemaining: Math.round(diffHours * 10) / 10
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'COMPLAINT_DETAIL_ERROR' });
  }
});

// 5. Create Complaint (SRS Section 8, 9, 10, 12, 13)
router.post('/', authenticate, upload.array('files', 5), (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category_id,
      subcategory_id,
      priority,
      latitude,
      longitude,
      location_address,
      landmark,
      constituency_id,
      ward_id,
      media_urls // optional pre-hosted URLs or links
    } = req.body;

    if (!title || !description || !category_id || !latitude || !longitude || !location_address) {
      res.status(400).json({
        success: false,
        message: 'Title, description, category, latitude, longitude and address are required',
        errorCode: 'VALIDATION_FAILED'
      });
      return;
    }

    const complaintId = uuidv4();
    const complaintNumber = generateComplaintNumber();

    // Default or lookup category's associated department
    const category = db.prepare('SELECT department_id FROM categories WHERE id = ?').get(category_id) as { department_id: string } | undefined;
    const departmentId = category?.department_id || 'dept-pwd';

    // SLA calculation
    const assignedPriority = priority || 'medium';
    const sla = calculateSla(assignedPriority);

    const constId = constituency_id || req.user?.constituency_id || 'const-shivajinagar';
    
    // Find closest ward if ward_id is not given
    let assignedWardId = ward_id;
    if (!assignedWardId) {
      const wardRow = db.prepare('SELECT id FROM wards WHERE constituency_id = ? LIMIT 1').get(constId) as { id: string } | undefined;
      assignedWardId = wardRow?.id || 'ward-01';
    }

    // Insert Complaint Record
    db.prepare(`
      INSERT INTO complaints (
        id, complaint_number, citizen_id, title, description, category_id, subcategory_id,
        priority, status, department_id, constituency_id, ward_id,
        latitude, longitude, location_address, landmark,
        sla_hours, sla_due_at, is_sla_breached, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(
      complaintId,
      complaintNumber,
      req.user!.id,
      title,
      description,
      category_id,
      subcategory_id || null,
      assignedPriority,
      departmentId,
      constId,
      assignedWardId,
      parseFloat(latitude),
      parseFloat(longitude),
      location_address,
      landmark || null,
      sla.slaHours,
      sla.slaDueAt
    );

    // Initial Timeline Entry
    db.prepare(`
      INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
      VALUES (?, ?, 'none', 'submitted', 'Grievance submitted by citizen with GPS location', ?, datetime('now'))
    `).run(uuidv4(), complaintId, req.user!.id);

    // Handle Uploaded Files
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const insertMedia = db.prepare(`
        INSERT INTO complaint_media (id, complaint_id, file_url, file_name, file_type, mime_type, file_size, file_category, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'evidence', ?, datetime('now'))
      `);

      files.forEach(f => {
        const fileType = f.mimetype.startsWith('video') ? 'video' : f.mimetype.includes('pdf') ? 'document' : 'image';
        insertMedia.run(
          uuidv4(),
          complaintId,
          `/uploads/${f.filename}`,
          f.originalname,
          fileType,
          f.mimetype,
          f.size,
          req.user!.id
        );
      });
    }

    // Handle external media URLs passed in body
    if (media_urls) {
      const urls = Array.isArray(media_urls) ? media_urls : [media_urls];
      const insertMedia = db.prepare(`
        INSERT INTO complaint_media (id, complaint_id, file_url, file_name, file_type, mime_type, file_size, file_category, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, 'image', 'image/jpeg', 100000, 'evidence', ?, datetime('now'))
      `);
      urls.forEach((url: string, index: number) => {
        if (typeof url === 'string' && url.trim()) {
          insertMedia.run(uuidv4(), complaintId, url.trim(), `evidence_photo_${index + 1}.jpg`, req.user!.id);
        }
      });
    }

    // Notification to citizen
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
      VALUES (?, ?, 'Grievance Registered', ?, 'status_update', ?, datetime('now'))
    `).run(
      uuidv4(),
      req.user!.id,
      `Your grievance ${complaintNumber} has been received and logged under ${category_id}. You can track live updates anytime.`,
      complaintId
    );

    // Notification to MLA Office staff
    const staffMembers = db.prepare(`SELECT id FROM users WHERE role IN ('mla', 'staff') AND constituency_id = ?`).all(constId) as { id: string }[];
    staffMembers.forEach(s => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
        VALUES (?, ?, 'New Constituency Grievance', ?, 'status_update', ?, datetime('now'))
      `).run(uuidv4(), s.id, `New complaint ${complaintNumber}: ${title} reported at ${location_address}`, complaintId);
    });

    // Record Audit
    recordAuditLog({
      userId: req.user!.id,
      action: 'COMPLAINT_CREATED',
      entity: 'complaint',
      entityId: complaintId,
      newValue: { complaintNumber, title, category_id, priority: assignedPriority },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully',
      complaintNumber,
      complaintId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CREATE_COMPLAINT_ERROR' });
  }
});

// 6. Update Status (SRS Section 14, 15)
router.patch('/:id/status', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    const allowedStatuses = ['submitted', 'under_review', 'verified', 'assigned', 'in_progress', 'awaiting_citizen_info', 'resolved', 'closed', 'rejected', 'reopened'];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid complaint status', errorCode: 'INVALID_STATUS' });
      return;
    }

    if (!canAccessComplaint(req.user!, complaint)) {
      res.status(403).json({ success: false, message: 'You do not have access to this complaint', errorCode: 'FORBIDDEN' });
      return;
    }

    if (req.user!.role === 'officer') {
      const isAssignedToOfficer = complaint.assigned_user_id === req.user!.id;
      const isDepartmentTask = complaint.department_id === req.user!.department_id;
      if ((!isAssignedToOfficer && !isDepartmentTask) || !['in_progress', 'resolved'].includes(status)) {
        res.status(403).json({ success: false, message: 'Officers can update assigned department tasks to in progress or resolved', errorCode: 'FORBIDDEN' });
        return;
      }
    } else if (!['mla', 'staff', 'superadmin'].includes(req.user!.role)) {
      res.status(403).json({ success: false, message: 'Only constituency staff and assigned officers can update complaint status', errorCode: 'FORBIDDEN' });
      return;
    }

    if (complaint.status === status) {
      res.status(409).json({ success: false, message: 'Complaint is already in this status', errorCode: 'STATUS_UNCHANGED' });
      return;
    }

    const oldStatus = complaint.status;
    const isResolved = status === 'resolved';
    const isClosed = status === 'closed';

    let resolvedAt = complaint.resolved_at;
    let closedAt = complaint.closed_at;

    if (isResolved && !resolvedAt) {
      resolvedAt = new Date().toISOString();
    }
    if (isClosed && !closedAt) {
      closedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE complaints
      SET status = ?,
          resolution_remarks = COALESCE(?, resolution_remarks),
          resolved_at = ?,
          closed_at = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(status, remarks || null, resolvedAt, closedAt, id);

    // Record Status History
    db.prepare(`
      INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), id, oldStatus, status, remarks || `Status transitioned from ${oldStatus} to ${status}`, req.user!.id);

    // Notify Citizen
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
      VALUES (?, ?, 'Status Update', ?, 'status_update', ?, datetime('now'))
    `).run(
      uuidv4(),
      complaint.citizen_id,
      `Your grievance ${complaint.complaint_number} status changed to ${status.toUpperCase().replace('_', ' ')}. ${remarks || ''}`,
      id
    );

    recordAuditLog({
      userId: req.user!.id,
      action: 'STATUS_CHANGE',
      entity: 'complaint',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status, remarks },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      oldStatus,
      newStatus: status
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'STATUS_UPDATE_ERROR' });
  }
});

// 7. Assign Complaint (SRS Section 26)
router.post('/:id/assign', authenticate, requireRole('mla', 'staff', 'superadmin'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { department_id, assigned_user_id, expected_resolution_date, remarks } = req.body;

    if (!department_id) {
      res.status(400).json({ success: false, message: 'Department is required for assignment', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    if (!canAccessComplaint(req.user!, complaint)) {
      res.status(403).json({ success: false, message: 'You do not have access to this complaint', errorCode: 'FORBIDDEN' });
      return;
    }

    const dept = db.prepare('SELECT id, name FROM departments WHERE id = ? AND status = \'active\'').get(department_id) as { id: string; name: string } | undefined;
    if (!dept) {
      res.status(404).json({ success: false, message: 'Active department not found', errorCode: 'DEPARTMENT_NOT_FOUND' });
      return;
    }

    let officer: { id: string; name: string } | undefined;
    if (assigned_user_id) {
      officer = db.prepare(`
        SELECT id, name FROM users
        WHERE id = ? AND role = 'officer' AND status = 'active' AND department_id = ?
      `).get(assigned_user_id, department_id) as { id: string; name: string } | undefined;
      if (!officer) {
        res.status(400).json({ success: false, message: 'Select an active officer from the chosen department', errorCode: 'INVALID_OFFICER' });
        return;
      }
    }

    db.prepare(`
      UPDATE complaints
      SET department_id = ?,
          assigned_user_id = ?,
          status = 'assigned',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(department_id, assigned_user_id || null, id);

    const assignmentRemark = `Assigned to ${dept?.name || 'Department'}${officer ? ` (Officer: ${officer.name})` : ''}. ${remarks || ''}`;

    db.prepare(`
      INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
      VALUES (?, ?, ?, 'assigned', ?, ?, datetime('now'))
    `).run(uuidv4(), id, complaint.status, assignmentRemark, req.user!.id);

    // Notify the selected officer, or the active department queue if unassigned.
    const recipients = assigned_user_id
      ? [{ id: assigned_user_id }]
      : db.prepare("SELECT id FROM users WHERE role = 'officer' AND status = 'active' AND department_id = ?").all(department_id) as { id: string }[];
    recipients.forEach(recipient => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
        VALUES (?, ?, 'New Department Grievance', ?, 'assignment', ?, datetime('now'))
      `).run(
        uuidv4(),
        recipient.id,
        `Grievance ${complaint.complaint_number}: ${complaint.title} was assigned to ${dept.name}${officer ? ` and to you` : ''}. Target SLA: ${complaint.sla_hours} hours.`,
        id
      );
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'COMPLAINT_ASSIGNED',
      entity: 'complaint',
      entityId: id,
      newValue: { department_id, assigned_user_id, remarks },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'ASSIGN_ERROR' });
  }
});

// 8. Add Comments / Communication (SRS Section 17)
router.post('/:id/comments', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, is_internal = false } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: 'Comment message cannot be empty', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }
    if (!canAccessComplaint(req.user!, complaint)) {
      res.status(403).json({ success: false, message: 'You do not have access to this complaint', errorCode: 'FORBIDDEN' });
      return;
    }
    if (is_internal && !['mla', 'staff', 'officer', 'superadmin'].includes(req.user!.role)) {
      res.status(403).json({ success: false, message: 'Only staff can post internal comments', errorCode: 'FORBIDDEN' });
      return;
    }

    const commentId = uuidv4();
    db.prepare(`
      INSERT INTO complaint_comments (id, complaint_id, user_id, message, is_internal, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(commentId, id, req.user!.id, message.trim(), is_internal ? 1 : 0);

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      commentId
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'COMMENT_ERROR' });
  }
});

// 9. Reopen Complaint (SRS Section 20)
router.post('/:id/reopen', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, additional_description } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, message: 'Reopen reason is required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      res.status(400).json({
        success: false,
        message: 'Only resolved or closed complaints can be reopened',
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
      return;
    }

    const fullReason = `${reason}${additional_description ? ` - ${additional_description}` : ''}`;

    db.prepare(`
      UPDATE complaints
      SET status = 'reopened',
          reopen_count = reopen_count + 1,
          reopen_reason = ?,
          resolved_at = null,
          closed_at = null,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(fullReason, id);

    db.prepare(`
      INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
      VALUES (?, ?, ?, 'reopened', ?, ?, datetime('now'))
    `).run(uuidv4(), id, complaint.status, `Reopened by citizen: ${fullReason}`, req.user!.id);

    // Notify MLA / Staff
    const staffMembers = db.prepare(`SELECT id FROM users WHERE role IN ('mla', 'staff') AND constituency_id = ?`).all(complaint.constituency_id) as { id: string }[];
    staffMembers.forEach(s => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
        VALUES (?, ?, 'Grievance Reopened', ?, 'status_update', ?, datetime('now'))
      `).run(uuidv4(), s.id, `Citizen reopened ${complaint.complaint_number}: ${reason}`, id);
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'COMPLAINT_REOPENED',
      entity: 'complaint',
      entityId: id,
      newValue: { reason: fullReason },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Complaint reopened and flagged for MLA review'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'REOPEN_ERROR' });
  }
});

// 10. Citizen Feedback & Rating (SRS Section 21)
router.post('/:id/feedback', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, satisfaction, feedback_text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    // Check if feedback already submitted
    const existing = db.prepare('SELECT id FROM complaint_feedback WHERE complaint_id = ?').get(id);
    if (existing) {
      db.prepare(`
        UPDATE complaint_feedback
        SET rating = ?, satisfaction = ?, feedback_text = ?, created_at = datetime('now')
        WHERE complaint_id = ?
      `).run(rating, satisfaction || 'Satisfied', feedback_text || null, id);
    } else {
      db.prepare(`
        INSERT INTO complaint_feedback (id, complaint_id, citizen_id, rating, satisfaction, feedback_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(uuidv4(), id, req.user!.id, rating, satisfaction || 'Satisfied', feedback_text || null);
    }

    // Also transition status to 'closed' if resolved
    if (complaint.status === 'resolved') {
      db.prepare(`UPDATE complaints SET status = 'closed', closed_at = datetime('now') WHERE id = ?`).run(id);
      db.prepare(`
        INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
        VALUES (?, ?, 'resolved', 'closed', 'Citizen submitted rating feedback. Case closed.', ?, datetime('now'))
      `).run(uuidv4(), id, req.user!.id);
    }

    res.json({
      success: true,
      message: 'Feedback submitted. Thank you for rating the service.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'FEEDBACK_ERROR' });
  }
});

// 11. Upload Resolution or Additional Evidence Photo (SRS Section 12)
router.post('/:id/media', authenticate, upload.array('files', 3), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { file_category = 'resolution' } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No media files provided', errorCode: 'NO_FILES' });
      return;
    }

    const insertMedia = db.prepare(`
      INSERT INTO complaint_media (id, complaint_id, file_url, file_name, file_type, mime_type, file_size, file_category, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const uploaded = files.map(f => {
      const mediaId = uuidv4();
      const fileType = f.mimetype.startsWith('video') ? 'video' : f.mimetype.includes('pdf') ? 'document' : 'image';
      const fileUrl = `/uploads/${f.filename}`;
      insertMedia.run(
        mediaId,
        id,
        fileUrl,
        f.originalname,
        fileType,
        f.mimetype,
        f.size,
        file_category,
        req.user!.id
      );
      return { id: mediaId, url: fileUrl, name: f.originalname };
    });

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      files: uploaded
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'MEDIA_UPLOAD_ERROR' });
  }
});


// 12. Support / Upvote an Existing Complaint (SRS Section 22)
router.post('/:id/support', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify complaint exists
    const complaint = db.prepare('SELECT id, complaint_number, title, priority, support_count, status FROM complaints WHERE id = ? OR complaint_number = ?').get(id, id) as any;
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found', errorCode: 'COMPLAINT_NOT_FOUND' });
      return;
    }

    if (complaint.status === 'resolved' || complaint.status === 'closed') {
      res.status(400).json({ success: false, message: 'Cannot support a resolved or closed grievance', errorCode: 'COMPLAINT_CLOSED' });
      return;
    }

    // Check if user already supported
    const existing = db.prepare('SELECT id FROM complaint_supports WHERE complaint_id = ? AND user_id = ?').get(complaint.id, userId);
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'You have already supported this grievance',
        errorCode: 'ALREADY_SUPPORTED',
        support_count: complaint.support_count || 1
      });
      return;
    }

    const supportId = uuidv4();
    const newSupportCount = (complaint.support_count || 1) + 1;

    // Prioritize if high community support (SRS Section 22)
    let newPriority = complaint.priority;
    if (newSupportCount >= 5 && (complaint.priority === 'low' || complaint.priority === 'medium')) {
      newPriority = 'high';
    }

    const insertSupport = db.prepare('INSERT INTO complaint_supports (id, complaint_id, user_id, created_at) VALUES (?, ?, ?, datetime(\'now\'))');
    const updateComplaint = db.prepare('UPDATE complaints SET support_count = ?, priority = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, complaint_id, created_at)
      VALUES (?, ?, ?, ?, 'status_update', ?, datetime('now'))
    `);

    const tx = db.transaction(() => {
      insertSupport.run(supportId, complaint.id, userId);
      updateComplaint.run(newSupportCount, newPriority, complaint.id);
      insertNotif.run(
        uuidv4(),
        userId,
        'Grievance Supported',
        `You supported complaint #${complaint.complaint_number}. Community voice: ${newSupportCount} citizens.`,
        complaint.id
      );
    });
    tx();

    recordAuditLog({
      userId,
      action: 'SUPPORT_COMPLAINT',
      entity: 'complaint',
      entityId: complaint.id,
      newValue: { support_count: newSupportCount, priority: newPriority },
      ipAddress: req.ip || req.socket.remoteAddress
    });

    res.json({
      success: true,
      message: `Grievance #${complaint.complaint_number} supported successfully! Community voice: ${newSupportCount} citizens.`,
      support_count: newSupportCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'SUPPORT_ERROR' });
  }
});

export default router;
