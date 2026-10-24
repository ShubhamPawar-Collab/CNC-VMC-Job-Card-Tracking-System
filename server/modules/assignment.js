const { db } = require('../db');

/**
 * FR-2: Job Assignment (Admin)
 * Validates machine availability, assigns/reassigns to operator and machine, updates job status to 'Assigned',
 * updates machine status to 'Busy', writes StatusLog, and creates operator notifications.
 */
function assignJobOrder({ jobId, machineId, operatorId, assignedBy, notes }) {
  if (!jobId) {
    throw new Error('Job ID is required for assignment');
  }
  if (!machineId) {
    throw new Error('Machine ID is required');
  }
  if (!operatorId) {
    throw new Error('Operator ID is required');
  }

  // 1. Validate Job Order
  const job = db.prepare(`SELECT * FROM JobOrder WHERE jobId = ?`).get(jobId);
  if (!job) {
    throw new Error(`Job order '${jobId}' not found`);
  }

  if (job.status === 'Dispatched' || job.status === 'Completed') {
    throw new Error(`Cannot reassign job with status '${job.status}'`);
  }

  // 2. Validate Operator
  const operator = db.prepare(`SELECT * FROM User WHERE userId = ?`).get(operatorId);
  if (!operator) {
    throw new Error(`Operator with ID ${operatorId} not found`);
  }
  if (operator.role !== 'operator') {
    throw new Error(`Selected user '${operator.name}' is not an operator (Role: ${operator.role})`);
  }

  // 3. Check for existing active assignment
  const existingAssignment = db.prepare(`
    SELECT * FROM Assignment 
    WHERE jobId = ? AND isActive = 1
  `).get(jobId);

  const isReassignment = !!existingAssignment;

  // 4. Validate Machine Availability
  const targetMachine = db.prepare(`SELECT * FROM Machine WHERE machineId = ?`).get(machineId);
  if (!targetMachine) {
    throw new Error(`Machine with ID ${machineId} not found`);
  }

  // If reassigning to the exact same machine, that's fine; otherwise it must be 'Available'
  const isSameMachine = existingAssignment && existingAssignment.machineId === Number(machineId);
  if (!isSameMachine && targetMachine.status !== 'Available') {
    throw new Error(`Machine unavailable: Machine '${targetMachine.machineName}' (${targetMachine.machineCode}) is currently ${targetMachine.status}`);
  }

  // 5. If reassigning and machine changed, free up the old machine
  if (existingAssignment && existingAssignment.machineId !== Number(machineId)) {
    db.prepare(`UPDATE Machine SET status = 'Available' WHERE machineId = ?`).run(existingAssignment.machineId);
  }

  // Deactivate old assignment
  if (existingAssignment) {
    db.prepare(`UPDATE Assignment SET isActive = 0 WHERE assignmentId = ?`).run(existingAssignment.assignmentId);
  }

  // 6. Create new active assignment
  const assignedByName = assignedBy || 'Admin';
  const insertAssignment = db.prepare(`
    INSERT INTO Assignment (jobId, machineId, operatorId, assignedBy, notes, isActive)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertAssignment.run(jobId, machineId, operatorId, assignedByName, notes || '');

  // 7. Update Machine Status to 'Busy'
  db.prepare(`UPDATE Machine SET status = 'Busy' WHERE machineId = ?`).run(machineId);

  // 8. Update Job Status to 'Assigned' (unless it was already in progress/inspection during reassignment)
  let newJobStatus = 'Assigned';
  if (job.status === 'In Progress' || job.status === 'Inspection') {
    newJobStatus = job.status; // Preserve in-flight status on reassignment
  }
  db.prepare(`UPDATE JobOrder SET status = ? WHERE jobId = ?`).run(newJobStatus, jobId);

  // 9. Write StatusLog
  const actionText = isReassignment ? 'Reassigned' : 'Assigned';
  const logRemarks = `${actionText} to ${targetMachine.type} machine '${targetMachine.machineName}' and operator '${operator.name}'. ${notes ? `Notes: ${notes}` : ''}`;

  db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
    VALUES (?, ?, ?, ?)
  `).run(jobId, newJobStatus, assignedByName, logRemarks);

  // 10. Notify Operator
  const notifTitle = isReassignment ? `Job Reassigned: ${jobId}` : `New Job Assigned: ${jobId}`;
  const notifMsg = `Job ${jobId} (${job.partName}, Qty: ${job.quantity}) has been assigned to you on machine ${targetMachine.machineName}. Deadline: ${job.deadline}`;

  db.prepare(`
    INSERT INTO Notification (recipientRole, recipientId, title, message, jobId, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('operator', operator.userId, notifTitle, notifMsg, jobId, isReassignment ? 'reassignment' : 'assignment');

  return {
    jobId,
    newJobStatus,
    machine: targetMachine,
    operator: {
      userId: operator.userId,
      name: operator.name
    },
    isReassignment
  };
}

/**
 * Get all available machines
 */
function getAvailableMachines() {
  return db.prepare(`SELECT * FROM Machine WHERE status = 'Available' ORDER BY machineCode ASC`).all();
}

/**
 * Get active assignment for a job
 */
function getJobAssignment(jobId) {
  return db.prepare(`
    SELECT a.*, m.machineName, m.machineCode, m.type as machineType, m.status as machineStatus, u.name as operatorName
    FROM Assignment a
    JOIN Machine m ON a.machineId = m.machineId
    JOIN User u ON a.operatorId = u.userId
    WHERE a.jobId = ? AND a.isActive = 1
  `).get(jobId);
}

module.exports = {
  assignJobOrder,
  getAvailableMachines,
  getJobAssignment
};
