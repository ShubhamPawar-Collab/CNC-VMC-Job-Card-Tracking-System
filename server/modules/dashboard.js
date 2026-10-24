const { db } = require('../db');

/**
 * Admin Dashboard Metrics & Analytics
 */
function getDashboardMetrics() {
  // Counts by status
  const statuses = ['Registered', 'Assigned', 'In Progress', 'Inspection', 'Dispatched', 'Completed'];
  const statusCounts = {};
  for (const s of statuses) {
    statusCounts[s] = 0;
  }

  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM JobOrder 
    GROUP BY status
  `).all();

  for (const row of statusRows) {
    statusCounts[row.status] = row.count;
  }

  // Machine workload & status
  const machineRows = db.prepare(`
    SELECT 
      m.machineId, 
      m.machineCode, 
      m.machineName, 
      m.type, 
      m.status,
      j.jobId as activeJobId,
      j.partName as activePartName,
      u.name as activeOperatorName
    FROM Machine m
    LEFT JOIN Assignment a ON (m.machineId = a.machineId AND a.isActive = 1)
    LEFT JOIN JobOrder j ON (a.jobId = j.jobId AND j.status IN ('Assigned', 'In Progress', 'Inspection'))
    LEFT JOIN User u ON a.operatorId = u.userId
    ORDER BY m.machineCode ASC
  `).all();

  const machineSummary = {
    total: machineRows.length,
    available: machineRows.filter(m => m.status === 'Available').length,
    busy: machineRows.filter(m => m.status === 'Busy').length,
    breakdown: machineRows.filter(m => m.status === 'Breakdown').length,
    machines: machineRows
  };

  // Overdue jobs alert: deadline passed (date < today) and status NOT IN ('Dispatched', 'Completed')
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueJobs = db.prepare(`
    SELECT j.*, c.name as clientName, m.machineCode, u.name as operatorName
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    LEFT JOIN Assignment a ON (j.jobId = a.jobId AND a.isActive = 1)
    LEFT JOIN Machine m ON a.machineId = m.machineId
    LEFT JOIN User u ON a.operatorId = u.userId
    WHERE j.deadline < ? AND j.status NOT IN ('Dispatched', 'Completed')
    ORDER BY j.deadline ASC
  `).all(todayStr);

  // Pending jobs list (active jobs not yet completed or dispatched)
  const pendingJobs = db.prepare(`
    SELECT j.*, c.name as clientName, m.machineCode, m.machineName, u.name as operatorName
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    LEFT JOIN Assignment a ON (j.jobId = a.jobId AND a.isActive = 1)
    LEFT JOIN Machine m ON a.machineId = m.machineId
    LEFT JOIN User u ON a.operatorId = u.userId
    WHERE j.status IN ('Registered', 'Assigned', 'In Progress', 'Inspection')
    ORDER BY j.deadline ASC
  `).all();

  // Operators workload
  const operatorRows = db.prepare(`
    SELECT u.userId, u.name, u.contactNo,
      COUNT(CASE WHEN j.status IN ('Assigned', 'In Progress', 'Inspection') THEN 1 END) as activeJobsCount
    FROM User u
    LEFT JOIN Assignment a ON (u.userId = a.operatorId AND a.isActive = 1)
    LEFT JOIN JobOrder j ON a.jobId = j.jobId
    WHERE u.role = 'operator'
    GROUP BY u.userId, u.name, u.contactNo
    ORDER BY u.name ASC
  `).all();

  return {
    statusCounts,
    totalJobs: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    machineSummary,
    overdueJobs,
    overdueCount: overdueJobs.length,
    pendingJobs,
    operatorRows
  };
}

/**
 * Filterable Job History (Completed, Dispatched, or All jobs with client, material, date range, search)
 */
function getJobHistory({ client, status, startDate, endDate, search, limit = 100 }) {
  let query = `
    SELECT j.*, c.name as clientName, c.contactNo as clientContact,
           m.machineCode, m.machineName, u.name as operatorName,
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

  if (client) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${client}%`);
  }

  if (status && status !== 'All') {
    query += ` AND j.status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND j.createdDate >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND j.createdDate <= ?`;
    params.push(endDate + ' 23:59:59');
  }

  if (search) {
    query += ` AND (j.jobId LIKE ? OR j.partName LIKE ? OR j.material LIKE ? OR c.name LIKE ?)`;
    const sTerm = `%${search}%`;
    params.push(sTerm, sTerm, sTerm, sTerm);
  }

  query += ` ORDER BY j.createdDate DESC LIMIT ?`;
  params.push(Number(limit));

  return db.prepare(query).all(...params);
}

module.exports = {
  getDashboardMetrics,
  getJobHistory
};
