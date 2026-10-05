import { db } from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function runSeed() {
  console.log('Seeding JanSankalp Database...');

  // Clear existing data in reverse order of foreign keys
  db.exec(`
    DELETE FROM complaint_feedback;
    DELETE FROM complaint_comments;
    DELETE FROM complaint_history;
    DELETE FROM complaint_media;
    DELETE FROM notifications;
    DELETE FROM audit_logs;
    DELETE FROM complaints;
    DELETE FROM subcategories;
    DELETE FROM categories;
    DELETE FROM users;
    DELETE FROM wards;
    DELETE FROM constituencies;
    DELETE FROM departments;
    DELETE FROM sla_settings;
    DELETE FROM system_settings;
  `);

  const citizenHash = bcrypt.hashSync('Jansankalp@1', 10);
  const mlaHash = bcrypt.hashSync('Jansankalp@2', 10);
  const staffHash = bcrypt.hashSync('Jansankalp@3', 10);
  const officerHash = bcrypt.hashSync('Jansankalp@4', 10);
  const adminHash = bcrypt.hashSync('Jansankalp@5', 10);

  // 1. System Settings
  const insertSetting = db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)');
  insertSetting.run('APP_NAME', 'JanSankalp', 'Platform title');
  insertSetting.run('STATE_GOV', 'Government of Maharashtra', 'State Jurisdiction');
  insertSetting.run('SUPPORTED_LANGUAGES', 'en,hi,mr', 'Supported interface languages');
  insertSetting.run('MAX_FILE_SIZE_MB', '15', 'Max allowed media upload in MB');
  insertSetting.run('DUPLICATE_RADIUS_METERS', '200', 'Radius in meters to check for duplicate complaints');
  insertSetting.run('REOPEN_WINDOW_DAYS', '7', 'Days citizen can request reopening after resolution');

  // 2. SLA Settings
  const insertSla = db.prepare('INSERT INTO sla_settings (priority, resolution_target_hours, warning_threshold_percent, description) VALUES (?, ?, ?, ?)');
  insertSla.run('critical', 24, 80, 'Life safety, major pipeline burst, live dangling electric wire');
  insertSla.run('high', 48, 80, 'Major road crater, dark street block, sewer overflow');
  insertSla.run('medium', 120, 80, 'Garbage accumulation, water pressure, footpath repairs');
  insertSla.run('low', 240, 80, 'Garden beautification, signboards, cosmetic maintenance');

  // 3. Departments
  const insertDept = db.prepare('INSERT INTO departments (id, name, code, description, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?)');
  const depts = [
    { id: 'dept-pwd', name: 'Public Works & Roads Department (PWD)', code: 'PWD', desc: 'Road repairs, potholes, bridges, footpaths & storm water', email: 'pwd.pune@jansankalp.gov.in', phone: '020-25501101' },
    { id: 'dept-water', name: 'Water Supply & Sewerage Board', code: 'WATER', desc: 'Drinking water distribution, pipeline maintenance and drainage', email: 'water.pune@jansankalp.gov.in', phone: '020-25501102' },
    { id: 'dept-power', name: 'State Electricity Distribution (MSEDCL)', code: 'ELEC', desc: 'Power supply, street lighting, transformers and cables', email: 'power.pune@jansankalp.gov.in', phone: '020-25501103' },
    { id: 'dept-sanitation', name: 'Solid Waste & Sanitation Department', code: 'SWM', desc: 'Door-to-door garbage collection, street sweeping and public hygiene', email: 'sanitation.pune@jansankalp.gov.in', phone: '020-25501104' },
    { id: 'dept-health', name: 'Public Health & Hospital Infrastructure', code: 'HEALTH', desc: 'Primary health centers, pest control, mosquito fogging', email: 'health.pune@jansankalp.gov.in', phone: '020-25501105' },
    { id: 'dept-garden', name: 'Parks, Gardens & Public Amenities', code: 'PARKS', desc: 'Public parks, community halls, playgrounds, street trees', email: 'gardens.pune@jansankalp.gov.in', phone: '020-25501106' }
  ];
  depts.forEach(d => insertDept.run(d.id, d.name, d.code, d.desc, d.email, d.phone));

  // 4. Constituencies
  const insertConst = db.prepare('INSERT INTO constituencies (id, name, state, district, code, mla_id, boundary_geojson, center_lat, center_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Boundary GeoJSON polygon for Shivajinagar Pune
  const shivajinagarBoundary = JSON.stringify({
    type: "Polygon",
    coordinates: [[
      [73.8250, 18.5150],
      [73.8650, 18.5150],
      [73.8680, 18.5550],
      [73.8200, 18.5550],
      [73.8250, 18.5150]
    ]]
  });

  insertConst.run(
    'const-shivajinagar',
    'Shivajinagar Assembly Constituency',
    'Maharashtra',
    'Pune',
    'MH-208',
    'user-mla-01',
    shivajinagarBoundary,
    18.5314,
    73.8446
  );

  insertConst.run(
    'const-bandra-west',
    'Bandra West Assembly Constituency',
    'Maharashtra',
    'Mumbai Suburban',
    'MH-177',
    null,
    null,
    19.0596,
    72.8295
  );

  // 5. Wards in Shivajinagar
  const insertWard = db.prepare('INSERT INTO wards (id, constituency_id, ward_number, name, area_sqkm) VALUES (?, ?, ?, ?, ?)');
  const wards = [
    { id: 'ward-01', constId: 'const-shivajinagar', num: 1, name: 'FC Road - Deccan Gymkhana', area: 2.1 },
    { id: 'ward-02', constId: 'const-shivajinagar', num: 2, name: 'Shivajinagar Gaothan & Station', area: 1.8 },
    { id: 'ward-03', constId: 'const-shivajinagar', num: 3, name: 'Model Colony & Deep Bungalow', area: 2.4 },
    { id: 'ward-04', constId: 'const-shivajinagar', num: 4, name: 'Gokhale Nagar - Wadarwadi', area: 1.9 },
    { id: 'ward-05', constId: 'const-shivajinagar', num: 5, name: 'Wakdewadi & Range Hills', area: 3.2 }
  ];
  wards.forEach(w => insertWard.run(w.id, w.constId, w.num, w.name, w.area));

  // 6. Users (All 5 roles)
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, mobile, password_hash, role, constituency_id, department_id, ward_id, designation, address, state, district, avatar_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Super Admin
  insertUser.run(
    'user-admin-01',
    'System Administrator',
    'admin@jansankalp.gov.in',
    '9800000001',
    adminHash,
    'superadmin',
    null,
    null,
    null,
    'Chief Technology Administrator',
    'Central Secretariat, Mantralaya',
    'Maharashtra',
    'Mumbai',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'active'
  );

  // MLA
  insertUser.run(
    'user-mla-01',
    'Hon. Rajesh Shinde (MLA)',
    'mla@jansankalp.gov.in',
    '9800000002',
    mlaHash,
    'mla',
    'const-shivajinagar',
    null,
    null,
    'Member of Legislative Assembly (Shivajinagar)',
    'Shivajinagar MLA Public Office, FC Road',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'active'
  );

  // Constituency Staff
  insertUser.run(
    'user-staff-01',
    'Sunita Patil (Constituency Office)',
    'staff@jansankalp.gov.in',
    '9800000003',
    staffHash,
    'staff',
    'const-shivajinagar',
    null,
    'ward-01',
    'Public Grievance Coordinator',
    'Shivajinagar MLA Citizen Facilitation Center',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    'active'
  );

  // Department Officer
  insertUser.run(
    'user-officer-01',
    'Er. Vikrant Deshmukh',
    'officer@jansankalp.gov.in',
    '9800000004',
    officerHash,
    'officer',
    'const-shivajinagar',
    'dept-pwd',
    'ward-01',
    'Executive Engineer (Roads Division)',
    'PWD Divisional Office, Pune Circle',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'active'
  );

  // Department Officer 2 (Water)
  insertUser.run(
    'user-officer-02',
    'Er. Ananya Joshi',
    'water.officer@jansankalp.gov.in',
    '9800000005',
    officerHash,
    'officer',
    'const-shivajinagar',
    'dept-water',
    'ward-03',
    'Assistant Engineer (Water & Drainage)',
    'Water Works Office, Model Colony',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    'active'
  );

  // Citizens
  insertUser.run(
    'user-citizen-01',
    'Ramesh Sharma',
    'citizen@jansankalp.gov.in',
    '9876543210',
    citizenHash,
    'citizen',
    'const-shivajinagar',
    null,
    'ward-01',
    'Citizen Resident',
    'Flat 304, Shanti Heights, FC Road',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'active'
  );

  insertUser.run(
    'user-citizen-02',
    'Priya Kulkarni',
    'priya@jansankalp.gov.in',
    '9876543211',
    citizenHash,
    'citizen',
    'const-shivajinagar',
    null,
    'ward-03',
    'Citizen Resident',
    'B-12, Omkar Society, Model Colony',
    'Maharashtra',
    'Pune',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'active'
  );

  // 7. Categories & Subcategories
  const insertCat = db.prepare('INSERT INTO categories (id, name, code, icon, department_id, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertSubcat = db.prepare('INSERT INTO subcategories (id, category_id, name, default_priority, sla_hours) VALUES (?, ?, ?, ?, ?)');

  const categories = [
    {
      id: 'cat-roads',
      name: 'Roads & Footpaths',
      code: 'ROADS',
      icon: 'Road',
      deptId: 'dept-pwd',
      desc: 'Potholes, road surface erosion, broken sidewalks, manholes',
      subcats: [
        { id: 'sub-pothole', name: 'Potholes & Broken Asphalt', priority: 'high', sla: 48 },
        { id: 'sub-footpath', name: 'Broken Footpath & Encroachment', priority: 'medium', sla: 120 },
        { id: 'sub-manhole', name: 'Missing or Broken Manhole Lid', priority: 'critical', sla: 24 },
        { id: 'sub-speedbreaker', name: 'Damaged or Unmarked Speed Breaker', priority: 'medium', sla: 72 }
      ]
    },
    {
      id: 'cat-water',
      name: 'Water Supply & Pipelines',
      code: 'WATER',
      icon: 'Droplets',
      deptId: 'dept-water',
      desc: 'Pipeline bursts, water scarcity, contamination, low pressure',
      subcats: [
        { id: 'sub-leak', name: 'Main Pipeline Burst / Major Leakage', priority: 'critical', sla: 24 },
        { id: 'sub-nosupply', name: 'No Water Supply in Area', priority: 'high', sla: 24 },
        { id: 'sub-contamination', name: 'Dirty / Muddy Tap Water', priority: 'high', sla: 36 },
        { id: 'sub-lowpressure', name: 'Low Pressure in Supply Lines', priority: 'medium', sla: 72 }
      ]
    },
    {
      id: 'cat-electricity',
      name: 'Electricity & Streetlights',
      code: 'ELEC',
      icon: 'Zap',
      deptId: 'dept-power',
      desc: 'Streetlight outage, hanging wires, transformer sparks, power cuts',
      subcats: [
        { id: 'sub-streetlights', name: 'Streetlights Not Working (Dark Area)', priority: 'high', sla: 48 },
        { id: 'sub-wire', name: 'Dangling / Live Electrical Wire', priority: 'critical', sla: 12 },
        { id: 'sub-transformer', name: 'Transformer Sparks / Burning Smell', priority: 'critical', sla: 12 },
        { id: 'sub-pole', name: 'Damaged / Tilted Electric Pole', priority: 'high', sla: 48 }
      ]
    },
    {
      id: 'cat-sanitation',
      name: 'Garbage & Sanitation',
      code: 'SWM',
      icon: 'Trash2',
      deptId: 'dept-sanitation',
      desc: 'Overflowing dumpsters, open garbage burning, uncollected waste',
      subcats: [
        { id: 'sub-overflow', name: 'Overflowing Waste Container', priority: 'high', sla: 24 },
        { id: 'sub-doorcollection', name: 'Missed Door-to-Door Waste Collection', priority: 'medium', sla: 48 },
        { id: 'sub-opendumpt', name: 'Illegal Roadside Dumping', priority: 'medium', sla: 72 },
        { id: 'sub-deadanimal', name: 'Removal of Dead Stray Animal', priority: 'critical', sla: 12 }
      ]
    },
    {
      id: 'cat-drainage',
      name: 'Drainage & Sewage',
      code: 'DRAIN',
      icon: 'Waves',
      deptId: 'dept-water',
      desc: 'Clogged storm drains, sewage backflow, missing gutters',
      subcats: [
        { id: 'sub-sewer-choke', name: 'Sewage Line Overflow on Street', priority: 'critical', sla: 24 },
        { id: 'sub-storm-drain', name: 'Blocked Stormwater Drain', priority: 'high', sla: 48 },
        { id: 'sub-foul-smell', name: 'Severe Gutter Odor / Mosquito Breeding', priority: 'medium', sla: 72 }
      ]
    },
    {
      id: 'cat-amenities',
      name: 'Public Amenities & Parks',
      code: 'AMENITIES',
      icon: 'Trees',
      deptId: 'dept-garden',
      desc: 'Public park equipment, fallen tree branches, bus shelters',
      subcats: [
        { id: 'sub-fallen-tree', name: 'Dangerous / Fallen Tree Branch', priority: 'high', sla: 24 },
        { id: 'sub-park-play', name: 'Damaged Children Play Equipment', priority: 'medium', sla: 120 },
        { id: 'sub-busshelter', name: 'Vandalized / Broken Bus Shelter', priority: 'low', sla: 168 }
      ]
    }
  ];

  categories.forEach(c => {
    insertCat.run(c.id, c.name, c.code, c.icon, c.deptId, c.desc, 1);
    c.subcats.forEach(s => {
      insertSubcat.run(s.id, c.id, s.name, s.priority, s.sla);
    });
  });

  // 8. Realistic Complaints Data
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      id, complaint_number, citizen_id, title, description, category_id, subcategory_id,
      priority, status, department_id, assigned_user_id, constituency_id, ward_id,
      latitude, longitude, location_address, landmark, location_accuracy,
      sla_hours, sla_due_at, is_sla_breached, reopen_count, reopen_reason, resolution_remarks,
      created_at, updated_at, resolved_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedia = db.prepare(`
    INSERT INTO complaint_media (id, complaint_id, file_url, file_name, file_type, mime_type, file_size, file_category, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO complaint_history (id, complaint_id, old_status, new_status, remarks, changed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT INTO complaint_comments (id, complaint_id, user_id, message, is_internal, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertFeedback = db.prepare(`
    INSERT INTO complaint_feedback (id, complaint_id, citizen_id, rating, satisfaction, feedback_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, complaint_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity, entity_id, old_value, new_value, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const getPastIso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600 * 1000).toISOString();
  const getFutureIso = (hoursAhead: number) => new Date(now.getTime() + hoursAhead * 3600 * 1000).toISOString();

  // Complaint 1: Pothole in Progress (Assigned to Vikrant Deshmukh)
  const c1Id = 'comp-01';
  insertComplaint.run(
    c1Id,
    'JS-2026-000101',
    'user-citizen-01',
    'Deep dangerous pothole cluster near Goodluck Chowk',
    'Multiple large potholes have formed right after the monsoon showers outside Café Goodluck. Vehicles and two-wheelers are skidding constantly during peak hours.',
    'cat-roads',
    'sub-pothole',
    'high',
    'in_progress',
    'dept-pwd',
    'user-officer-01',
    'const-shivajinagar',
    'ward-01',
    18.5173,
    73.8415,
    'FC Road, opposite Café Goodluck, Deccan Gymkhana',
    'Near Goodluck Chowk bus stop',
    4.5,
    48,
    getFutureIso(18), // Still within SLA
    0,
    0,
    null,
    null,
    getPastIso(30),
    getPastIso(2),
    null,
    null
  );

  insertMedia.run(
    'media-01',
    c1Id,
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    'pothole_fc_road_01.jpg',
    'image',
    'image/jpeg',
    245000,
    'evidence',
    'user-citizen-01',
    getPastIso(30)
  );

  insertHistory.run(uuidv4(), c1Id, 'none', 'submitted', 'Complaint filed by citizen Ramesh Sharma via mobile GPS', 'user-citizen-01', getPastIso(30));
  insertHistory.run(uuidv4(), c1Id, 'submitted', 'verified', 'Verified by MLA Constituency Office desk', 'user-staff-01', getPastIso(25));
  insertHistory.run(uuidv4(), c1Id, 'verified', 'assigned', 'Assigned to PWD Executive Engineer Er. Vikrant Deshmukh', 'user-mla-01', getPastIso(20));
  insertHistory.run(uuidv4(), c1Id, 'assigned', 'in_progress', 'Road patch work crew dispatched with cold-mix asphalt', 'user-officer-01', getPastIso(4));

  insertComment.run(uuidv4(), c1Id, 'user-staff-01', 'Inspection team visited the location. Urgent road asphalt resurfacing sanctioned.', 0, getPastIso(12));
  insertComment.run(uuidv4(), c1Id, 'user-officer-01', 'Patching work commenced today at 2 PM. Completion scheduled by evening.', 0, getPastIso(3));
  insertComment.run(uuidv4(), c1Id, 'user-citizen-01', 'Thank you! Road crew is already working at the spot.', 0, getPastIso(1));

  // Complaint 2: Main Pipeline Burst (Critical, Assigned to Water)
  const c2Id = 'comp-02';
  insertComplaint.run(
    c2Id,
    'JS-2026-000102',
    'user-citizen-02',
    'Heavy drinking water pipeline burst flooding street',
    '10-inch main pipeline has ruptured near Deep Bungalow chowk. Thousands of liters of fresh clean water are getting wasted and inundating local shops.',
    'cat-water',
    'sub-leak',
    'critical',
    'assigned',
    'dept-water',
    'user-officer-02',
    'const-shivajinagar',
    'ward-03',
    18.5368,
    73.8375,
    'Deep Bungalow Chowk, Model Colony road',
    'Opposite HDFC Bank branch',
    3.2,
    24,
    getFutureIso(14),
    0,
    0,
    null,
    null,
    getPastIso(10),
    getPastIso(5),
    null,
    null
  );

  insertMedia.run(
    'media-02',
    c2Id,
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800',
    'pipe_burst_deep_bungalow.jpg',
    'image',
    'image/jpeg',
    320000,
    'evidence',
    'user-citizen-02',
    getPastIso(10)
  );

  insertHistory.run(uuidv4(), c2Id, 'none', 'submitted', 'Grievance registered with high urgency geo-tag', 'user-citizen-02', getPastIso(10));
  insertHistory.run(uuidv4(), c2Id, 'submitted', 'assigned', 'Directly escalated to Water Supply Board on Critical priority', 'user-mla-01', getPastIso(6));

  // Complaint 3: Streetlights Fixed & Resolved with 5-Star Feedback
  const c3Id = 'comp-03';
  insertComplaint.run(
    c3Id,
    'JS-2026-000103',
    'user-citizen-01',
    'Dark stretch on Senapati Bapat Road - 5 LED streetlights dead',
    'Entire 300m stretch from Symbiosis gate to ICC Towers is completely in darkness for 3 nights. Very unsafe for women and students walking in the evening.',
    'cat-electricity',
    'sub-streetlights',
    'high',
    'resolved',
    'dept-power',
    'user-officer-01',
    'const-shivajinagar',
    'ward-01',
    18.5284,
    73.8315,
    'Senapati Bapat Road, near ICC Trade Tower',
    'Outside Symbiosis Institute campus',
    5.0,
    48,
    getPastIso(20),
    0,
    0,
    null,
    'Replaced 5 LED fixtures and repaired faulty phase circuit breaker at junction box.',
    getPastIso(65),
    getPastIso(8),
    getPastIso(8),
    null
  );

  // Evidence and Resolution Photos
  insertMedia.run(
    'media-03-before',
    c3Id,
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
    'dark_street_before.jpg',
    'image',
    'image/jpeg',
    180000,
    'evidence',
    'user-citizen-01',
    getPastIso(65)
  );

  insertMedia.run(
    'media-03-after',
    c3Id,
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800',
    'bright_streetlights_resolution.jpg',
    'image',
    'image/jpeg',
    210000,
    'resolution',
    'user-officer-01',
    getPastIso(8)
  );

  insertHistory.run(uuidv4(), c3Id, 'none', 'submitted', 'Grievance submitted', 'user-citizen-01', getPastIso(65));
  insertHistory.run(uuidv4(), c3Id, 'submitted', 'verified', 'Verified with local field ward staff', 'user-staff-01', getPastIso(60));
  insertHistory.run(uuidv4(), c3Id, 'verified', 'assigned', 'Assigned to MSEDCL division', 'user-mla-01', getPastIso(50));
  insertHistory.run(uuidv4(), c3Id, 'assigned', 'in_progress', 'Technician team dispatched with bucket truck', 'user-officer-01', getPastIso(24));
  insertHistory.run(uuidv4(), c3Id, 'in_progress', 'resolved', 'Streetlights fully restored and illuminated', 'user-officer-01', getPastIso(8));

  // Citizen 5-Star Feedback
  insertFeedback.run(
    'fb-03',
    c3Id,
    'user-citizen-01',
    5,
    'Very Satisfied',
    'Prompt action by MLA office and electricity department! All lights are brightly functioning now. Great initiative.',
    getPastIso(4)
  );

  // Complaint 4: Overflowing Garbage Dumpster (Verified)
  const c4Id = 'comp-04';
  insertComplaint.run(
    c4Id,
    'JS-2026-000104',
    'user-citizen-02',
    'Overflowing community garbage container spreading on road',
    'The large blue municipal garbage container has not been cleared for 4 days. Waste is spilling across the road causing foul stench and attracting stray dogs.',
    'cat-sanitation',
    'sub-overflow',
    'high',
    'verified',
    'dept-sanitation',
    null,
    'const-shivajinagar',
    'ward-02',
    18.5302,
    73.8521,
    'Shivajinagar Gaothan, near Sangam Bridge',
    'Adjacent to Zilla Parishad ground',
    6.0,
    24,
    getFutureIso(16),
    0,
    0,
    null,
    null,
    getPastIso(8),
    getPastIso(1),
    null,
    null
  );

  insertMedia.run(
    'media-04',
    c4Id,
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
    'garbage_spill_gaothan.jpg',
    'image',
    'image/jpeg',
    310000,
    'evidence',
    'user-citizen-02',
    getPastIso(8)
  );

  insertHistory.run(uuidv4(), c4Id, 'none', 'submitted', 'Grievance filed', 'user-citizen-02', getPastIso(8));
  insertHistory.run(uuidv4(), c4Id, 'submitted', 'verified', 'Sanitation inspector verified site overflow', 'user-staff-01', getPastIso(1));

  // Complaint 5: Sewage Overflow Hazard (Submitted, New)
  const c5Id = 'comp-05';
  insertComplaint.run(
    c5Id,
    'JS-2026-000105',
    'user-citizen-01',
    'Sewage line choked and overflowing onto market lane',
    'Underground drainage chamber has collapsed near Gokhale Nagar main vegetable market. Black foul sewage water is running into shops and pathway.',
    'cat-drainage',
    'sub-sewer-choke',
    'critical',
    'submitted',
    'dept-water',
    null,
    'const-shivajinagar',
    'ward-04',
    18.5392,
    73.8291,
    'Gokhale Nagar Market Lane, near Datta Mandir',
    'Opposite Datta Temple entrance',
    3.0,
    24,
    getFutureIso(22),
    0,
    0,
    null,
    null,
    getPastIso(2),
    getPastIso(2),
    null,
    null
  );

  insertMedia.run(
    'media-05',
    c5Id,
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800',
    'sewage_overflow_gokhale.jpg',
    'image',
    'image/jpeg',
    290000,
    'evidence',
    'user-citizen-01',
    getPastIso(2)
  );

  insertHistory.run(uuidv4(), c5Id, 'none', 'submitted', 'Grievance submitted by citizen Ramesh Sharma', 'user-citizen-01', getPastIso(2));

  // Complaint 6: Reopened Case
  const c6Id = 'comp-06';
  insertComplaint.run(
    c6Id,
    'JS-2026-000106',
    'user-citizen-02',
    'Low-hanging electric wire across Wakdewadi foot-over-bridge',
    'Live high-tension wire dropped to barely 7 feet height. Previously workers just wrapped plastic tape instead of restringing it safely.',
    'cat-electricity',
    'sub-wire',
    'critical',
    'reopened',
    'dept-power',
    'user-officer-01',
    'const-shivajinagar',
    'ward-05',
    18.5441,
    73.8540,
    'Old Mumbai-Pune Highway, Wakdewadi bus stand',
    'Foot Over Bridge crossing',
    4.1,
    24,
    getFutureIso(12),
    0,
    1,
    'The wire was only tied with an adhesive rope and came loose again when a bus passed by. Needs complete tensioner replacement.',
    null,
    getPastIso(48),
    getPastIso(3),
    null,
    null
  );

  insertHistory.run(uuidv4(), c6Id, 'none', 'submitted', 'Submitted initially', 'user-citizen-02', getPastIso(48));
  insertHistory.run(uuidv4(), c6Id, 'in_progress', 'resolved', 'Marked resolved by field lineman', 'user-officer-01', getPastIso(12));
  insertHistory.run(uuidv4(), c6Id, 'resolved', 'reopened', 'Citizen contested resolution: Wire was only tied with plastic string', 'user-citizen-02', getPastIso(3));

  // Notifications
  insertNotification.run(uuidv4(), 'user-citizen-01', 'Complaint In Progress', 'Your grievance JS-2026-000101 (Potholes near Goodluck Chowk) is currently in progress.', 'status_update', c1Id, 0, getPastIso(4));
  insertNotification.run(uuidv4(), 'user-citizen-01', 'Grievance Resolved!', 'Grievance JS-2026-000103 regarding Streetlights has been resolved. Please share your rating.', 'feedback_request', c3Id, 1, getPastIso(8));
  insertNotification.run(uuidv4(), 'user-mla-01', 'Critical Grievance Alert', 'New Critical issue reported: Main Water Pipeline Burst at Deep Bungalow Chowk (JS-2026-000102).', 'status_update', c2Id, 0, getPastIso(9));
  insertNotification.run(uuidv4(), 'user-officer-01', 'New Task Assigned', 'You have been assigned complaint JS-2026-000101 by the MLA Office.', 'assignment', c1Id, 1, getPastIso(20));

  // Initial Audit Logs
  insertAudit.run(uuidv4(), 'user-admin-01', 'SYSTEM_INITIALIZED', 'system', 'sys-01', null, JSON.stringify({ version: '1.0.0', db: 'SQLite-Spatial' }), '127.0.0.1', getPastIso(72));
  insertAudit.run(uuidv4(), 'user-mla-01', 'ASSIGNMENT_CREATED', 'complaint', c1Id, JSON.stringify({ status: 'verified' }), JSON.stringify({ status: 'assigned', assigned_to: 'Er. Vikrant Deshmukh' }), '127.0.0.1', getPastIso(20));
  insertAudit.run(uuidv4(), 'user-officer-01', 'STATUS_CHANGE', 'complaint', c3Id, JSON.stringify({ status: 'in_progress' }), JSON.stringify({ status: 'resolved' }), '127.0.0.1', getPastIso(8));

  console.log('Seed data successfully populated!');
}

// Execute seed if run directly
runSeed();
