const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const { db, initDatabase } = require('./db');
const { generateToken, authenticateToken, requireRole } = require('./middleware/auth');
const { registerJobOrder, generateJobId } = require('./modules/registration');
const { assignJobOrder, getAvailableMachines, getJobAssignment } = require('./modules/assignment');
const { updateJobStatus, reportMachineBreakdown, trackJobStatus, searchJobs } = require('./modules/tracking');
const { dispatchJobOrder, completeJobOrder, getDispatchNoteDetails, generateChallanNumber } = require('./modules/dispatch');
const { getDashboardMetrics, getJobHistory } = require('./modules/dashboard');
const { getNotifications, markAsRead, markAllAsRead, syncOverdueAlerts } = require('./modules/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure database and uploads directory are initialized
initDatabase();
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for CAD drawings and part blueprints
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'CNC/VMC Job Card & Order Tracking System',
    company: 'Triangle Engineering',
    time: new Date().toISOString()
  });
});

// -----------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// -----------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM User WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const passwordValid = bcrypt.compareSync(password, user.password);
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // If role is client, find associated client record if any
  let clientData = null;
  if (user.role === 'client') {
    clientData = db.prepare('SELECT * FROM Client WHERE userId = ?').get(user.userId);
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      contactNo: user.contactNo,
      clientId: clientData ? clientData.clientId : null,
      clientName: clientData ? clientData.name : null
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT userId, username, name, role, contactNo, createdDate FROM User WHERE userId = ?').get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let clientData = null;
  if (user.role === 'client') {
    clientData = db.prepare('SELECT * FROM Client WHERE userId = ?').get(user.userId);
  }

  res.json({
    ...user,
    clientId: clientData ? clientData.clientId : null,
    clientName: clientData ? clientData.name : null
  });
});

// -----------------------------------------------------------------------------
// FILE UPLOAD ROUTE (Drawings / Blueprints)
// -----------------------------------------------------------------------------
app.post('/api/upload', authenticateToken, upload.single('drawing'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No drawing file provided' });
  }
  const drawingPath = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    drawingPath,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  });
});


// -----------------------------------------------------------------------------
// CLIENTS, MACHINES, OPERATORS ROUTES
// -----------------------------------------------------------------------------
app.get('/api/clients', authenticateToken, (req, res) => {
  const clients = db.prepare('SELECT * FROM Client ORDER BY name ASC').all();
  res.json(clients);
});

