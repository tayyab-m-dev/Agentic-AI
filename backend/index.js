const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}
app.use(cors({
  origin: [
    'https://agentic-ai-orcin-five.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try { req.auth = jwt.verify(token, jwtSecret); next(); } catch { res.status(401).json({ message: 'Session expired. Please sign in again.' }); }
};
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.auth.role)) return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  next();
};
const createAuthToken = () => crypto.randomBytes(32).toString('hex');
const hashAuthToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const issueEmailVerification = async (userId, email) => {
  const token = createAuthToken();
  await pool.query('INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))', [userId, hashAuthToken(token), 'verify_email']);
  console.log(`Verification link for ${email}: /api/auth/verify-email?token=${token}`);
};

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required.' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name.trim(), email.trim().toLowerCase(), passwordHash]);
    await issueEmailVerification(result.insertId, email.trim().toLowerCase());
    const token = jwt.sign({ id: result.insertId, role: 'student' }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: 'student' } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with that email already exists.' });
    res.status(500).json({ message: 'Unable to create account.' });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Verification token is required.' });
  try {
    const [rows] = await pool.query("SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND type = 'verify_email' AND used_at IS NULL AND expires_at > NOW()", [hashAuthToken(token)]);
    if (!rows[0]) return res.status(400).json({ message: 'This verification link is invalid or expired.' });
    await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [rows[0].user_id]);
    await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [rows[0].id]);
    res.json({ message: 'Email verified successfully.' });
  } catch { res.status(500).json({ message: 'Unable to verify email.' }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users[0]) {
      const token = createAuthToken();
      await pool.query('INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [users[0].id, hashAuthToken(token), 'reset_password']);
      console.log(`Password reset link for ${email}: /reset-password?token=${token}`);
    }
    res.json({ message: 'If an account exists for that email, reset instructions have been sent.' });
  } catch { res.status(500).json({ message: 'Unable to process password reset.' }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) return res.status(400).json({ message: 'A valid token and password of at least 8 characters are required.' });
  try {
    const [rows] = await pool.query("SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND type = 'reset_password' AND used_at IS NULL AND expires_at > NOW()", [hashAuthToken(token)]);
    if (!rows[0]) return res.status(400).json({ message: 'This reset link is invalid or expired.' });
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 12), rows[0].user_id]);
    await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [rows[0].id]);
    res.json({ message: 'Password updated successfully.' });
  } catch { res.status(500).json({ message: 'Unable to reset password.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  try {
    const [rows] = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(500).json({ message: 'Unable to sign in.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, email_verified, created_at FROM users WHERE id = ?', [req.auth.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: rows[0] });
  } catch { res.status(500).json({ message: 'Unable to load account.' }); }
});

app.get('/api/student/dashboard', requireAuth, async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT id, name, email, role, email_verified, created_at FROM users WHERE id = ?', [req.auth.id]);
    if (!userRows[0]) return res.status(404).json({ message: 'Account not found.' });
    const [enrollments] = await pool.query(`
      SELECT e.id, e.status, e.payment_method, e.created_at, c.title, c.image_url,
        b.starts_on, b.schedule_label, b.status AS batch_status
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN batches b ON b.id = e.batch_id
      WHERE e.user_id = ? ORDER BY e.created_at DESC`, [req.auth.id]);
    res.json({ user: userRows[0], enrollments });
  } catch { res.status(500).json({ message: 'Unable to load student dashboard.' }); }
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/courses', async (req, res) => {
  const { level, category, duration, search } = req.query;
  const where = ['published = 1'];
  const values = [];
  if (level) { where.push('level = ?'); values.push(level); }
  if (category) { where.push('category = ?'); values.push(category); }
  if (duration) { where.push('duration_label = ?'); values.push(duration); }
  if (search) { where.push('(title LIKE ? OR tagline LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
  try {
    const [rows] = await pool.query(`SELECT * FROM courses WHERE ${where.join(' AND ')} ORDER BY featured DESC, title`, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load courses.' });
  }
});

app.get('/api/courses/:courseId/batches', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, course_id, starts_on, schedule_label, capacity, status FROM batches WHERE course_id = ? AND status = 'open' ORDER BY starts_on", [req.params.courseId]);
    res.json(rows);
  } catch { res.status(500).json({ message: 'Unable to load course batches.' }); }
});

app.patch('/api/enrollments/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid enrollment status.' });
  try {
    const [result] = await pool.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Enrollment not found.' });
    res.json({ message: 'Enrollment status updated.' });
  } catch { res.status(500).json({ message: 'Unable to update enrollment status.' }); }
});

