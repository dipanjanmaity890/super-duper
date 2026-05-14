const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { query } = require('../config/db');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash   = await bcrypt.hash(password, 12);
    const avatarInitials = username.slice(0, 2).toUpperCase();
    const colors = ['teal', 'coral', 'blue', 'purple', 'amber', 'green'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const { rows: [user] } = await query(
      `INSERT INTO users (username, email, password_hash, avatar_initials, avatar_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, avatar_initials, avatar_color, total_points`,
      [username, email, passwordHash, avatarInitials, avatarColor]
    );

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user  = rows[0];
    const token = signToken(user);

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ─── Firebase / Google Sign-In ────────────────────────────────────────────────
const firebaseAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });

    // Verify the Google ID token with Firebase Admin
    const { getAdmin } = require('../config/firebaseAdmin');
    const admin = getAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin not initialized' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) return res.status(400).json({ error: 'No email in token' });

    // Derive username from display name or email prefix
    const rawUsername = (name || email.split('@')[0])
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 25) || 'fan';

    const colors = ['teal', 'coral', 'blue', 'purple', 'amber'];

    // Upsert: find or create user by firebase_uid (stored in metadata JSON)
    const { rows: existing } = await query(
      `SELECT id, username, email, avatar_initials, avatar_color,
              total_points, streak_count, is_admin
       FROM users WHERE email = $1`,
      [email]
    );

    let user;
    if (existing.length) {
      user = existing[0];
    } else {
      // Create new user for Google sign-in (no password)
      const avatarInitials = rawUsername.slice(0, 2).toUpperCase();
      const avatarColor    = colors[Math.floor(Math.random() * colors.length)];
      const { rows: [created] } = await query(
        `INSERT INTO users
           (username, email, password_hash, avatar_initials, avatar_color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, avatar_initials, avatar_color, total_points, streak_count, is_admin`,
        [rawUsername, email, `firebase:${uid}`, avatarInitials, avatarColor]
      );
      user = created;
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    if (err.code?.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }
    next(err);
  }
};

module.exports = { register, login, getMe, firebaseAuth };
