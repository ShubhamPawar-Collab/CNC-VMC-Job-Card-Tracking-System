const http = require('node:http');

const baseUrl = 'http://127.0.0.1:5000';

function req(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    let body = null;
    if (data && typeof data === 'object') {
      reqHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
    const request = http.request(url, { method, headers: reqHeaders }, (res) => {
      let text = '';
      res.on('data', c => { text += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function runFullFlow() {
  console.log('--- STARTING FULL END-TO-END FLOW VERIFICATION ---');

  // 1. Log in as Admin
  console.log('1. Logging in as Admin...');
  const adminLogin = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  if (adminLogin.status !== 200) throw new Error('Admin login failed');
  const adminHeaders = { Authorization: `Bearer ${adminLogin.body.token}` };
  console.log('✓ Admin authenticated');

  // 2. Log in as Operator
  console.log('2. Logging in as Operator Ramesh...');
  const opLogin = await req('/api/auth/login', 'POST', { username: 'op_ramesh', password: 'operator123' });
  if (opLogin.status !== 200) throw new Error('Operator login failed');
  const opHeaders = { Authorization: `Bearer ${opLogin.body.token}` };
  console.log('✓ Operator authenticated');

  // 3. Register a new job order (FR-1)
  console.log('3. FR-1: Registering new job order...');
  const clientsRes = await req('/api/clients', 'GET', null, adminHeaders);
  const clientId = clientsRes.body[0].clientId;

  const regRes = await req('/api/jobs', 'POST', {
    clientId,
    partName: 'Aerospace Hydraulic Valve Spool',
    specification: 'Ground outer diameter 25g6, surface finish Ra 0.2',
    quantity: 15,
    material: 'SS-316L Stainless Steel',
    deadline: '2026-11-28'
  }, adminHeaders);

  if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  const jobId = regRes.body.jobId;
  console.log(`✓ Job Registered: ${jobId} (Status: ${regRes.body.status})`);

  // 4. Assign job to available machine (FR-2)
  console.log('4. FR-2: Assigning job to machine M-CNC-01 & Operator Ramesh...');
  const machinesRes = await req('/api/machines', 'GET', null, adminHeaders);
  const availableMachine = machinesRes.body.find(m => m.machineCode === 'M-CNC-01');
  const operator = opLogin.body.user;

  const assignRes = await req('/api/assignments', 'POST', {
    jobId,
    machineId: availableMachine.machineId,
    operatorId: operator.userId,
    notes: 'High precision spool batch'
  }, adminHeaders);

  if (assignRes.status !== 200) throw new Error(`Assignment failed: ${JSON.stringify(assignRes.body)}`);
  console.log(`✓ Job Assigned: Machine ${availableMachine.machineCode} locked to Busy`);

  // 5. Operator starts machining -> In Progress (FR-3)
  console.log('5. FR-3: Operator starts machining (Assigned -> In Progress)...');
  const startRes = await req('/api/tracking/status', 'POST', {
    jobId,
    newStatus: 'In Progress',
    remarks: 'Tool offsets calibrated on Fanuc 0i-TF, turning commenced'
  }, opHeaders);
  if (startRes.status !== 200) throw new Error('Start machining failed');
  console.log('✓ Status updated to In Progress');

  // 6. Operator finishes machining -> Inspection (FR-3)
  console.log('6. FR-3: Machining done, sent to Inspection (In Progress -> Inspection)...');
  const inspRes = await req('/api/tracking/status', 'POST', {
    jobId,
    newStatus: 'Inspection',
    remarks: 'Batch turning and OD grinding complete, handed to QA'
  }, opHeaders);
  if (inspRes.status !== 200) throw new Error('Send to inspection failed');
  console.log('✓ Status updated to Inspection');

  // 7. Admin fails inspection once -> Rework Loop (Inspection -> In Progress)
  console.log('7. Inspection fails once -> Returned for Rework Pass #1...');
  const reworkRes = await req('/api/tracking/status', 'POST', {
    jobId,
    newStatus: 'In Progress',
    remarks: 'OD measured 25.015mm (out of tolerance 25g6). Light skimming pass required.'
  }, adminHeaders);
  if (reworkRes.status !== 200 || reworkRes.body.reworkCount !== 1) throw new Error('Rework loop failed');
  console.log(`✓ Rework Loop Triggered! Status returned to In Progress, reworkCount: ${reworkRes.body.reworkCount}`);

  // 8. Operator finishes rework -> Second Inspection Pass
  console.log('8. Operator finishes rework pass -> Sent back to Inspection...');
  const inspRes2 = await req('/api/tracking/status', 'POST', {
    jobId,
    newStatus: 'Inspection',
    remarks: 'Skimming pass complete, verified 25.002mm on micrometer. Re-submitted for QA.'
  }, opHeaders);
  if (inspRes2.status !== 200) throw new Error('Second inspection submission failed');
  console.log('✓ Status updated to Inspection (QA Verification)');

  // 9. Admin dispatches job with delivery challan (FR-5)
  console.log('9. FR-5: Quality signoff passed -> Dispatching job with Delivery Challan...');
  const dispatchRes = await req('/api/dispatch', 'POST', {
    jobId,
    dispatchDate: '2026-10-21',
    vehicleNo: 'GJ-05-BX-7788 (Mahindra Bolero Pickup)',
    notes: 'Passed 100% QA dimensional inspection after rework pass. Dispatched in wooden cases.',
    receivedBy: 'Stores Inward Manager'
  }, adminHeaders);
  if (dispatchRes.status !== 200) throw new Error(`Dispatch failed: ${JSON.stringify(dispatchRes.body)}`);
  console.log(`✓ Job Dispatched! Delivery Challan: ${dispatchRes.body.deliveryChallanNo}`);

  // Verify machine freed back to Available
  const machineCheck = await req('/api/machines', 'GET', null, adminHeaders);
  const freedMachine = machineCheck.body.find(m => m.machineId === availableMachine.machineId);
  if (freedMachine.status !== 'Available') throw new Error(`Machine was not freed! Status: ${freedMachine.status}`);
  console.log(`✓ Machine ${freedMachine.machineCode} automatically released to 'Available'`);

  // 10. Admin completes and closes job
  console.log('10. Closing job upon customer receipt (Dispatched -> Completed)...');
  const closeRes = await req('/api/dispatch/complete', 'POST', {
    jobId,
    remarks: 'Goods received in good condition, signed acknowledgment received.'
  }, adminHeaders);
  if (closeRes.status !== 200) throw new Error('Job completion failed');
  console.log('✓ Job Order Completed and Closed');

  // 11. Check History with filters
  console.log('11. Querying Job History with filters...');
  const historyRes = await req(`/api/dashboard/history?status=Completed&search=${jobId}`, 'GET', null, adminHeaders);
  if (historyRes.status !== 200 || historyRes.body.length === 0) throw new Error('Job not found in history!');
  const historyEntry = historyRes.body[0];
  console.log(`✓ Job verified in History: ${historyEntry.jobId} | Client: ${historyEntry.clientName} | Challan: ${historyEntry.deliveryChallanNo}`);

  console.log('\n======================================================');
  console.log(' FULL FLOW VERIFIED END-TO-END WITH 100% SUCCESS!');
  console.log('======================================================');
}

runFullFlow().catch(err => {
  console.error('Flow failed:', err);
  process.exit(1);
});
