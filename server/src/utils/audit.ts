import { db } from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | string[] | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | string[] | null;
}

export function recordAuditLog(params: AuditParams): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity, entity_id, old_value, new_value, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const ipStr = Array.isArray(params.ipAddress)
      ? params.ipAddress[0]
      : params.ipAddress || '127.0.0.1';

    const entityIdStr = Array.isArray(params.entityId)
      ? params.entityId[0]
      : params.entityId || null;

    stmt.run(
      uuidv4(),
      params.userId || null,
      params.action,
      params.entity,
      entityIdStr,
      params.oldValue ? JSON.stringify(params.oldValue) : null,
      params.newValue ? JSON.stringify(params.newValue) : null,
      ipStr
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
