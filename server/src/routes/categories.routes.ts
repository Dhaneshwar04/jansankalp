import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// 1. Get all active categories with subcategories
router.get('/', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, d.name as department_name, d.code as department_code
      FROM categories c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.is_active = 1
      ORDER BY c.name ASC
    `).all() as any[];

    const subcategories = db.prepare(`
      SELECT * FROM subcategories ORDER BY name ASC
    `).all() as any[];

    const result = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category_id === cat.id)
    }));

    res.json({
      success: true,
      categories: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CATEGORY_FETCH_ERROR' });
  }
});

// 2. Admin: Create Category (SRS Section 11, 61)
router.post('/', authenticate, requireRole('superadmin'), (req: Request, res: Response) => {
  try {
    const { name, code, icon, department_id, description, subcategories } = req.body;
    if (!name || !code || !department_id) {
      res.status(400).json({ success: false, message: 'Name, code, and department_id are required', errorCode: 'VALIDATION_FAILED' });
      return;
    }

    const id = `cat-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    db.prepare(`
      INSERT INTO categories (id, name, code, icon, department_id, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, name, code.toUpperCase(), icon || 'Folder', department_id, description || null);

    if (Array.isArray(subcategories)) {
      const insertSub = db.prepare(`
        INSERT INTO subcategories (id, category_id, name, default_priority, sla_hours)
        VALUES (?, ?, ?, ?, ?)
      `);
      subcategories.forEach(s => {
        insertSub.run(uuidv4(), id, s.name, s.default_priority || 'medium', s.sla_hours || 48);
      });
    }

    recordAuditLog({
      userId: req.user!.id,
      action: 'CATEGORY_CREATED',
      entity: 'category',
      entityId: id,
      newValue: { name, code, department_id },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Category created', id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CATEGORY_CREATE_ERROR' });
  }
});

// 3. Admin: Update Category
router.put('/:id', authenticate, requireRole('superadmin'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, department_id, description, is_active } = req.body;

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          icon = COALESCE(?, icon),
          department_id = COALESCE(?, department_id),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, icon, department_id, description, is_active, id);

    recordAuditLog({
      userId: req.user!.id,
      action: 'CATEGORY_UPDATED',
      entity: 'category',
      entityId: id,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Category updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CATEGORY_UPDATE_ERROR' });
  }
});

export default router;
