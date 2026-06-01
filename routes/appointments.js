const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db/database');
const { isAuthenticated, isAdmin, isDoctor } = require('../middleware/auth');

// Get all appointments (admin) or own appointments
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let appointments;

    if (user.role === 'admin') {
      appointments = await dbAll(`
        SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
               d.name as doctor_name, d.specialization, dept.name as department
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
      `);
    } else if (user.role === 'doctor') {
      appointments = await dbAll(`
        SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
               d.name as doctor_name, d.specialization, dept.name as department
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        WHERE a.doctor_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
      `, [user.doctorId]);
    } else {
      appointments = await dbAll(`
        SELECT a.*, u.name as patient_name,
               d.name as doctor_name, d.specialization, d.consultation_fee,
               dept.name as department
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
      `, [user.id]);
    }

    res.render('appointments/list', {
      title: 'Appointments',
      appointments,
      user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load appointments');
    res.redirect('/dashboard');
  }
});

// Book appointment form
router.get('/book', isAuthenticated, async (req, res) => {
  try {
    const departments = await dbAll('SELECT * FROM departments ORDER BY name');
    const doctorId = req.query.doctor;
    let selectedDoctor = null;
    if (doctorId) {
      selectedDoctor = await dbGet(`
        SELECT d.*, dept.name as department_name 
        FROM doctors d JOIN departments dept ON d.department_id = dept.id 
        WHERE d.id = ?`, [doctorId]);
    }
    res.render('appointments/book', {
      title: 'Book Appointment',
      departments,
      selectedDoctor,
      user: req.session.user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load booking form');
    res.redirect('/dashboard');
  }
});

// POST Book appointment
router.post('/book', isAuthenticated, async (req, res) => {
  try {
    const { doctor_id, appointment_date, appointment_time, reason } = req.body;
    const patient_id = req.session.user.id;

    if (!doctor_id || !appointment_date || !appointment_time) {
      req.flash('error', 'Please fill all required fields');
      return res.redirect('/appointments/book');
    }

    // Check if slot already booked
    const existing = await dbGet(
      'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != ?',
      [doctor_id, appointment_date, appointment_time, 'cancelled']
    );

    if (existing) {
      req.flash('error', 'This time slot is already booked. Please choose another.');
      return res.redirect('/appointments/book?doctor=' + doctor_id);
    }

    await dbRun(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status) VALUES (?, ?, ?, ?, ?, ?)',
      [patient_id, doctor_id, appointment_date, appointment_time, reason || null, 'pending']
    );

    req.flash('success', 'Appointment booked successfully!');
    res.redirect('/appointments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to book appointment');
    res.redirect('/appointments/book');
  }
});

// View single appointment
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointment = await dbGet(`
      SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone,
             u.gender, u.date_of_birth,
             d.name as doctor_name, d.specialization, d.qualification, d.consultation_fee,
             dept.name as department
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN departments dept ON d.department_id = dept.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (!appointment) {
      req.flash('error', 'Appointment not found');
      return res.redirect('/appointments');
    }

    res.render('appointments/detail', {
      title: 'Appointment Details',
      appointment,
      user: req.session.user,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    res.redirect('/appointments');
  }
});

// Update appointment status (doctor/admin)
router.post('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { status, notes, prescription } = req.body;
    const user = req.session.user;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      req.flash('error', 'Invalid status');
      return res.redirect('/appointments/' + req.params.id);
    }

    // Patients can only cancel their own
    if (user.role === 'patient') {
      if (status !== 'cancelled') {
        req.flash('error', 'Patients can only cancel appointments');
        return res.redirect('/appointments/' + req.params.id);
      }
      await dbRun(
        'UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND patient_id = ?',
        [status, req.params.id, user.id]
      );
    } else {
      await dbRun(
        'UPDATE appointments SET status = ?, notes = ?, prescription = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, notes || null, prescription || null, req.params.id]
      );
    }

    req.flash('success', 'Appointment updated successfully');
    res.redirect('/appointments/' + req.params.id);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Update failed');
    res.redirect('/appointments');
  }
});

module.exports = router;
