function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Please login to continue');
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/dashboard');
}

function isDoctor(req, res, next) {
  if (req.session && req.session.user && (req.session.user.role === 'doctor' || req.session.user.role === 'admin')) {
    return next();
  }
  req.flash('error', 'Access denied. Doctors only.');
  res.redirect('/dashboard');
}

function isPatient(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'patient') {
    return next();
  }
  req.flash('error', 'Access denied. Patients only.');
  res.redirect('/dashboard');
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { isAuthenticated, isAdmin, isDoctor, isPatient, redirectIfAuthenticated };
