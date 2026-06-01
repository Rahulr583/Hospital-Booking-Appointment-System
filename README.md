# 🏥 MediCare Hospital Appointment Booking System

A full-stack hospital appointment booking system built with **Node.js**, **Express**, **EJS**, and **SQLite**.

---

## 📁 Project Structure

```
hospital-booking/
├── server.js              # Main entry point
├── package.json
├── .env                   # Environment config
├── db/
│   ├── init.js            # Database schema + seed data
│   └── database.js        # DB connection & helpers
├── routes/
│   ├── index.js           # Home, dashboard, profile
│   ├── auth.js            # Login, register, logout
│   ├── doctors.js         # Doctor listing + profile
│   ├── appointments.js    # Booking, listing, detail
│   └── api.js             # JSON API endpoints
├── middleware/
│   └── auth.js            # Session auth guards
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── home.ejs
│   ├── dashboard.ejs
│   ├── profile.ejs
│   ├── 404.ejs
│   ├── error.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── doctors/
│   │   ├── list.ejs
│   │   └── profile.ejs
│   └── appointments/
│       ├── book.ejs
│       ├── list.ejs
│       └── detail.ejs
└── public/
    ├── css/style.css
    └── js/main.js
```

---

## 🚀 Setup & Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

### 3. Open in Browser
```
http://localhost:3000
```

The database is created automatically on first run with sample data.

---

## 🔑 Demo Login Credentials

| Role    | Email                      | Password    |
|---------|---------------------------|-------------|
| Admin   | admin@hospital.com        | admin123    |
| Doctor  | priya@hospital.com        | doctor123   |
| Patient | patient@hospital.com      | patient123  |

---

## ✨ Features

### Patient
- Register & login
- Browse doctors by department or search
- Book appointments with time slot selection
- View, track, and cancel appointments
- Profile management

### Doctor
- View today's and upcoming appointments
- Update appointment status (confirm/complete/cancel)
- Add notes and prescriptions to appointments
- Dashboard with stats

### Admin
- Full dashboard with hospital-wide stats
- View all appointments across all doctors
- Manage appointment statuses

---

## 🛠 Tech Stack

| Layer       | Technology        |
|-------------|-------------------|
| Runtime     | Node.js           |
| Framework   | Express.js        |
| Templating  | EJS               |
| Database    | SQLite3           |
| Auth        | express-session + bcryptjs |
| Styling     | Custom CSS (Outfit font)   |
| Icons       | Font Awesome 6    |

---

## 🗄 Database Schema

- **users** — patients, doctors, admin
- **departments** — medical departments
- **doctors** — doctor profiles linked to users + departments
- **appointments** — bookings with status tracking
- **time_slots** — available slots per doctor per day

---

## 📝 Notes

- The `.env` file contains the session secret and port config — change `SESSION_SECRET` in production
- SQLite database file is created at `./db/hospital.db` on first run
- No external database setup required — everything runs locally out of the box
