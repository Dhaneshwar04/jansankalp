import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'jansankalp.db');
export const db = new Database(dbPath);

// Enable WAL mode for concurrent performance and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Register custom spatial mathematical function into SQLite
 * Haversine formula calculates the great-circle distance between two points in kilometers
 */
db.function('haversine_km', (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 999999;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
});

/**
 * Calculate distance in meters
 */
db.function('haversine_meters', (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 999999999;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
});

/**
 * Check if coordinate is within specified radius (in kilometers)
 */
db.function('point_in_radius', (lat: number, lon: number, centerLat: number, centerLon: number, radiusKm: number) => {
  if (lat === null || lon === null || centerLat === null || centerLon === null) return 0;
  const R = 6371;
  const dLat = (centerLat - lat) * (Math.PI / 180);
  const dLon = (centerLon - lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat * (Math.PI / 180)) *
      Math.cos(centerLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return dist <= radiusKm ? 1 : 0;
});

/**
 * Initialize Database Schema DDL
 */
export function initDatabaseSchema() {
  db.exec(`
    -- 1. Constituencies
    CREATE TABLE IF NOT EXISTS constituencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      mla_id TEXT,
      boundary_geojson TEXT,
      center_lat REAL NOT NULL,
      center_lng REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. Wards
    CREATE TABLE IF NOT EXISTS wards (
      id TEXT PRIMARY KEY,
      constituency_id TEXT NOT NULL,
      ward_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      area_sqkm REAL DEFAULT 2.5,
      FOREIGN KEY (constituency_id) REFERENCES constituencies(id) ON DELETE CASCADE
    );

    -- 3. Departments
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 4. Users (Citizen, MLA, Staff, Officer, SuperAdmin)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('citizen', 'mla', 'staff', 'officer', 'superadmin')),
      constituency_id TEXT,
      department_id TEXT,
      ward_id TEXT,
      designation TEXT,
      address TEXT,
      state TEXT DEFAULT 'Maharashtra',
      district TEXT DEFAULT 'Pune',
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (constituency_id) REFERENCES constituencies(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    -- 5. Complaint Categories & Subcategories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL,
      department_id TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      default_priority TEXT NOT NULL DEFAULT 'medium' CHECK(default_priority IN ('critical', 'high', 'medium', 'low')),
      sla_hours INTEGER NOT NULL DEFAULT 48,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- 6. SLA Configuration Matrix
    CREATE TABLE IF NOT EXISTS sla_settings (
      priority TEXT PRIMARY KEY CHECK(priority IN ('critical', 'high', 'medium', 'low')),
      resolution_target_hours INTEGER NOT NULL,
      warning_threshold_percent INTEGER NOT NULL DEFAULT 80,
      description TEXT
    );

    -- 7. Complaints
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      complaint_number TEXT UNIQUE NOT NULL,
      citizen_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low')),
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN (
        'submitted', 'under_review', 'verified', 'assigned', 'in_progress',
        'awaiting_citizen_info', 'resolved', 'closed', 'rejected', 'reopened'
      )),
      department_id TEXT,
      assigned_user_id TEXT,
      constituency_id TEXT NOT NULL,
      ward_id TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      location_address TEXT NOT NULL,
      landmark TEXT,
      location_accuracy REAL DEFAULT 10.0,
      sla_hours INTEGER NOT NULL,
      sla_due_at TEXT NOT NULL,
      is_sla_breached INTEGER NOT NULL DEFAULT 0,
      reopen_count INTEGER NOT NULL DEFAULT 0,
      reopen_reason TEXT,
      resolution_remarks TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (constituency_id) REFERENCES constituencies(id) ON DELETE RESTRICT,
      FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL
    );

    -- 8. Media Files (Photos, Videos, PDFs)
    CREATE TABLE IF NOT EXISTS complaint_media (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK(file_type IN ('image', 'video', 'document')),
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_category TEXT NOT NULL DEFAULT 'evidence' CHECK(file_category IN ('evidence', 'resolution')),
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 9. Complaint Status Timeline History
    CREATE TABLE IF NOT EXISTS complaint_history (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      remarks TEXT,
      changed_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 10. Complaint Communication Comments
    CREATE TABLE IF NOT EXISTS complaint_comments (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 11. Citizen Feedback & Satisfaction Rating
    CREATE TABLE IF NOT EXISTS complaint_feedback (
      id TEXT PRIMARY KEY,
      complaint_id TEXT UNIQUE NOT NULL,
      citizen_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      satisfaction TEXT NOT NULL CHECK(satisfaction IN ('Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied')),
      feedback_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    -- 12. Complaint Community Supports / Upvotes (SRS Section 22)
    CREATE TABLE IF NOT EXISTS complaint_supports (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(complaint_id, user_id),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 12. In-App Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'status_update',
      complaint_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL
    );

    -- 13. Immutable Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 14. System Configuration
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    -- High-Performance Indexes for Rapid Lookups and Geospatial Searches
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
    CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_constituency ON complaints(constituency_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_coords ON complaints(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
    CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_history(complaint_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_supports_complaint ON complaint_supports(complaint_id);
  `);

  try {
    db.exec(`ALTER TABLE complaints ADD COLUMN support_count INTEGER NOT NULL DEFAULT 1;`);
  } catch {
    // Column already exists
  }
}

// Initialize tables on import
initDatabaseSchema();
