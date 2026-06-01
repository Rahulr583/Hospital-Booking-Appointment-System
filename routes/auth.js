const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../db/database');
const { redirectIfAuthenticated } = require('../middleware/auth');

// GET Login
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'Email and password are required');
      return res.redirect('/auth/login');
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    // If doctor, get doctor id
    if (user.role === 'doctor') {
      const doctor = await dbGet('SELECT id FROM doctors WHERE user_id = ?', [user.id]);
      if (doctor) req.session.user.doctorId = doctor.id;
    }

    req.flash('success', `Welcome back, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server error. Please try again.');
    res.redirect('/auth/login');
  }
});

// GET Register
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirm_password, phone, date_of_birth, gender } = req.body;

    if (!name || !email || !password) {
      req.flash('error', 'Name, email and password are required');
      return res.redirect('/auth/register');
    }

    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/register');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/auth/register');
    }

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun(
      'INSERT INTO users (name, email, password, phone, date_of_birth, gender, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, date_of_birth || null, gender || null, 'patient']
    );

    req.flash('success', 'Registration successful! Please login.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
