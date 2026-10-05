import { db } from '../database/db.js';

export interface SlaInfo {
  slaHours: number;
  slaDueAt: string;
}

export function calculateSla(priority: string, customHours?: number): SlaInfo {
  let hours = customHours;

  if (!hours) {
    const row = db.prepare('SELECT resolution_target_hours FROM sla_settings WHERE priority = ?').get(priority) as { resolution_target_hours: number } | undefined;
    if (row && row.resolution_target_hours) {
      hours = row.resolution_target_hours;
    } else {
      switch (priority) {
        case 'critical': hours = 24; break;
        case 'high': hours = 48; break;
        case 'medium': hours = 120; break;
        case 'low': hours = 240; break;
        default: hours = 72; break;
      }
    }
  }

  const dueDate = new Date(Date.now() + hours * 3600 * 1000);
  return {
    slaHours: hours,
    slaDueAt: dueDate.toISOString(),
  };
}

/**
 * Updates `is_sla_breached` flag across all active complaints where current time > sla_due_at
 */
export function checkAndUpdateSlaBreaches(): number {
  const nowIso = new Date().toISOString();
  const result = db.prepare(`
    UPDATE complaints
    SET is_sla_breached = 1, updated_at = datetime('now')
    WHERE status NOT IN ('resolved', 'closed', 'rejected')
      AND sla_due_at < ?
      AND is_sla_breached = 0
  `).run(nowIso);

  return result.changes;
}
