const { db } = require('../db');

/**
 * FR-1: Job Order Registration (Admin)
 * Creates a unique Job ID, sets status "Registered", creates client if new, and logs initial status.
 */
function generateJobId() {
  const currentYear = new Date().getFullYear();
  const prefix = `TE-${currentYear}-`;
  
  // Find highest job number for the current year
  const row = db.prepare(`
    SELECT jobId FROM JobOrder 
    WHERE jobId LIKE ? 
    ORDER BY jobId DESC 
    LIMIT 1
  `).get(`${prefix}%`);

  let nextNum = 1;
  if (row && row.jobId) {
    const parts = row.jobId.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

function registerJobOrder({
  clientId,
  newClient,
  partName,
  specification,
  quantity,
  material,
  deadline,
  registeredBy,
  drawingPath
}) {
  // Input validations
  if (!partName || !partName.trim()) {
    throw new Error('Part name is required');
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Quantity must be a positive integer');
  }

  if (!material || !material.trim()) {
    throw new Error('Material is required (e.g. Mild Steel, SS-304, Aluminum 6061, Brass)');
  }

  if (!deadline) {
    throw new Error('Deadline date is required');
  }

  let finalClientId = clientId;

  // Handle new client creation if requested
  if (!finalClientId && newClient) {
    if (!newClient.name || !newClient.name.trim()) {
      throw new Error('New client name is required');
    }
    if (!newClient.contactNo || !newClient.contactNo.trim()) {
      throw new Error('New client contact number is required');
    }

    const insertClient = db.prepare(`
      INSERT INTO Client (name, contactNo, address, email, gstNo)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertClient.run(
      newClient.name.trim(),
      newClient.contactNo.trim(),
      (newClient.address || 'Sachin GIDC, Surat').trim(),
      newClient.email ? newClient.email.trim() : null,
      newClient.gstNo ? newClient.gstNo.trim() : null
    );

    const clientRow = db.prepare(`SELECT last_insert_rowid() as id`).get();
    finalClientId = clientRow.id;
  }

  if (!finalClientId) {
    throw new Error('A valid client must be selected or provided');
  }

  // Verify client exists
  const clientExists = db.prepare(`SELECT * FROM Client WHERE clientId = ?`).get(finalClientId);
  if (!clientExists) {
    throw new Error(`Client with ID ${finalClientId} does not exist`);
  }

  const jobId = generateJobId();
  const status = 'Registered';
  const registeredByName = registeredBy || 'Admin';

  const insertJob = db.prepare(`
    INSERT INTO JobOrder (
      jobId, clientId, partName, specification, quantity, material, deadline, status, registeredBy, drawingPath
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertJob.run(
    jobId,
    finalClientId,
    partName.trim(),
    specification ? specification.trim() : '',
    parsedQty,
    material.trim(),
    deadline,
    status,
    registeredByName,
    drawingPath || null
  );

  // Initial StatusLog
  const insertLog = db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, remarks)
    VALUES (?, ?, ?, ?)
  `);

  insertLog.run(
    jobId,
    status,
    registeredByName,
    `Job Order registered with quantity ${parsedQty} for part '${partName.trim()}'. Client: ${clientExists.name}.`
  );

  return {
    jobId,
    clientId: finalClientId,
    clientName: clientExists.name,
    partName: partName.trim(),
    specification: specification || '',
    quantity: parsedQty,
    material: material.trim(),
    deadline,
    status,
    registeredBy: registeredByName,
    drawingPath
  };
}

module.exports = {
  generateJobId,
  registerJobOrder
};
