import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// 1. Get all constituencies with MLA info and wards
router.get('/', (_req: Request, res: Response) => {
  try {
    const constituencies = db.prepare(`
      SELECT c.*,
             mla.name as mla_name, mla.email as mla_email, mla.mobile as mla_mobile, mla.avatar_url as mla_avatar,
             (SELECT COUNT(*) FROM complaints WHERE constituency_id = c.id) as total_complaints,
             (SELECT COUNT(*) FROM complaints WHERE constituency_id = c.id AND status NOT IN ('resolved', 'closed', 'rejected')) as active_complaints
      FROM constituencies c
      LEFT JOIN users mla ON c.mla_id = mla.id
      ORDER BY c.name ASC
    `).all() as any[];

    const wards = db.prepare(`
      SELECT w.*,
             (SELECT COUNT(*) FROM complaints WHERE ward_id = w.id) as complaint_count
      FROM wards w
      ORDER BY w.ward_number ASC
    `).all() as any[];

    const result = constituencies.map(c => ({
      ...c,
      boundary: c.boundary_geojson ? JSON.parse(c.boundary_geojson) : null,
      wards: wards.filter(w => w.constituency_id === c.id)
    }));

    res.json({
      success: true,
      constituencies: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CONSTITUENCY_FETCH_ERROR' });
  }
});

// 2. Get Single Constituency with Ward Stats
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const c = db.prepare(`
      SELECT c.*,
             mla.name as mla_name, mla.email as mla_email, mla.mobile as mla_mobile, mla.avatar_url as mla_avatar
      FROM constituencies c
      LEFT JOIN users mla ON c.mla_id = mla.id
      WHERE c.id = ? OR c.code = ?
    `).get(id, id) as any;

    if (!c) {
      res.status(404).json({ success: false, message: 'Constituency not found', errorCode: 'NOT_FOUND' });
      return;
    }

    const wards = db.prepare(`
      SELECT w.*,
             (SELECT COUNT(*) FROM complaints WHERE ward_id = w.id) as total_complaints,
             (SELECT COUNT(*) FROM complaints WHERE ward_id = w.id AND status NOT IN ('resolved', 'closed', 'rejected')) as active_complaints
      FROM wards w
      WHERE w.constituency_id = ?
      ORDER BY w.ward_number ASC
    `).all(c.id);

    res.json({
      success: true,
      constituency: {
        ...c,
        boundary: c.boundary_geojson ? JSON.parse(c.boundary_geojson) : null,
        wards
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CONSTITUENCY_DETAIL_ERROR' });
  }
});

// 3. Admin: Update MLA Assignment or Constituency details
router.put('/:id', authenticate, requireRole('superadmin'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, state, district, code, mla_id, center_lat, center_lng, boundary_geojson } = req.body;

    db.prepare(`
      UPDATE constituencies
      SET name = COALESCE(?, name),
          state = COALESCE(?, state),
          district = COALESCE(?, district),
          code = COALESCE(?, code),
          mla_id = COALESCE(?, mla_id),
          center_lat = COALESCE(?, center_lat),
          center_lng = COALESCE(?, center_lng),
          boundary_geojson = COALESCE(?, boundary_geojson),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, state, district, code, mla_id, center_lat, center_lng, boundary_geojson, id);

    recordAuditLog({
      userId: req.user!.id,
      action: 'CONSTITUENCY_UPDATED',
      entity: 'constituency',
      entityId: id,
      newValue: req.body,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Constituency updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'CONSTITUENCY_UPDATE_ERROR' });
  }
});

export default router;
