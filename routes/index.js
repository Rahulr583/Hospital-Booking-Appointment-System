const express = require('express');
const router = express.Router();
const { dbGet, dbAll } = require('../db/database');
const { isAuthenticated } = require('../middleware/auth');

// Home page
router.get('/', async (req, res) => {
  try {
    const departments = await dbAll('SELECT * FROM departments LIMIT 8');
    const doctors = await dbAll(`
      SELECT d.*, dept.name as department_name, dept.icon as dept_icon
      FROM doctors d JOIN departments dept ON d.department_id = dept.id
      ORDER BY d.rating DESC LIMIT 6
    `);
    res.render('home', {
      title: 'MediCare Hospital - Your Health, Our Priority',
      departments,
      doctors,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.render('home', { title: 'MediCare Hospital', departments: [], doctors: [], user: req.session.user });
  }
});

// Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let data = {};

    if (user.role === 'admin') {
      data.totalPatients = (await dbGet("SELECT COUNT(*) as c FROM users WHERE role='patient'")).c;
      data.totalDoctors = (await dbGet("SELECT COUNT(*) as c FROM doctors")).c;
      data.totalAppointments = (await dbGet("SELECT COUNT(*) as c FROM appointments")).c;
      data.pendingAppointments = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE status='pending'")).c;
      data.recentAppointments = await dbAll(`
        SELECT a.*, u.name as patient_name, d.name as doctor_name, dept.name as department
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        ORDER BY a.created_at DESC LIMIT 5
      `);
      data.departments = await dbAll('SELECT d.name, COUNT(doc.id) as doc_count FROM departments d LEFT JOIN doctors doc ON d.id = doc.department_id GROUP BY d.id');

    } else if (user.role === 'doctor') {
      const doctorId = user.doctorId;
      data.todayAppointments = await dbAll(`
        SELECT a.*, u.name as patient_name, u.phone as patient_phone
        FROM appointments a JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ? AND a.appointment_date = date('now') AND a.status != 'cancelled'
        ORDER BY a.appointment_time
      `, [doctorId]);
      data.totalAppointments = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ?", [doctorId])).c;
      data.pendingAppointments = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND status='pending'", [doctorId])).c;
      data.completedAppointments = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE doctor_id = ? AND status='completed'", [doctorId])).c;
      data.upcomingAppointments = await dbAll(`
        SELECT a.*, u.name as patient_name, u.phone as patient_phone
        FROM appointments a JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = ? AND a.appointment_date >= date('now') AND a.status IN ('pending','confirmed')
        ORDER BY a.appointment_date, a.appointment_time LIMIT 5
      `, [doctorId]);
      data.doctorProfile = await dbGet('SELECT * FROM doctors WHERE id = ?', [doctorId]);

    } else {
      // Patient
      data.myAppointments = await dbAll(`
        SELECT a.*, d.name as doctor_name, d.specialization, dept.name as department
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC LIMIT 5
      `, [user.id]);
      data.upcomingCount = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND appointment_date >= date('now') AND status IN ('pending','confirmed')", [user.id])).c;
      data.completedCount = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ? AND status='completed'", [user.id])).c;
      data.totalCount = (await dbGet("SELECT COUNT(*) as c FROM appointments WHERE patient_id = ?", [user.id])).c;
    }

    res.render('dashboard', {
      title: 'Dashboard',
      user,
      data,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard', { title: 'Dashboard', user: req.session.user, data: {}, error: [], success: [] });
  }
});

// Profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    res.render('profile', {
      title: 'My Profile',
      user: req.session.user,
      profile: user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    res.redirect('/dashboard');
  }
});

// Update profile
router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { name, phone, date_of_birth, gender, address } = req.body;
    const { dbRun } = require('../db/database');
    await dbRun(
      'UPDATE users SET name = ?, phone = ?, date_of_birth = ?, gender = ?, address = ? WHERE id = ?',
      [name, phone, date_of_birth, gender, address, req.session.user.id]
    );
    req.session.user.name = name;
    req.session.user.phone = phone;
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/profile');
  } catch (err) {
    req.flash('error', 'Profile update failed');
    res.redirect('/profile');
  }
});

module.exports = router;