app.post('/api/batches', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  const { courseId, startsOn, scheduleLabel, capacity } = req.body;
  if (!courseId || !startsOn || !scheduleLabel || !capacity || Number(capacity) < 1) return res.status(400).json({ message: 'Course, start date, schedule and capacity are required.' });
  try {
    const [result] = await pool.query('INSERT INTO batches (course_id, starts_on, schedule_label, capacity) VALUES (?, ?, ?, ?)', [courseId, startsOn, scheduleLabel, capacity]);
    res.status(201).json({ id: result.insertId, message: 'Batch created.' });
  } catch { res.status(500).json({ message: 'Unable to create batch.' }); }
});

app.patch('/api/batches/:id', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  const { startsOn, scheduleLabel, capacity, status } = req.body;
  if (!startsOn || !scheduleLabel || !capacity || !['open', 'full', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Start date, schedule, capacity and valid status are required.' });
  try {
    const [result] = await pool.query('UPDATE batches SET starts_on = ?, schedule_label = ?, capacity = ?, status = ? WHERE id = ?', [startsOn, scheduleLabel, capacity, status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Batch not found.' });
    res.json({ message: 'Batch updated.' });
  } catch { res.status(500).json({ message: 'Unable to update batch.' }); }
});

app.get('/api/admin/overview', requireAuth, requireRole('admin', 'instructor'), async (_req, res) => {
  try {
    const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'student'");
    const [[enrollments]] = await pool.query('SELECT COUNT(*) AS total FROM enrollments');
    const [[pending]] = await pool.query("SELECT COUNT(*) AS total FROM enrollments WHERE status = 'pending'");
    const [recent] = await pool.query('SELECT e.id, e.student_name, e.student_email, e.status, e.created_at, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id ORDER BY e.created_at DESC LIMIT 10');
    res.json({ stats: { students: students.total, enrollments: enrollments.total, pending: pending.total }, recent });
  } catch { res.status(500).json({ message: 'Unable to load admin overview.' }); }
});

app.get('/api/admin/courses', requireAuth, requireRole('admin', 'instructor'), async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, category, tagline, description, level, duration_label, fee, discount_fee, published, seats_left, next_batch FROM courses ORDER BY created_at DESC');
    res.json(rows);
  } catch { res.status(500).json({ message: 'Unable to load admin courses.' }); }
});

app.get('/api/admin/batches', requireAuth, requireRole('admin', 'instructor'), async (_req, res) => {
  try {
    const [rows] = await pool.query(`SELECT b.id, b.course_id, b.starts_on, b.schedule_label, b.capacity, b.status, c.title, (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id AND e.status <> 'cancelled') AS enrolled FROM batches b JOIN courses c ON c.id = b.course_id ORDER BY b.starts_on`);
    res.json(rows);
  } catch { res.status(500).json({ message: 'Unable to load admin batches.' }); }
});

app.get('/api/admin/students', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
  const search = (req.query.search || '').trim();
  try {
    const [rows] = await pool.query(`SELECT u.id, u.name, u.email, u.email_verified, u.created_at, COUNT(e.id) AS enrollments FROM users u LEFT JOIN enrollments e ON e.user_id = u.id WHERE u.role = 'student' AND (u.name LIKE ? OR u.email LIKE ?) GROUP BY u.id ORDER BY u.created_at DESC`, [`%${search}%`, `%${search}%`]);
    res.json(rows);
  } catch { res.status(500).json({ message: 'Unable to load students.' }); }
});

app.get('/api/admin/students/export', requireAuth, requireRole('admin', 'instructor'), async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT u.name, u.email, u.email_verified, u.created_at, COUNT(e.id) AS enrollments FROM users u LEFT JOIN enrollments e ON e.user_id = u.id WHERE u.role = 'student' GROUP BY u.id ORDER BY u.created_at DESC");
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = ['Name,Email,Verified,Joined,Enrollments', ...rows.map((row) => [row.name, row.email, row.email_verified ? 'Yes' : 'No', row.created_at.toISOString(), row.enrollments].map(escape).join(','))].join('\n');
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="northstar-students.csv"').send(csv);
  } catch { res.status(500).json({ message: 'Unable to export students.' }); }
});

app.get('/api/admin/instructors', requireAuth, requireRole('admin', 'instructor'), async (_req, res) => {
  try { const [rows] = await pool.query('SELECT id, name, category, bio, photo_url FROM instructors ORDER BY name'); res.json(rows); } catch { res.status(500).json({ message: 'Unable to load instructors.' }); }
});

