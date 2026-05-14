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

module.exports = { register, login, getMe };
