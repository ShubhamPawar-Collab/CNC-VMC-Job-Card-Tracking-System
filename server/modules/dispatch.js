const { db } = require('../db');

/**
 * FR-5: Dispatch & Job Closure (Admin)
 * Gated to jobs that have passed inspection. Sets status to 'Dispatched', frees machine,
 * records dispatch note, and logs status update.
 */
function generateChallanNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `DC-TE-${currentYear}-`;
  
  const row = db.prepare(`
    SELECT deliveryChallanNo FROM DispatchNote
    WHERE deliveryChallanNo LIKE ?
    ORDER BY dispatchId DESC
    LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.deliveryChallanNo) {
    const parts = row.deliveryChallanNo.split('-');
    const lastNum = parseInt(parts[3], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

function dispatchJobOrder({
  jobId,
  dispatchDate,
  deliveryChallanNo,
  vehicleNo,
  notes,
  dispatchedBy,
  receivedBy
}) {
  if (!jobId) {
    throw new Error('Job ID is required for dispatch');
  }

  // 1. Validate Job Order
  const job = db.prepare(`SELECT * FROM JobOrder WHERE jobId = ?`).get(jobId);
  if (!job) {
    throw new Error(`Job order '${jobId}' not found`);
  }

  // Only jobs that have passed inspection can be dispatched
  if (job.status !== 'Inspection') {
    throw new Error(`Cannot dispatch job: Quality inspection required. Current status is '${job.status}' (Must be 'Inspection' to dispatch)`);
  }

  const finalDispatchDate = dispatchDate || new Date().toISOString().split('T')[0];
  const finalChallanNo = deliveryChallanNo && deliveryChallanNo.trim() 
    ? deliveryChallanNo.trim() 
    : generateChallanNumber();
  const dispatchedByName = dispatchedBy || 'Admin';

  // 2. Insert or replace into DispatchNote
  const insertNote = db.prepare(`
    INSERT INTO DispatchNote (
      jobId, dispatchDate, deliveryChallanNo, vehicleNo, dispatchedBy, receivedBy, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNote.run(
    jobId,
    finalDispatchDate,
    finalChallanNo,
    vehicleNo ? vehicleNo.trim() : 'Hand Delivery / Pickup',
    dispatchedByName,
    receivedBy ? receivedBy.trim() : null,
    notes ? notes.trim() : 'Inspected & Passed 100% Quality Check'
  );

  // 3. Update JobOrder status to 'Dispatched'
  db.prepare(`
    UPDATE JobOrder 
    SET status = 'Dispatched'
    WHERE jobId = ?
  `).run(jobId);

  // 4. Free up machine (set back to 'Available')
  const activeAssignment = db.prepare(`
    SELECT * FROM Assignment WHERE jobId = ? AND isActive = 1
  `).get(jobId);

  if (activeAssignment && activeAssignment.machineId) {
    db.prepare(`
      UPDATE Machine 
      SET status = 'Available' 
      WHERE machineId = ?
    `).run(activeAssignment.machineId);
  }

  // 5. Write StatusLog entry
  const logRemarks = `Job inspected, approved, and dispatched under Delivery Challan #${finalChallanNo} via ${vehicleNo || 'Local Delivery'}. Machine released to Available.`;
  db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
    VALUES (?, ?, ?, ?)
  `).run(jobId, 'Dispatched', dispatchedByName, logRemarks);

  // 6. Notify Client and Admin
  db.prepare(`
    INSERT INTO Notification (recipientRole, title, message, jobId, type)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', `Dispatched: Job ${jobId}`, `Job ${jobId} successfully dispatched under Challan ${finalChallanNo}`, jobId, 'dispatch');

  return {
    jobId,
    status: 'Dispatched',
    deliveryChallanNo: finalChallanNo,
    dispatchDate: finalDispatchDate,
    vehicleNo,
    dispatchedBy: dispatchedByName
  };
}

/**
 * Mark Dispatched job as Completed (Job closure upon client delivery acceptance)
 */
function completeJobOrder({ jobId, completedBy, remarks }) {
  if (!jobId) {
    throw new Error('Job ID is required to complete');
  }

  const job = db.prepare(`SELECT * FROM JobOrder WHERE jobId = ?`).get(jobId);
  if (!job) {
    throw new Error(`Job order '${jobId}' not found`);
  }

  if (job.status !== 'Dispatched') {
    throw new Error(`Cannot close job: Job must be in 'Dispatched' status. Current status is '${job.status}'`);
  }

  db.prepare(`UPDATE JobOrder SET status = 'Completed' WHERE jobId = ?`).run(jobId);

  const completedByName = completedBy || 'Admin';
  db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
    VALUES (?, ?, ?, ?)
  `).run(jobId, 'Completed', completedByName, remarks || 'Client delivery confirmed. Job order successfully closed.');

  return {
    jobId,
    status: 'Completed',
    completedBy: completedByName
  };
}

/**
 * Get full dispatch note with client and company details for printing
 */
function getDispatchNoteDetails(jobId) {
  const note = db.prepare(`
    SELECT d.*, j.partName, j.specification, j.quantity, j.material, j.deadline, j.createdDate,
           c.name as clientName, c.contactNo as clientContact, c.address as clientAddress, c.gstNo as clientGst,
           m.machineName, m.machineCode, u.name as operatorName
    FROM DispatchNote d
    JOIN JobOrder j ON d.jobId = j.jobId
    JOIN Client c ON j.clientId = c.clientId
    LEFT JOIN Assignment a ON (j.jobId = a.jobId AND a.isActive = 1)
    LEFT JOIN Machine m ON a.machineId = m.machineId
    LEFT JOIN User u ON a.operatorId = u.userId
    WHERE d.jobId = ?
  `).get(jobId);

  return note;
}

module.exports = {
  generateChallanNumber,
  dispatchJobOrder,
  completeJobOrder,
  getDispatchNoteDetails
};
