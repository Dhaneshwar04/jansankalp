import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// Apply superadmin restriction to all admin routes
router.use(authenticate, requireRole('superadmin'));

// 1. Get Users List with Filters & Pagination (SRS Section 32)
router.get('/users', (req: Request, res: Response) => {
  try {
    const { role, status, constituency_id, department_id, search, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (status) {
      where += ' AND u.status = ?';
      params.push(status);
    }
    if (constituency_id) {
      where += ' AND u.constituency_id = ?';
      params.push(constituency_id);
    }
    if (department_id) {
      where += ' AND u.department_id = ?';
      params.push(department_id);
    }
    if (search) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM users u ${where}`).get(...params) as { total: number };
    const total = totalRow?.total || 0;

    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.mobile, u.role, u.status, u.designation,
             u.constituency_id, u.department_id, u.ward_id, u.address, u.state, u.district,
             u.avatar_url, u.created_at,
             c.name as constituency_name,
             d.name as department_name,
             w.name as ward_name
      FROM users u
      LEFT JOIN constituencies c ON u.constituency_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN wards w ON u.ward_id = w.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'USERS_FETCH_ERROR' });
  }
});

// 2. Create User (Staff, Officer, MLA, or Admin)
router.post('/users', (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, role, constituency_id, department_id, ward_id, designation } = req.body;

    if (!name || !email || !mobile || !role) {
      res.status(400).json({ success: false, message: 'Name, email, mobile and role are required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const validRoles = ['citizen', 'mla', 'staff', 'officer', 'superadmin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid user role', errorCode: 'INVALID_ROLE' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ success: false, message: 'A password of at least 8 characters is required', errorCode: 'WEAK_PASSWORD' });
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(mobile)) {
      res.status(400).json({ success: false, message: 'Mobile number must contain 10 to 15 digits', errorCode: 'INVALID_MOBILE' });
      return;
    }
    if (role === 'mla' && !constituency_id) {
      res.status(400).json({ success: false, message: 'An MLA must be assigned to a constituency', errorCode: 'MISSING_CONSTITUENCY' });
      return;
    }
    if (role === 'officer' && !department_id) {
      res.status(400).json({ success: false, message: 'An officer must be assigned to a department', errorCode: 'MISSING_DEPARTMENT' });
      return;
    }
    if (role === 'staff' && !constituency_id && !department_id) {
      res.status(400).json({ success: false, message: 'Staff must be assigned to a constituency or department', errorCode: 'MISSING_ASSIGNMENT' });
      return;
    }
    if (constituency_id && !db.prepare('SELECT 1 FROM constituencies WHERE id = ?').get(constituency_id)) {
      res.status(400).json({ success: false, message: 'Constituency not found', errorCode: 'INVALID_CONSTITUENCY' });
      return;
    }
    if (department_id && !db.prepare('SELECT 1 FROM departments WHERE id = ?').get(department_id)) {
      res.status(400).json({ success: false, message: 'Department not found', errorCode: 'INVALID_DEPARTMENT' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(email, mobile);
    if (existing) {
      res.status(409).json({ success: false, message: 'User with this email or mobile already exists', errorCode: 'USER_EXISTS' });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role, constituency_id, department_id, ward_id, designation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, email, mobile, passwordHash, role, constituency_id || null, department_id || null, ward_id || null, designation || null);

    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_CREATED',
      entity: 'user',
      entityId: id,
      newValue: { name, email, mobile, role },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'User created successfully', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'USER_CREATE_ERROR' });
  }
});

// 3. Update User Status / Role
router.patch('/users/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    const oldUser = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(id) as any;
    if (!oldUser) {
      res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
      return;
    }

    const validStatuses = ['active', 'suspended', 'pending'];
    const validRoles = ['citizen', 'mla', 'staff', 'officer', 'superadmin'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid user status', errorCode: 'INVALID_STATUS' });
      return;
    }
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid user role', errorCode: 'INVALID_ROLE' });
      return;
    }
    if (req.user!.id === id && ((role && role !== oldUser.role) || (status && status !== 'active'))) {
      res.status(409).json({ success: false, message: 'You cannot change your own role or deactivate your account', errorCode: 'SELF_MODIFICATION_BLOCKED' });
      return;
    }

    const removesActiveSuperadmin = oldUser.role === 'superadmin' && oldUser.status === 'active' &&
      ((role && role !== 'superadmin') || (status && status !== 'active'));
    if (removesActiveSuperadmin) {
      const activeAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin' AND status = 'active'").get() as { count: number };
      if (activeAdmins.count <= 1) {
        res.status(409).json({ success: false, message: 'At least one active superadmin must remain', errorCode: 'LAST_SUPERADMIN' });
        return;
      }
    }

    db.prepare(`
      UPDATE users
      SET status = COALESCE(?, status),
          role = COALESCE(?, role),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(status || null, role || null, id);

    recordAuditLog({
      userId: req.user!.id,
      action: 'USER_STATUS_UPDATED',
      entity: 'user',
      entityId: id,
      oldValue: { status: oldUser.status, role: oldUser.role },
      newValue: { status, role },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'USER_UPDATE_ERROR' });
  }
});

// 4. Audit Logs Viewer (SRS Section 39)
router.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const { entity, action, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (entity) {
      where += ' AND a.entity = ?';
      params.push(entity);
    }
    if (action) {
      where += ' AND a.action = ?';
      params.push(action);
    }

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM audit_logs a ${where}`).get(...params) as { total: number };
    const total = totalRow?.total || 0;

    const logs = db.prepare(`
      SELECT a.*, u.name as user_name, u.role as user_role, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      logs: logs.map((l: any) => ({
        ...l,
        old_value: l.old_value ? JSON.parse(l.old_value) : null,
        new_value: l.new_value ? JSON.parse(l.new_value) : null
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'AUDIT_LOG_ERROR' });
  }
});

// 5. Get & Update SLA Settings (SRS Section 28, 61)
router.get('/sla-settings', (_req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM sla_settings').all();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'SLA_FETCH_ERROR' });
  }
});

router.put('/sla-settings', (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      res.status(400).json({ success: false, message: 'Settings array required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE sla_settings
      SET resolution_target_hours = ?, warning_threshold_percent = ?, description = ?
      WHERE priority = ?
    `);

    settings.forEach(s => {
      updateStmt.run(s.resolution_target_hours, s.warning_threshold_percent || 80, s.description || null, s.priority);
    });

    recordAuditLog({
      userId: req.user!.id,
      action: 'SLA_SETTINGS_UPDATED',
      entity: 'sla_config',
      newValue: settings,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'SLA settings updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'SLA_UPDATE_ERROR' });
  }
});

// 6. System Settings
router.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM system_settings').all();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'SETTINGS_ERROR' });
  }
});

export default router;
