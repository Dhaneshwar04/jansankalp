import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// 1. Generate Report Summary Data
router.get('/summary', authenticate, requireRole('mla', 'staff', 'superadmin'), (req: Request, res: Response) => {
  try {
    const { start_date, end_date, constituency_id, department_id } = req.query;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      where += ' AND c.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND c.created_at <= ?';
      params.push(end_date);
    }
    if (constituency_id) {
      where += ' AND c.constituency_id = ?';
      params.push(constituency_id);
    }
    if (department_id) {
      where += ' AND c.department_id = ?';
      params.push(department_id);
    }

    if (req.user!.role === 'mla') {
      if (!req.user!.constituency_id || (constituency_id && constituency_id !== req.user!.constituency_id)) {
        res.status(403).json({ success: false, message: 'You can only report on your assigned constituency', errorCode: 'FORBIDDEN' });
        return;
      }
      where += ' AND c.constituency_id = ?';
      params.push(req.user!.constituency_id);
    } else if (req.user!.role === 'staff') {
      if (!req.user!.constituency_id && !req.user!.department_id) {
        res.status(403).json({ success: false, message: 'Your account is not assigned to a constituency or department', errorCode: 'MISSING_ASSIGNMENT' });
        return;
      }
      const scopes: string[] = [];
      if (req.user!.constituency_id) {
        scopes.push('c.constituency_id = ?');
        params.push(req.user!.constituency_id);
      }
      if (req.user!.department_id) {
        scopes.push('c.department_id = ?');
        params.push(req.user!.department_id);
      }
      where += ` AND (${scopes.join(' OR ')})`;
    }

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_complaints,
        SUM(CASE WHEN c.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN c.status = 'reopened' THEN 1 ELSE 0 END) as reopened,
        SUM(CASE WHEN c.is_sla_breached = 1 THEN 1 ELSE 0 END) as sla_breached,
        AVG(CASE WHEN c.status IN ('resolved', 'closed') AND c.resolved_at IS NOT NULL
            THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24 ELSE NULL END) as avg_resolution_hours
      FROM complaints c
      ${where}
    `).get(...params);

    res.json({
      success: true,
      summary
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'REPORT_SUMMARY_ERROR' });
  }
});

// 2. Export Complaints to CSV format (SRS Section 37)
router.get('/export-csv', authenticate, requireRole('mla', 'staff', 'superadmin'), (req: Request, res: Response) => {
  try {
    const { status, priority, category_id, department_id, constituency_id } = req.query;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (status) {
      where += ' AND c.status = ?';
      params.push(status);
    }
    if (priority) {
      where += ' AND c.priority = ?';
      params.push(priority);
    }
    if (category_id) {
      where += ' AND c.category_id = ?';
      params.push(category_id);
    }
    if (department_id) {
      where += ' AND c.department_id = ?';
      params.push(department_id);
    }
    if (constituency_id) {
      where += ' AND c.constituency_id = ?';
      params.push(constituency_id);
    }

    if (req.user!.role === 'mla') {
      if (!req.user!.constituency_id || (constituency_id && constituency_id !== req.user!.constituency_id)) {
        res.status(403).json({ success: false, message: 'You can only export your assigned constituency', errorCode: 'FORBIDDEN' });
        return;
      }
      where += ' AND c.constituency_id = ?';
      params.push(req.user!.constituency_id);
    } else if (req.user!.role === 'staff') {
      if (!req.user!.constituency_id && !req.user!.department_id) {
        res.status(403).json({ success: false, message: 'Your account is not assigned to a constituency or department', errorCode: 'MISSING_ASSIGNMENT' });
        return;
      }
      const scopes: string[] = [];
      if (req.user!.constituency_id) {
        scopes.push('c.constituency_id = ?');
        params.push(req.user!.constituency_id);
      }
      if (req.user!.department_id) {
        scopes.push('c.department_id = ?');
        params.push(req.user!.department_id);
      }
      where += ` AND (${scopes.join(' OR ')})`;
    }

    const complaints = db.prepare(`
      SELECT
        c.complaint_number,
        c.title,
        cat.name as category,
        sub.name as subcategory,
        c.priority,
        c.status,
        u.name as citizen_name,
        u.mobile as citizen_mobile,
        dept.name as department,
        assigned.name as assigned_officer,
        const.name as constituency,
        w.name as ward,
        c.location_address,
        c.latitude,
        c.longitude,
        c.sla_hours,
        c.sla_due_at,
        c.is_sla_breached,
        c.reopen_count,
        c.created_at,
        c.resolved_at,
        fb.rating as rating,
        fb.satisfaction as satisfaction
      FROM complaints c
      LEFT JOIN users u ON c.citizen_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN subcategories sub ON c.subcategory_id = sub.id
      LEFT JOIN departments dept ON c.department_id = dept.id
      LEFT JOIN users assigned ON c.assigned_user_id = assigned.id
      LEFT JOIN constituencies const ON c.constituency_id = const.id
      LEFT JOIN wards w ON c.ward_id = w.id
      LEFT JOIN complaint_feedback fb ON c.id = fb.complaint_id
      ${where}
      ORDER BY c.created_at DESC
    `).all(...params) as any[];

    // Convert to CSV
    const headers = [
      'Complaint ID', 'Title', 'Category', 'Subcategory', 'Priority', 'Status',
      'Citizen Name', 'Citizen Mobile', 'Department', 'Assigned Officer',
      'Constituency', 'Ward', 'Address', 'Latitude', 'Longitude',
      'SLA Target (Hours)', 'SLA Due Date', 'SLA Breached', 'Reopen Count',
      'Created At', 'Resolved At', 'Rating (1-5)', 'Satisfaction'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.join(','),
      ...complaints.map(c => [
        escapeCsv(c.complaint_number),
        escapeCsv(c.title),
        escapeCsv(c.category),
        escapeCsv(c.subcategory),
        escapeCsv(c.priority),
        escapeCsv(c.status),
        escapeCsv(c.citizen_name),
        escapeCsv(c.citizen_mobile),
        escapeCsv(c.department),
        escapeCsv(c.assigned_officer),
        escapeCsv(c.constituency),
        escapeCsv(c.ward),
        escapeCsv(c.location_address),
        c.latitude,
        c.longitude,
        c.sla_hours,
        escapeCsv(c.sla_due_at),
        c.is_sla_breached ? 'Yes' : 'No',
        c.reopen_count,
        escapeCsv(c.created_at),
        escapeCsv(c.resolved_at),
        c.rating || '',
        escapeCsv(c.satisfaction)
      ].join(','))
    ];

    const csvContent = csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=JanSankalp_Complaints_Report_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CSV_EXPORT_ERROR' });
  }
});

export default router;
