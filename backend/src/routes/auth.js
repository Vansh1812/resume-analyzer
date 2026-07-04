const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();

// Password validation function
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8)
    errors.push('Password must be at least 8 characters');
  if (password.length > 64)
    errors.push('Password must be less than 64 characters');
  if (!/[A-Z]/.test(password))
    errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password))
    errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password))
    errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)');

  return errors;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email format' });

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0)
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordErrors
      });

    // Check if email already registered
    const existing = await db('users').where({ email }).first();
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);

    const [user] = await db('users')
      .insert({ email, password_hash })
      .returning(['id', 'email', 'created_at']);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ user, token });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await db('users').where({ email }).first();
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      user: { id: user.id, email: user.email },
      token
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await db('users').where({ email }).first();

    // Always return success even if email not found (security best practice)
    // In production you would send an email here via AWS SES
    if (user) {
      // Generate a reset token (in production store this in DB with expiry)
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      console.log('Password reset requested for:', email, 'Token:', resetToken);
      // TODO Day 6: Store token in DB and send email via AWS SES
    }

    res.json({
      message: 'If that email exists, a reset link has been sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
