const express = require('express');
const router = express.Router();
const { dbAll } = require('../db/database');

// GET /api/doctors — returns JSON list for frontend
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await dbAll(`
      SELECT d.id, d.name, d.specialization, d.consultation_fee,
             d.available_days, d.available_time_start, d.available_time_end,
             d.department_id, dept.name as department_name
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      ORDER BY d.name
    `);
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// GET /api/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await dbAll('SELECT * FROM departments ORDER BY name');
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
