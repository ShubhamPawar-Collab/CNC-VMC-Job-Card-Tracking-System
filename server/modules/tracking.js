const { db } = require('../db');

/**
 * Valid state transitions for the CNC/VMC Job Order Lifecycle:
 * Registered -> Assigned -> In Progress -> Inspection -> Dispatched -> Completed
 * If inspection fails: Inspection -> In Progress (Rework)
 */
const VALID_TRANSITIONS = {
  'Registered': ['Assigned'],
  'Assigned': ['In Progress'],
  'In Progress': ['Inspection'],
  'Inspection': ['In Progress', 'Dispatched'], // In Progress = rework, Dispatched = passed inspection
  'Dispatched': ['Completed'],
  'Completed': []
};

/**
 * FR-3: Update Job Status (Operator / Admin)
 */
function updateJobStatus({ jobId, newStatus, updatedBy, userRole, remarks, isRework = false }) {
  if (!jobId || !newStatus) {
    throw new Error('Job ID and new status are required');
  }

  const job = db.prepare(`SELECT * FROM JobOrder WHERE jobId = ?`).get(jobId);
  if (!job) {
    throw new Error(`Job order '${jobId}' not found`);
  }

  const currentStatus = job.status;

  // Check state machine validity
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Invalid status transition: Cannot move job from '${currentStatus}' to '${newStatus}'. Allowed transitions from '${currentStatus}': [${allowedNext.join(', ') || 'None - Job is Completed'}]`);
  }

  // Operator specific restrictions
  if (userRole === 'operator') {
    // Check that this job is assigned to this operator
    const assignment = db.prepare(`
      SELECT a.* FROM Assignment a
      JOIN User u ON a.operatorId = u.userId
      WHERE a.jobId = ? AND a.isActive = 1
    `).get(jobId);

    // If updatedBy has a userId, we can check it
    if (newStatus === 'Dispatched') {
      throw new Error('Only Admin can dispatch jobs after quality inspection');
    }
  }

  // Check if rework from Inspection -> In Progress
  let reworkCount = job.reworkCount || 0;
  let logRemarks = remarks || `Status changed from ${currentStatus} to ${newStatus}`;

  if (currentStatus === 'Inspection' && newStatus === 'In Progress') {
    reworkCount += 1;
    logRemarks = `[REWORK #${reworkCount}] Inspection failed / rework requested. Reason: ${remarks || 'Dimensional variance or finishing touch required'}`;
    
    // Notify admin
    db.prepare(`
      INSERT INTO Notification (recipientRole, title, message, jobId, type)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', `Rework Needed: Job ${jobId}`, `Job ${jobId} (${job.partName}) has been sent back for rework #${reworkCount}. Notes: ${remarks || 'No notes provided'}`, jobId, 'rework');
  } else if (newStatus === 'Inspection') {
    // When job reaches inspection, notify admin
    db.prepare(`
      INSERT INTO Notification (recipientRole, title, message, jobId, type)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', `Ready for Inspection: Job ${jobId}`, `Job ${jobId} (${job.partName}) machining finished and is ready for Quality Inspection.`, jobId, 'inspection');
  }

  // Update JobOrder
  db.prepare(`
    UPDATE JobOrder 
    SET status = ?, reworkCount = ?, inspectionNotes = ?
    WHERE jobId = ?
  `).run(newStatus, reworkCount, remarks || job.inspectionNotes || '', jobId);

  // Add to StatusLog
  const updatedByName = updatedBy || 'Operator';
  db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
    VALUES (?, ?, ?, ?)
  `).run(jobId, newStatus, updatedByName, logRemarks);

  return {
    jobId,
    previousStatus: currentStatus,
    newStatus,
    reworkCount,
    updatedBy: updatedByName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Report Machine Breakdown (Operator)
 */
function reportMachineBreakdown({ machineId, jobId, reportedBy, reason }) {
  if (!machineId) {
    throw new Error('Machine ID is required to report breakdown');
  }

  const machine = db.prepare(`SELECT * FROM Machine WHERE machineId = ?`).get(machineId);
  if (!machine) {
    throw new Error(`Machine with ID ${machineId} not found`);
  }

  // Update machine status
  db.prepare(`UPDATE Machine SET status = 'Breakdown' WHERE machineId = ?`).run(machineId);

  // Notify admin
  const breakdownMsg = `URGENT: Machine ${machine.machineName} (${machine.machineCode}) reported as BREAKDOWN by ${reportedBy || 'Operator'}. Issue: ${reason || 'Technical fault'}. Active Job: ${jobId || 'None'}`;
  
  db.prepare(`
    INSERT INTO Notification (recipientRole, title, message, jobId, type)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', `BREAKDOWN ALERT: ${machine.machineCode}`, breakdownMsg, jobId || null, 'breakdown');

  // Log in job status if jobId provided
  if (jobId) {
    db.prepare(`
      INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
      VALUES (?, ?, ?, ?)
    `).run(jobId, 'In Progress', reportedBy || 'Operator', `[MACHINE BREAKDOWN] Machine ${machine.machineCode} encountered breakdown. Issue: ${reason || 'Unspecified'}`);
  }

  return {
    machineId,
    machineCode: machine.machineCode,
    status: 'Breakdown',
    reportedBy,
    reason
  };
}

/**
 * FR-4: Job Status Tracking (Admin, Client)
 * Returns current status, full vertical status history, client info, and machine/operator assignment.
 */
function trackJobStatus(jobId) {
  if (!jobId || !jobId.trim()) {
    throw new Error('Job ID is required for tracking');
  }

  const trimmedId = jobId.trim().toUpperCase();

  const job = db.prepare(`
    SELECT j.*, c.name as clientName, c.contactNo as clientContact, c.address as clientAddress, c.email as clientEmail
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    WHERE UPPER(j.jobId) = ?
  `).get(trimmedId);

  if (!job) {
    throw new Error(`Job order '${trimmedId}' does not exist in the system`);
  }

  // Get active assignment
  const assignment = db.prepare(`
    SELECT a.*, m.machineCode, m.machineName, m.type as machineType, m.status as machineStatus, u.name as operatorName
    FROM Assignment a
    JOIN Machine m ON a.machineId = m.machineId
    JOIN User u ON a.operatorId = u.userId
    WHERE a.jobId = ? AND a.isActive = 1
  `).get(job.jobId);

  // Get full vertical status history
  const statusHistory = db.prepare(`
    SELECT * FROM StatusLog
    WHERE jobId = ?
    ORDER BY logId ASC
  `).all(job.jobId);

  // Get dispatch note if any
  const dispatchNote = db.prepare(`
    SELECT * FROM DispatchNote
    WHERE jobId = ?
  `).get(job.jobId);

  return {
    job,
    assignment: assignment || null,
    statusHistory,
    dispatchNote: dispatchNote || null
  };
}

/**
 * Search jobs by query (Job ID, client name, part name)
 */
function searchJobs(query) {
  if (!query || !query.trim()) {
    return [];
  }
  const term = `%${query.trim()}%`;
  return db.prepare(`
    SELECT j.*, c.name as clientName
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    WHERE j.jobId LIKE ? OR c.name LIKE ? OR j.partName LIKE ? OR j.material LIKE ?
    ORDER BY j.createdDate DESC
    LIMIT 20
  `).all(term, term, term, term);
}

module.exports = {
  VALID_TRANSITIONS,
  updateJobStatus,
  reportMachineBreakdown,
  trackJobStatus,
  searchJobs
};
