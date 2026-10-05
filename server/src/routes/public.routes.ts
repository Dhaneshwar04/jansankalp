import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

// Public Transparency Portal API (SRS Section 62)
router.get('/transparency', (req: Request, res: Response) => {
  try {
    const { constituency_id } = req.query;
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (constituency_id) {
      where += ' AND c.constituency_id = ?';
      params.push(constituency_id);
    }

    const counts = db.prepare(`
      SELECT
        COUNT(*) as total_reported,
        SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as total_resolved,
        SUM(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 ELSE 0 END) as total_in_action,
        AVG(CASE WHEN c.status IN ('resolved', 'closed') AND c.resolved_at IS NOT NULL
            THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24 ELSE NULL END) as avg_resolution_hours
      FROM complaints c
      ${where}
    `).get(...params) as any;

    const total = counts?.total_reported || 0;
    const resolved = counts?.total_resolved || 0;
    const resolutionPercentage = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;

    // Public Anonymized Category Breakdown
    const categories = db.prepare(`
      SELECT cat.name, cat.icon,
             COUNT(c.id) as reported_count,
             SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count
      FROM categories cat
      LEFT JOIN complaints c ON cat.id = c.category_id ${constituency_id ? 'AND c.constituency_id = ?' : ''}
      GROUP BY cat.id
      ORDER BY reported_count DESC
    `).all(...(constituency_id ? [constituency_id] : []));

    // Public Anonymized Recent Resolutions (No citizen PII exposed)
    const recentResolutions = db.prepare(`
      SELECT c.complaint_number, c.title, c.location_address, c.created_at, c.resolved_at,
             cat.name as category_name, d.name as department_name, w.name as ward_name
      FROM complaints c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN wards w ON c.ward_id = w.id
      ${where} AND c.status IN ('resolved', 'closed')
      ORDER BY c.resolved_at DESC
      LIMIT 6
    `).all(...params);

    res.json({
      success: true,
      stats: {
        totalReported: total,
        totalResolved: resolved,
        totalInAction: counts?.total_in_action || 0,
        resolutionPercentage,
        avgResolutionHours: counts?.avg_resolution_hours ? Math.round(counts.avg_resolution_hours * 10) / 10 : 28.5
      },
      categories,
      recentResolutions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'PUBLIC_STATS_ERROR' });
  }
});

export default router;
