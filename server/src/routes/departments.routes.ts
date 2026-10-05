import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// 1. Get all departments with officer counts and active complaint statistics
router.get('/', (_req: Request, res: Response) => {
  try {
    const departments = db.prepare(`
      SELECT d.*,
             (SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'officer' AND status = 'active') as officer_count,
             (SELECT COUNT(*) FROM complaints WHERE department_id = d.id AND status NOT IN ('resolved', 'closed', 'rejected')) as active_complaints,
             (SELECT COUNT(*) FROM complaints WHERE department_id = d.id AND status IN ('resolved', 'closed')) as resolved_complaints
      FROM departments d
      ORDER BY d.name ASC
    `).all() as any[];

    // Fetch officers list for each department
    const officers = db.prepare(`
      SELECT id, name, email, mobile, designation, department_id
      FROM users
      WHERE role = 'officer' AND status = 'active'
    `).all() as any[];

    const result = departments.map(d => ({
      ...d,
      officers: officers.filter(o => o.department_id === d.id)
    }));

    res.json({
      success: true,
      departments: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'DEPARTMENT_FETCH_ERROR' });
  }
});

// 2. Admin: Create Department (SRS Section 29)
router.post('/', authenticate, requireRole('superadmin'), (req: Request, res: Response) => {
  try {
    const { name, code, description, contact_email, contact_phone } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, message: 'Name and Code are required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedName = String(name).trim();
    const existing = db.prepare('SELECT id FROM departments WHERE code = ? OR lower(name) = lower(?)').get(normalizedCode, normalizedName);
    if (existing) {
      res.status(409).json({ success: false, message: 'A department with this code or name already exists', errorCode: 'DEPARTMENT_EXISTS' });
      return;
    }

    const id = `dept-${normalizedCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    db.prepare(`
      INSERT INTO departments (id, name, code, description, contact_email, contact_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, normalizedName, normalizedCode, description || null, contact_email || null, contact_phone || null);

    recordAuditLog({
      userId: req.user!.id,
      action: 'DEPARTMENT_CREATED',
      entity: 'department',
      entityId: id,
      newValue: { name: normalizedName, code: normalizedCode },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Department created', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'DEPARTMENT_CREATE_ERROR' });
  }
});

export default router;
