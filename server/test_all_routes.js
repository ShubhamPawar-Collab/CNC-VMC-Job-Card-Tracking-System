const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const app = require('./server');
const { seedDatabase } = require('./seed');

seedDatabase();

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  function req(endpoint, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
      const reqHeaders = { ...headers };
      let bodyData = null;

      if (data && !(data instanceof Buffer) && typeof data === 'object') {
        reqHeaders['Content-Type'] = 'application/json';
        bodyData = JSON.stringify(data);
      } else if (data) {
        bodyData = data;
      }

      const request = http.request(url, { method, headers: reqHeaders }, (res) => {
        let respData = '';
        res.on('data', c => { respData += c; });
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(respData); } catch (e) { parsed = respData; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      request.on('error', reject);
      if (bodyData) request.write(bodyData);
      request.end();
    });
  }

  try {
    console.log('Testing /api/health...');
    const health = await req('/api/health');
    if (health.status !== 200) throw new Error('Health check failed');
    console.log('✓ Health OK');

    console.log('Testing /api/auth/login...');
    const adminLogin = await req('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    if (adminLogin.status !== 200 || !adminLogin.body.token) throw new Error('Admin login failed');
    const adminToken = adminLogin.body.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log('✓ Admin login OK');

    const opLogin = await req('/api/auth/login', 'POST', { username: 'op_ramesh', password: 'operator123' });
    const opToken = opLogin.body.token;
    const opHeaders = { Authorization: `Bearer ${opToken}` };
    console.log('✓ Operator login OK');

    console.log('Testing /api/auth/me...');
    const me = await req('/api/auth/me', 'GET', null, adminHeaders);
    if (me.status !== 200 || me.body.username !== 'admin') throw new Error('Auth me failed');
    console.log('✓ Auth me OK');

    console.log('Testing /api/jobs/TE-2026-001 (auth required)...');
    const authTrack = await req('/api/jobs/TE-2026-001', 'GET', null, adminHeaders);
    if (authTrack.status !== 200 || !authTrack.body.job) throw new Error('Authenticated track failed');
    const unauthTrack = await req('/api/jobs/TE-2026-001');
    if (unauthTrack.status !== 401) throw new Error('Unauthenticated track should return 401');
    const pubTrack = await req('/api/public/track?jobId=TE-2026-001&contactNo=2805000');
    if (pubTrack.status !== 404) throw new Error('Public track route should be 404');
    console.log('✓ Job tracking & auth guard OK');

    console.log('Testing /api/clients (GET & POST)...');
    const clients = await req('/api/clients', 'GET', null, adminHeaders);
    if (clients.status !== 200 || !Array.isArray(clients.body)) throw new Error('Clients list failed');
    const newClient = await req('/api/clients', 'POST', {
      name: 'Dynamic Precision Tools',
      contactNo: '+91 98980 11223',
      address: 'Sachin GIDC Surat'
    }, adminHeaders);
    if (newClient.status !== 201) throw new Error('Client creation failed');
    console.log('✓ Clients GET & POST OK');

    console.log('Testing /api/machines & /api/machines/available...');
    const machines = await req('/api/machines', 'GET', null, adminHeaders);
    const availMachines = await req('/api/machines/available', 'GET', null, adminHeaders);
    if (machines.status !== 200 || availMachines.status !== 200) throw new Error('Machines endpoint failed');
    console.log('✓ Machines OK');

    console.log('Testing /api/operators...');
    const operators = await req('/api/operators', 'GET', null, adminHeaders);
    if (operators.status !== 200 || !Array.isArray(operators.body)) throw new Error('Operators endpoint failed');
    console.log('✓ Operators OK');

    console.log('Testing /api/jobs (POST registration FR-1 & GET)...');
    const newJob = await req('/api/jobs', 'POST', {
      clientId: clients.body[0].clientId,
      partName: 'Hydraulic Manifold Spool',
      specification: 'Ra 0.4 ground finish',
      quantity: 30,
      material: 'SS-316L',
      deadline: '2026-11-25'
    }, adminHeaders);
    if (newJob.status !== 201 || !newJob.body.jobId) throw new Error('Job registration failed');
    const testJobId = newJob.body.jobId;

    const allJobs = await req('/api/jobs', 'GET', null, adminHeaders);
    if (allJobs.status !== 200) throw new Error('Jobs list failed');
    console.log(`✓ Job Registration & Listing OK (Job ID: ${testJobId})`);

    console.log('Testing /api/assignments (FR-2 Assignment)...');
    const targetMachine = availMachines.body[0];
    const targetOp = operators.body[0];
    const assignRes = await req('/api/assignments', 'POST', {
      jobId: testJobId,
      machineId: targetMachine.machineId,
      operatorId: targetOp.userId,
      notes: 'Initial assignment test'
    }, adminHeaders);
    if (assignRes.status !== 200) throw new Error('Job assignment failed');
    console.log('✓ Assignment OK');

    console.log('Testing /api/tracking/status (FR-3 Operator Update)...');
    const statusProg = await req('/api/tracking/status', 'POST', {
      jobId: testJobId,
      newStatus: 'In Progress',
      remarks: 'Chuck aligned, started cuts'
    }, opHeaders);
    if (statusProg.status !== 200) throw new Error('Status In Progress failed');

    const statusInsp = await req('/api/tracking/status', 'POST', {
      jobId: testJobId,
      newStatus: 'Inspection',
      remarks: 'Machining complete, sent for QA'
    }, opHeaders);
    if (statusInsp.status !== 200) throw new Error('Status Inspection failed');
    console.log('✓ Status Transitions OK');

    console.log('Testing /api/tracking/breakdown...');
    const breakdownRes = await req('/api/tracking/breakdown', 'POST', {
      machineId: targetMachine.machineId,
      jobId: testJobId,
      reason: 'Coolant flow sensor trip'
    }, opHeaders);
    if (breakdownRes.status !== 200) throw new Error('Breakdown reporting failed');
    console.log('✓ Breakdown reporting OK');

    console.log('Testing /api/dispatch & /api/dispatch/note/:jobId (FR-5)...');
    const dispatchRes = await req('/api/dispatch', 'POST', {
      jobId: testJobId,
      vehicleNo: 'GJ-05-BX-1199',
      notes: 'QA Verified 100%'
    }, adminHeaders);
    if (dispatchRes.status !== 200) throw new Error('Dispatch failed');

    const noteRes = await req(`/api/dispatch/note/${testJobId}`, 'GET', null, adminHeaders);
    if (noteRes.status !== 200 || !noteRes.body.deliveryChallanNo) throw new Error('Dispatch note retrieval failed');
    console.log('✓ Dispatch & Challan Note OK');

    console.log('Testing /api/dispatch/complete...');
    const completeRes = await req('/api/dispatch/complete', 'POST', {
      jobId: testJobId,
      remarks: 'Signed delivery receipt obtained'
    }, adminHeaders);
    if (completeRes.status !== 200) throw new Error('Job completion failed');
    console.log('✓ Job Completion OK');

    console.log('Testing /api/dashboard/metrics & /api/dashboard/history...');
    const metrics = await req('/api/dashboard/metrics', 'GET', null, adminHeaders);
    const history = await req('/api/dashboard/history', 'GET', null, adminHeaders);
    if (metrics.status !== 200 || history.status !== 200) throw new Error('Dashboard endpoints failed');
    console.log('✓ Dashboard Metrics & History OK');

    console.log('Testing /api/notifications & /api/notifications/read-all...');
    const notifs = await req('/api/notifications', 'GET', null, adminHeaders);
    const readAll = await req('/api/notifications/read-all', 'POST', null, adminHeaders);
    if (notifs.status !== 200 || readAll.status !== 200) throw new Error('Notifications failed');
    console.log('✓ Notifications OK');

    console.log('Testing /api/upload (Drawing Upload with Multer)...');
    const boundary = '----WebKitFormBoundaryXYZ123';
    const fileContent = 'Dummy CAD DXF Data Content';
    const postBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="drawing"; filename="test_part.dxf"',
      'Content-Type: application/octet-stream',
      '',
      fileContent,
      `--${boundary}--`
    ].join('\r\n');

    const uploadRes = await req('/api/upload', 'POST', postBody, {
      ...adminHeaders,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    });
    if (uploadRes.status !== 200 || !uploadRes.body.drawingPath) throw new Error('Upload failed');
    console.log(`✓ Multer Upload OK (Saved to ${uploadRes.body.drawingPath})`);

    console.log('\n======================================================');
    console.log(' ALL BACKEND ROUTES TESTED AND VERIFIED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