app.post('/api/admin/instructors', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, category, bio, photoUrl } = req.body;
  if (!name || !category || !bio) return res.status(400).json({ message: 'Name, category and bio are required.' });
  try { const [result] = await pool.query('INSERT INTO instructors (name, category, bio, photo_url) VALUES (?, ?, ?, ?)', [name, category, bio, photoUrl || null]); res.status(201).json({ id: result.insertId, message: 'Instructor added.' }); } catch { res.status(500).json({ message: 'Unable to add instructor.' }); }
});

app.delete('/api/admin/instructors/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try { const [result] = await pool.query('DELETE FROM instructors WHERE id = ?', [req.params.id]); if (!result.affectedRows) return res.status(404).json({ message: 'Instructor not found.' }); res.json({ message: 'Instructor removed.' }); } catch { res.status(500).json({ message: 'Unable to remove instructor.' }); }
});

app.post('/api/admin/courses', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, category, tagline, description, level, durationLabel, fee, discountFee, nextBatch, imageUrl } = req.body;
  if (!title || !category || !tagline || !description || !level || !durationLabel || !fee || !nextBatch) return res.status(400).json({ message: 'Title, category, tagline, description, level, duration, fee and batch date are required.' });
  try {
    const [result] = await pool.query(`INSERT INTO courses (title, category, tagline, description, outcomes, curriculum, instructor_name, instructor_bio, image_url, duration_label, schedule_label, mode, level, fee, discount_fee, next_batch, seats_left, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [title, category, tagline, description, JSON.stringify([]), JSON.stringify([]), 'Northstar team', 'Instructor profile coming soon.', imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85', durationLabel, 'Schedule coming soon', 'Live online', level, fee, discountFee || null, nextBatch, 0, 0]);
    res.status(201).json({ id: result.insertId, message: 'Course created as unpublished.' });
  } catch { res.status(500).json({ message: 'Unable to create course.' }); }
});

app.patch('/api/admin/courses/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, category, tagline, description, level, durationLabel, fee, discountFee, nextBatch } = req.body;
  if (!title || !category || !tagline || !description || !level || !durationLabel || !fee || !nextBatch) return res.status(400).json({ message: 'Required course fields are missing.' });
  try {
    const [result] = await pool.query('UPDATE courses SET title = ?, category = ?, tagline = ?, description = ?, level = ?, duration_label = ?, fee = ?, discount_fee = ?, next_batch = ? WHERE id = ?', [title, category, tagline, description, level, durationLabel, fee, discountFee || null, nextBatch, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Course not found.' });
    res.json({ message: 'Course updated.' });
  } catch { res.status(500).json({ message: 'Unable to update course.' }); }
});

app.delete('/api/admin/courses/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Course not found.' });
    res.json({ message: 'Course deleted.' });
  } catch { res.status(409).json({ message: 'This course cannot be deleted while it has batches or enrollments.' }); }
});

app.patch('/api/admin/courses/:id/publish', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('UPDATE courses SET published = ? WHERE id = ?', [req.body.published ? 1 : 0, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Course not found.' });
    res.json({ message: req.body.published ? 'Course published.' : 'Course unpublished.' });
  } catch { res.status(500).json({ message: 'Unable to update course visibility.' }); }
});

app.post('/api/enrollments', async (req, res) => {
  const { courseId, batchId, name, email, phone, paymentMethod } = req.body;
  if (!courseId || !name || !email || !phone) return res.status(400).json({ message: 'Course, name, email and phone are required.' });
  let userId = null;
  try { userId = jwt.verify(req.headers.authorization?.replace('Bearer ', ''), jwtSecret).id; } catch { /* guest applications remain supported */ }
  try {
    if (batchId) {
      const [batchRows] = await pool.query("SELECT capacity, status, (SELECT COUNT(*) FROM enrollments WHERE batch_id = ? AND status <> 'cancelled') AS enrolled FROM batches WHERE id = ? AND course_id = ? FOR UPDATE", [batchId, batchId, courseId]);
      const batch = batchRows[0];
      if (!batch) return res.status(404).json({ message: 'Selected batch was not found.' });
      if (batch.status !== 'open' || batch.enrolled >= batch.capacity) return res.status(409).json({ message: 'This batch is full or no longer available.' });
    }
    const [result] = await pool.query(
      'INSERT INTO enrollments (user_id, course_id, batch_id, student_name, student_email, phone, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, courseId, batchId || null, name, email, phone, paymentMethod || 'pay_later', 'pending']
    );
    res.status(201).json({ id: result.insertId, message: 'Enrollment received. We will be in touch shortly.' });
  } catch {
    res.status(500).json({ message: 'Unable to create enrollment. Please try again.' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Northstar API listening on http://localhost:${port}`));
