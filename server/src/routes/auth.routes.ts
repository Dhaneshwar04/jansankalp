import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { config } from '../config/index.js';
import { authenticate } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

// 1. Citizen Registration
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password, address, state, district, constituency_id, ward_id } = req.body;

    if (!name || !email || !mobile || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, mobile number, and password are required',
        errorCode: 'VALIDATION_FAILED'
      });
      return;
    }

    // Check duplicate email or mobile
    const existing = db.prepare('SELECT id, email, mobile FROM users WHERE email = ? OR mobile = ?').get(email, mobile) as { email: string; mobile: string } | undefined;
    if (existing) {
      res.status(409).json({
        success: false,
        message: existing.email === email ? 'Email already registered' : 'Mobile number already registered',
        errorCode: 'USER_ALREADY_EXISTS'
      });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const constId = constituency_id || 'const-shivajinagar';

    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role, constituency_id, ward_id, designation, address, state, district, status)
      VALUES (?, ?, ?, ?, ?, 'citizen', ?, ?, 'Citizen Resident', ?, ?, ?, 'active')
    `).run(
      id,
      name,
      email,
      mobile,
      passwordHash,
      constId,
      ward_id || 'ward-01',
      address || 'Constituency Resident Address',
      state || 'Maharashtra',
      district || 'Pune'
    );

    recordAuditLog({
      userId: id,
      action: 'USER_REGISTERED',
      entity: 'user',
      entityId: id,
      newValue: { name, email, mobile, role: 'citizen' },
      ipAddress: req.ip
    });

    const token = jwt.sign({ id, role: 'citizen' }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.mobile, u.role, u.constituency_id, u.ward_id, u.designation,
             u.address, u.state, u.district, u.avatar_url, c.name as constituency_name
      FROM users u
      LEFT JOIN constituencies c ON u.constituency_id = c.id
      WHERE u.id = ?
    `).get(id);

    res.status(201).json({
      success: true,
      message: 'Citizen registration successful',
      token,
      user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'REGISTRATION_ERROR' });
  }
});

// 2. Login (Email or Mobile + Password)
router.post('/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        message: 'Identifier (email or mobile) and password are required',
        errorCode: 'VALIDATION_FAILED'
      });
      return;
    }

    const user = db.prepare(`
      SELECT u.*, c.name as constituency_name, d.name as department_name
      FROM users u
      LEFT JOIN constituencies c ON u.constituency_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = ? OR u.mobile = ?
    `).get(identifier, identifier) as any;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No account found with this email or mobile number',
        errorCode: 'INVALID_CREDENTIALS'
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is suspended. Please contact administrator.',
        errorCode: 'ACCOUNT_SUSPENDED'
      });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Incorrect password',
        errorCode: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });

    // Exclude password hash from response
    delete user.password_hash;

    recordAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'auth',
      entityId: user.id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'LOGIN_ERROR' });
  }
});

// 3. Send / Verify OTP (Fast Citizen Access)
router.post('/send-otp', (req: Request, res: Response) => {
  const { mobile } = req.body;
  if (!mobile) {
    res.status(400).json({ success: false, message: 'Mobile number is required', errorCode: 'VALIDATION_FAILED' });
    return;
  }

  // Simulated OTP for immediate testing and verification
  res.json({
    success: true,
    message: 'OTP sent to mobile number',
    otp: '123456',
    expiresInSeconds: 300
  });
});

router.post('/verify-otp', (req: Request, res: Response) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    res.status(400).json({ success: false, message: 'Mobile number and OTP are required', errorCode: 'VALIDATION_FAILED' });
    return;
  }

  if (otp !== '123456') {
    res.status(400).json({ success: false, message: 'Invalid OTP code. Please enter 123456', errorCode: 'INVALID_OTP' });
    return;
  }

  let user = db.prepare(`
    SELECT u.*, c.name as constituency_name, d.name as department_name
    FROM users u
    LEFT JOIN constituencies c ON u.constituency_id = c.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.mobile = ?
  `).get(mobile) as any;

  if (!user) {
    // Auto-create citizen profile if new mobile
    const id = uuidv4();
    const tempHash = bcrypt.hashSync('password123', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role, constituency_id, ward_id, designation, status)
      VALUES (?, ?, ?, ?, ?, 'citizen', 'const-shivajinagar', 'ward-01', 'Citizen Resident', 'active')
    `).run(id, `Citizen (${mobile.slice(-4)})`, `citizen_${mobile}@jansankalp.local`, mobile, tempHash);

    user = db.prepare(`
      SELECT u.*, c.name as constituency_name
      FROM users u
      LEFT JOIN constituencies c ON u.constituency_id = c.id
      WHERE u.id = ?
    `).get(id) as any;
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as any });
  delete user.password_hash;

  res.json({
    success: true,
    message: 'OTP verified successfully',
    token,
    user
  });
});

// 4. Get Current User Profile + Notifications Count
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.mobile, u.role, u.constituency_id, u.department_id, u.ward_id,
             u.designation, u.address, u.state, u.district, u.avatar_url, u.status, u.created_at,
             c.name as constituency_name, c.code as constituency_code,
             d.name as department_name, d.code as department_code,
             w.name as ward_name, w.ward_number
      FROM users u
      LEFT JOIN constituencies c ON u.constituency_id = c.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN wards w ON u.ward_id = w.id
      WHERE u.id = ?
    `).get(req.user!.id) as any;

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
      return;
    }

    const unreadRow = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(req.user!.id) as { count: number };

    res.json({
      success: true,
      user,
      unreadNotifications: unreadRow?.count || 0
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'PROFILE_ERROR' });
  }
});

// 5. Update Profile
router.put('/profile', authenticate, (req: Request, res: Response) => {
  try {
    const { name, address, state, district, ward_id, avatar_url } = req.body;
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          state = COALESCE(?, state),
          district = COALESCE(?, district),
          ward_id = COALESCE(?, ward_id),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, address, state, district, ward_id, avatar_url, req.user!.id);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errorCode: 'PROFILE_UPDATE_ERROR' });
  }
});

// 6. Demo Persona Credentials (For one-click role testing)
router.get('/demo-users', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.mobile, u.role, u.designation, u.avatar_url,
           c.name as constituency_name, d.name as department_name
    FROM users u
    LEFT JOIN constituencies c ON u.constituency_id = c.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.email IN (
      'citizen@jansankalp.gov.in',
      'mla@jansankalp.gov.in',
      'staff@jansankalp.gov.in',
      'officer@jansankalp.gov.in',
      'admin@jansankalp.gov.in'
    )
    ORDER BY CASE u.role
      WHEN 'citizen' THEN 1
      WHEN 'mla' THEN 2
      WHEN 'staff' THEN 3
      WHEN 'officer' THEN 4
      WHEN 'superadmin' THEN 5
      ELSE 6 END
  `).all() as any[];

  const passwordMap: Record<string, string> = {
    'citizen@jansankalp.gov.in': 'Jansankalp@1',
    'mla@jansankalp.gov.in': 'Jansankalp@2',
    'staff@jansankalp.gov.in': 'Jansankalp@3',
    'officer@jansankalp.gov.in': 'Jansankalp@4',
    'admin@jansankalp.gov.in': 'Jansankalp@5',
  };

  const usersWithPasswords = users.map(u => ({
    ...u,
    password: passwordMap[u.email] || 'Jansankalp@1',
  }));

  res.json({
    success: true,
    demoUsers: usersWithPasswords,
    passwordMap,
  });
});

export default router;
