import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Dashboard Analytics & KPIs (SRS Section 23, 31, 38, 63)
router.get('/', authenticate, requireRole('mla', 'staff', 'superadmin'), (req: Request, res: Response) => {
  try {
    const { constituency_id } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (req.user!.role === 'mla' || req.user!.role === 'staff') {
      if (!req.user!.constituency_id) {
        res.status(403).json({ success: false, message: 'Your account is not assigned to a constituency', errorCode: 'MISSING_CONSTITUENCY' });
        return;
      }
      if (constituency_id && constituency_id !== req.user!.constituency_id) {
        res.status(403).json({ success: false, message: 'You can only view analytics for your constituency', errorCode: 'FORBIDDEN' });
        return;
      }
    }

    const targetConstId = req.user!.role === 'superadmin'
      ? constituency_id
      : req.user!.constituency_id;
    if (targetConstId) {
      whereClause += ' AND c.constituency_id = ?';
      params.push(targetConstId);
    }

    // 1. Complaint Counts by Status
    const countsRow = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN c.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN c.status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN c.status = 'verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN c.status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN c.status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN c.status = 'reopened' THEN 1 ELSE 0 END) as reopened,
        SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN c.priority = 'critical' AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 ELSE 0 END) as critical_active,
        SUM(CASE WHEN c.is_sla_breached = 1 THEN 1 ELSE 0 END) as sla_breached
      FROM complaints c
      ${whereClause}
    `).get(...params) as any;

    const total = countsRow.total || 0;
    const resolvedTotal = (countsRow.resolved || 0) + (countsRow.closed || 0);
    const pendingTotal = (countsRow.submitted || 0) + (countsRow.under_review || 0) + (countsRow.verified || 0) + (countsRow.assigned || 0) + (countsRow.reopened || 0);
    const inProgressTotal = countsRow.in_progress || 0;

    // 2. KPI: Complaint Resolution Rate (SRS Section 63)
    // Formula: Resolved Complaints / Total Complaints * 100
    const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 1000) / 10 : 0;

    // 3. KPI: SLA Compliance Rate (SRS Section 63)
    // Formula: Complaints Resolved Within SLA / Total Resolved Complaints * 100
    const slaComplianceRow = db.prepare(`
      SELECT
        COUNT(*) as total_resolved,
        SUM(CASE WHEN datetime(resolved_at) <= datetime(sla_due_at) THEN 1 ELSE 0 END) as within_sla
      FROM complaints c
      ${whereClause} AND c.status IN ('resolved', 'closed') AND c.resolved_at IS NOT NULL
    `).get(...params) as any;

    const totalResolvedWithDates = slaComplianceRow?.total_resolved || 0;
    const withinSla = slaComplianceRow?.within_sla || 0;
    const slaComplianceRate = totalResolvedWithDates > 0 ? Math.round((withinSla / totalResolvedWithDates) * 1000) / 10 : 0;

    // 4. KPI: Average Resolution Time (SRS Section 63)
    // Formula: Total Resolution Duration / Number of Resolved Complaints
    const avgDurationRow = db.prepare(`
      SELECT
        AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_resolution_hours
      FROM complaints c
      ${whereClause} AND c.status IN ('resolved', 'closed') AND c.resolved_at IS NOT NULL
    `).get(...params) as any;

    const avgResolutionHours = avgDurationRow?.avg_resolution_hours ? Math.round(avgDurationRow.avg_resolution_hours * 10) / 10 : 0;

    // 5. KPI: Citizen Satisfaction (SRS Section 63)
    // Formula: Total Rating Score / Number of Ratings
    const feedbackRow = db.prepare(`
      SELECT
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_ratings
      FROM complaint_feedback fb
      JOIN complaints c ON fb.complaint_id = c.id
      ${whereClause}
    `).get(...params) as any;

    const avgSatisfactionScore = feedbackRow?.avg_rating ? Math.round(feedbackRow.avg_rating * 10) / 10 : 0;
    const totalRatings = feedbackRow?.total_ratings || 0;

    // 6. Category Distribution
    const categoryStats = db.prepare(`
      SELECT cat.name, cat.icon, COUNT(c.id) as count
      FROM categories cat
      LEFT JOIN complaints c ON cat.id = c.category_id ${targetConstId ? 'AND c.constituency_id = ?' : ''}
      GROUP BY cat.id
      ORDER BY count DESC
    `).all(...(targetConstId ? [targetConstId] : []));

    // 7. Department Performance Breakdown
    const departmentStats = db.prepare(`
      SELECT d.name, d.code,
             COUNT(c.id) as total_assigned,
             SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count,
             SUM(CASE WHEN c.status NOT IN ('resolved', 'closed', 'rejected') THEN 1 ELSE 0 END) as pending_count,
             SUM(CASE WHEN c.is_sla_breached = 1 THEN 1 ELSE 0 END) as breached_count
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id ${targetConstId ? 'AND c.constituency_id = ?' : ''}
      GROUP BY d.id
      ORDER BY total_assigned DESC
    `).all(...(targetConstId ? [targetConstId] : []));

    // 8. Ward Breakdown
    const wardStats = db.prepare(`
      SELECT w.name as ward_name, w.ward_number,
             COUNT(c.id) as count,
             SUM(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved
      FROM wards w
      LEFT JOIN complaints c ON w.id = c.ward_id
      ${targetConstId ? 'WHERE w.constituency_id = ?' : ''}
      GROUP BY w.id
      ORDER BY count DESC
    `).all(...(targetConstId ? [targetConstId] : []));

    // 9. Monthly / Timeline trends
    const recentActivity = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
      FROM complaints c
      ${whereClause}
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date DESC
      LIMIT 14
    `).all(...params);

    res.json({
      success: true,
      kpis: {
        total,
        pendingTotal,
        inProgressTotal,
        resolvedTotal,
        reopenedTotal: countsRow.reopened || 0,
        criticalActive: countsRow.critical_active || 0,
        slaBreachedTotal: countsRow.sla_breached || 0,
        resolutionRate,
        slaComplianceRate,
        avgResolutionHours,
        citizenSatisfaction: avgSatisfactionScore,
        totalRatingsCount: totalRatings
      },
      counts: countsRow,
      categoryDistribution: categoryStats,
      departmentPerformance: departmentStats,
      wardStats,
      timelineTrend: recentActivity.reverse()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'ANALYTICS_ERROR' });
  }
});

export default router;
