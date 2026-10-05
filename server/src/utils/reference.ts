import { db } from '../database/db.js';

export function generateComplaintNumber(): string {
  const currentYear = new Date().getFullYear();
  const prefix = `JS-${currentYear}-`;

  // Count existing complaints for this year to sequence cleanly
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM complaints WHERE complaint_number LIKE ?
  `).get(`${prefix}%`) as { count: number };

  const nextSeq = (row?.count || 0) + 1;
  const paddedSeq = String(nextSeq).padStart(6, '0');

  // Verify uniqueness (if exists due to deletions, increment until unique)
  let candidate = `${prefix}${paddedSeq}`;
  let attempt = nextSeq;
  while (db.prepare('SELECT id FROM complaints WHERE complaint_number = ?').get(candidate)) {
    attempt++;
    candidate = `${prefix}${String(attempt).padStart(6, '0')}`;
  }

  return candidate;
}