app.post('/api/clients', authenticateToken, requireRole('admin'), (req, res) => {
  const { name, contactNo, address, email, gstNo } = req.body;
  if (!name || !contactNo) {
    return res.status(400).json({ error: 'Client name and contact number are required' });
  }

  const insert = db.prepare(`
    INSERT INTO Client (name, contactNo, address, email, gstNo)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(
    name.trim(),
    contactNo.trim(),
    (address || 'Surat, Gujarat').trim(),
    email ? email.trim() : null,
    gstNo ? gstNo.trim() : null
  );

  const newClient = db.prepare('SELECT * FROM Client WHERE clientId = ?').get(result.lastInsertRowid);
  res.status(201).json(newClient);
});

app.get('/api/machines', authenticateToken, (req, res) => {
  const machines = db.prepare(`
    SELECT m.*,
           j.jobId as activeJobId, j.partName as activePartName,
           u.name as activeOperatorName
    FROM Machine m
    LEFT JOIN Assignment a ON (m.machineId = a.machineId AND a.isActive = 1)
    LEFT JOIN JobOrder j ON (a.jobId = j.jobId AND j.status IN ('Assigned', 'In Progress', 'Inspection'))
    LEFT JOIN User u ON a.operatorId = u.userId
    ORDER BY m.machineCode ASC
  `).all();
  res.json(machines);
});

app.get('/api/machines/available', authenticateToken, (req, res) => {
  const available = getAvailableMachines();
  res.json(available);
});

app.patch('/api/machines/:machineId/status', authenticateToken, requireRole('admin'), (req, res) => {
  const { status } = req.body;
  const { machineId } = req.params;
  if (!['Available', 'Busy', 'Breakdown'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Available, Busy, or Breakdown' });
  }

  db.prepare('UPDATE Machine SET status = ? WHERE machineId = ?').run(status, machineId);
  const updated = db.prepare('SELECT * FROM Machine WHERE machineId = ?').get(machineId);
  res.json(updated);
});

app.get('/api/operators', authenticateToken, (req, res) => {
  const operators = db.prepare(`
    SELECT u.userId, u.name, u.contactNo, u.username,
           COUNT(CASE WHEN j.status IN ('Assigned', 'In Progress', 'Inspection') THEN 1 END) as activeJobCount
    FROM User u
    LEFT JOIN Assignment a ON (u.userId = a.operatorId AND a.isActive = 1)
    LEFT JOIN JobOrder j ON a.jobId = j.jobId
    WHERE u.role = 'operator'
    GROUP BY u.userId, u.name, u.contactNo, u.username
    ORDER BY u.name ASC
  `).all();
  res.json(operators);
});

// -----------------------------------------------------------------------------
// FR-1: JOB ORDER REGISTRATION & LISTING (Admin / Protected)
// -----------------------------------------------------------------------------
app.get('/api/jobs', authenticateToken, (req, res) => {
  let query = `
    SELECT j.*, c.name as clientName, c.contactNo as clientContact,
           m.machineCode, m.machineName, m.type as machineType,
           u.name as operatorName, u.userId as operatorId,
           d.deliveryChallanNo, d.dispatchDate
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    LEFT JOIN Assignment a ON (j.jobId = a.jobId AND a.isActive = 1)
    LEFT JOIN Machine m ON a.machineId = m.machineId
    LEFT JOIN User u ON a.operatorId = u.userId
    LEFT JOIN DispatchNote d ON j.jobId = d.jobId
    WHERE 1=1
  `;
  const params = [];

  // Role based filtering
  if (req.user.role === 'operator') {
    query += ` AND a.operatorId = ? AND j.status IN ('Assigned', 'In Progress', 'Inspection')`;
    params.push(req.user.userId);
  } else if (req.user.role === 'client') {
    const clientRecord = db.prepare('SELECT clientId FROM Client WHERE userId = ?').get(req.user.userId);
    if (!clientRecord) {
      return res.json([]);
    }
    query += ` AND j.clientId = ?`;
    params.push(clientRecord.clientId);
  }

  query += ` ORDER BY j.createdDate DESC`;
  const jobs = db.prepare(query).all(...params);
  res.json(jobs);
});

app.post('/api/jobs', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const registered = registerJobOrder({
      ...req.body,
      registeredBy: req.user.name
    });
    res.status(201).json(registered);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/jobs/:jobId', authenticateToken, (req, res) => {
  try {
    const tracking = trackJobStatus(req.params.jobId);
    
    // Client role authorization: ensure the client only views their own job
    if (req.user.role === 'client') {
      const clientRecord = db.prepare('SELECT clientId FROM Client WHERE userId = ?').get(req.user.userId);
      if (!clientRecord || clientRecord.clientId !== tracking.job.clientId) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view this job' });
      }
    }

    res.json(tracking);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/jobs/:jobId', authenticateToken, requireRole('admin'), (req, res) => {
  const { jobId } = req.params;
  const job = db.prepare('SELECT * FROM JobOrder WHERE jobId = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  if (['In Progress', 'Inspection', 'Dispatched', 'Completed'].includes(job.status)) {
    return res.status(400).json({ error: `Cannot delete job with status '${job.status}'` });
  }

  // Release machine if assigned
  const assignment = db.prepare('SELECT * FROM Assignment WHERE jobId = ? AND isActive = 1').get(jobId);
  if (assignment) {
    db.prepare("UPDATE Machine SET status = 'Available' WHERE machineId = ?").run(assignment.machineId);
  }

  db.prepare('DELETE FROM JobOrder WHERE jobId = ?').run(jobId);
  res.json({ success: true, message: `Job ${jobId} deleted successfully` });
});

// -----------------------------------------------------------------------------
// FR-2: JOB ASSIGNMENT (Admin)
// -----------------------------------------------------------------------------
app.post('/api/assignments', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { jobId, machineId, operatorId, notes } = req.body;
    const result = assignJobOrder({
      jobId,
      machineId,
      operatorId,
      assignedBy: req.user.name,
      notes
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/assignments/:jobId', authenticateToken, (req, res) => {
  const assignment = getJobAssignment(req.params.jobId);
  if (!assignment) {
    return res.status(404).json({ error: 'No active assignment found for this job' });
  }
  res.json(assignment);
});

// -----------------------------------------------------------------------------
// FR-3: JOB STATUS UPDATE & BREAKDOWN REPORTING (Operator / Admin)
// -----------------------------------------------------------------------------
app.post('/api/tracking/status', authenticateToken, requireRole('operator', 'admin'), (req, res) => {
  try {
    const { jobId, newStatus, remarks } = req.body;
    const result = updateJobStatus({
      jobId,
      newStatus,
      updatedBy: req.user.name,
      userRole: req.user.role,
      remarks
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tracking/breakdown', authenticateToken, requireRole('operator', 'admin'), (req, res) => {
  try {
    const { machineId, jobId, reason } = req.body;
    const result = reportMachineBreakdown({
      machineId,
      jobId,
      reportedBy: req.user.name,
      reason
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// FR-4: JOB SEARCH & TRACKING
// -----------------------------------------------------------------------------
app.get('/api/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  const results = searchJobs(q);
  res.json(results);
});

// -----------------------------------------------------------------------------
// FR-5: DISPATCH & JOB CLOSURE (Admin)
// -----------------------------------------------------------------------------
app.post('/api/dispatch', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { jobId, dispatchDate, deliveryChallanNo, vehicleNo, notes, receivedBy } = req.body;
    const result = dispatchJobOrder({
      jobId,
      dispatchDate,
      deliveryChallanNo,
      vehicleNo,
      notes,
      dispatchedBy: req.user.name,
      receivedBy
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/dispatch/complete', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { jobId, remarks } = req.body;
    const result = completeJobOrder({
      jobId,
      completedBy: req.user.name,
      remarks
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/dispatch/note/:jobId', authenticateToken, (req, res) => {
  const note = getDispatchNoteDetails(req.params.jobId);
  if (!note) {
    return res.status(404).json({ error: 'Dispatch note not found for this job order' });
  }
  res.json(note);
});

// -----------------------------------------------------------------------------
// ADMIN DASHBOARD & HISTORY
// -----------------------------------------------------------------------------
app.get('/api/dashboard/metrics', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    syncOverdueAlerts();
    const metrics = getDashboardMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/history', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const history = getJobHistory(req.query);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// NOTIFICATIONS
// -----------------------------------------------------------------------------
app.get('/api/notifications', authenticateToken, (req, res) => {
  syncOverdueAlerts();
  const notifications = getNotifications(req.user);
  res.json(notifications);
});

app.patch('/api/notifications/:notificationId/read', authenticateToken, (req, res) => {
  const result = markAsRead(req.params.notificationId);
  res.json(result);
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
  const result = markAllAsRead(req.user);
  res.json(result);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Triangle Engineering CNC/VMC Backend Server Running`);
    console.log(` Port: ${PORT}`);
    console.log(` Health URL: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
