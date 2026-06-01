const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// List all doctors
router.get('/', async (req, res) => {
  try {
    const { dept, search } = req.query;
    let query = `
      SELECT d.*, dept.name as department_name, dept.icon as dept_icon
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      WHERE 1=1
    `;
    const params = [];

    if (dept) {
      query += ' AND d.department_id = ?';
      params.push(dept);
    }
    if (search) {
      query += ' AND (d.name LIKE ? OR d.specialization LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY d.name';

    const doctors = await dbAll(query, params);
    const departments = await dbAll('SELECT * FROM departments ORDER BY name');

    res.render('doctors/list', {
      title: 'Find Doctors',
      doctors,
      departments,
      user: req.session.user,
      selectedDept: dept,
      search,
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Doctor profile
router.get('/:id', async (req, res) => {
  try {
    const doctor = await dbGet(`
      SELECT d.*, dept.name as department_name, dept.icon as dept_icon
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = ?
    `, [req.params.id]);

    if (!doctor) {
      req.flash('error', 'Doctor not found');
      return res.redirect('/doctors');
    }

    // Get recent reviews / appointment count
    const stats = await dbGet(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status="completed" THEN 1 ELSE 0 END) as completed FROM appointments WHERE doctor_id = ?',
      [doctor.id]
    );

    res.render('doctors/profile', {
      title: doctor.name,
      doctor,
      stats,
      user: req.session.user,
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/doctors');
  }
});

// Admin: Get available time slots for a doctor on a date
router.get('/:id/slots', isAuthenticated, async (req, res) => {
  try {
    const { date } = req.query;
    const doctorId = req.params.id;

    if (!date) return res.json({ slots: [] });

    const doctor = await dbGet('SELECT * FROM doctors WHERE id = ?', [doctorId]);
    if (!doctor) return res.json({ slots: [] });

    // Generate time slots from available hours
    const slots = [];
    const [startH, startM] = doctor.available_time_start.split(':').map(Number);
    const [endH, endM] = doctor.available_time_end.split(':').map(Number);

    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === startH && m < startM) continue;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }

    // Check booked slots
    const booked = await dbAll(
      'SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != ?',
      [doctorId, date, 'cancelled']
    );
    const bookedTimes = booked.map(b => b.appointment_time);

    const available = slots.map(s => ({
      time: s,
      booked: bookedTimes.includes(s)
    }));

    res.json({ slots: available });
  } catch (err) {
    console.error(err);
    res.json({ slots: [] });
  }
});

module.exports = router;
