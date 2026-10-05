import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 1. Get user notifications
router.get('/', authenticate, (req: Request, res: Response) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, c.complaint_number
      FROM notifications n
      LEFT JOIN complaints c ON n.complaint_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user!.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(req.user!.id) as { count: number };

    res.json({
      success: true,
      notifications,
      unreadCount: unreadCount?.count || 0
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'NOTIFICATION_ERROR' });
  }
});

// 2. Mark Single Notification as Read
router.patch('/:id/read', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'NOTIFICATION_UPDATE_ERROR' });
  }
});

// 3. Mark All Notifications as Read
router.post('/mark-all-read', authenticate, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'NOTIFICATIONS_MARK_ALL_ERROR' });
  }
});

export default router;
