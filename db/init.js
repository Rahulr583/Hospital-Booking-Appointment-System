const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'hospital.db');
console.log('INIT.JS PATH:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }

  console.log('Connected to SQLite database.');
});

db.serialize(() => {

  // ENABLE FOREIGN KEYS
  db.run('PRAGMA foreign_keys = ON');

 
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      date_of_birth TEXT,
      gender TEXT,
      address TEXT,
      role TEXT DEFAULT 'patient',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // DEPARTMENTS TABLE
  // =========================
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🏥'
    )
  `);

  // =========================
  // DOCTORS TABLE
  // =========================
  db.run(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      department_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      specialization TEXT,
      qualification TEXT,
      experience_years INTEGER DEFAULT 0,
      consultation_fee REAL DEFAULT 500,
      available_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
      available_time_start TEXT DEFAULT '09:00',
      available_time_end TEXT DEFAULT '17:00',
      bio TEXT,
      rating REAL DEFAULT 4.5,
      image_url TEXT,

      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // =========================
  // APPOINTMENTS TABLE
  // =========================
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      notes TEXT,
      prescription TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // =========================
  // TIME SLOTS TABLE
  // =========================
  db.run(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      is_booked INTEGER DEFAULT 0,

      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // =========================
  // INSERT DEPARTMENTS
  // =========================
  const departments = [
    ['Cardiology', 'Heart specialists', '❤️'],
    ['Neurology', 'Brain specialists', '🧠'],
    ['Orthopedics', 'Bone specialists', '🦴'],
    ['Pediatrics', 'Child specialists', '👶'],
    ['Dermatology', 'Skin specialists', '🌿'],
    ['General Medicine', 'General healthcare', '🩺']
  ];

  const deptStmt = db.prepare(`
    INSERT OR IGNORE INTO departments
    (name, description, icon)
    VALUES (?, ?, ?)
  `);

  departments.forEach((dept) => {
    deptStmt.run(dept);
  });

  deptStmt.finalize();

  // =========================
  // INSERT ADMIN
  // =========================
  const adminPassword = bcrypt.hashSync('admin123', 10);

  db.run(`
    INSERT OR IGNORE INTO users
    (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `,
  [
    'Admin User',
    'admin@hospital.com',
    adminPassword,
    'admin'
  ]);

  // =========================
  // INSERT PATIENT
  // =========================
  const patientPassword = bcrypt.hashSync('patient123', 10);

  db.run(`
    INSERT OR IGNORE INTO users
    (name, email, password, phone, gender, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  [
    'John Patient',
    'patient@hospital.com',
    patientPassword,
    '9876543211',
    'Male',
    'patient'
  ]);

  // =========================
  // SAMPLE DOCTORS
  // =========================
  const doctorPassword = bcrypt.hashSync('doctor123', 10);

  const sampleDoctors = [
    {
      name: 'Dr. Priya Sharma',
      email: 'priya@hospital.com',
      dept: 1,
      spec: 'Cardiologist',
      qual: 'MBBS, MD (Cardiology)',
      exp: 12,
      fee: 800,
      days: 'Mon,Tue,Wed,Thu,Fri',
      bio: 'Expert cardiologist.'
    },
    {
      name: 'Dr. Rahul Mehta',
      email: 'rahul@hospital.com',
      dept: 2,
      spec: 'Neurologist',
      qual: 'MBBS, DM (Neurology)',
      exp: 9,
      fee: 900,
      days: 'Mon,Wed,Fri',
      bio: 'Neurology specialist.'
    },
    {
      name: 'Dr. Anita Singh',
      email: 'anita@hospital.com',
      dept: 3,
      spec: 'Orthopedic Surgeon',
      qual: 'MBBS, MS (Ortho)',
      exp: 15,
      fee: 700,
      days: 'Tue,Thu,Sat',
      bio: 'Orthopedic expert.'
    }
  ];

  sampleDoctors.forEach((doc) => {

    // INSERT USER
    db.run(`
      INSERT OR IGNORE INTO users
      (name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      doc.name,
      doc.email,
      doctorPassword,
      '9876543210',
      'doctor'
    ],
    function(err) {

      if (err) {
        console.error('User insert error:', err.message);
        return;
      }

      // FETCH USER ID
      db.get(
        `SELECT id FROM users WHERE email = ?`,
        [doc.email],
        (err, row) => {

          if (err) {
            console.error('User fetch error:', err.message);
            return;
          }

          if (!row) {
            console.error('Doctor user not found');
            return;
          }

          const userId = row.id;

          // INSERT DOCTOR
          db.run(`
            INSERT OR IGNORE INTO doctors
            (
              user_id,
              department_id,
              name,
              specialization,
              qualification,
              experience_years,
              consultation_fee,
              available_days,
              bio,
              rating
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            userId,
            doc.dept,
            doc.name,
            doc.spec,
            doc.qual,
            doc.exp,
            doc.fee,
            doc.days,
            doc.bio,
            4.5
          ],
          (err) => {

            if (err) {
              console.error('Doctor insert error:', err.message);
            }

          });

        }
      );

    });

  });

  console.log('\nDatabase initialized successfully!');
  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Admin:   admin@hospital.com   / admin123');
  console.log('Doctor:  priya@hospital.com   / doctor123');
  console.log('Patient: patient@hospital.com / patient123');
  console.log('===============================\n');

});

module.exports = db;