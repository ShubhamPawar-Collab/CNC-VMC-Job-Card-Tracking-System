const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server');
const { db, initDatabase } = require('../db');
const { seedDatabase } = require('../seed');

let server;
let baseUrl;
let adminToken;
let operatorToken;
let clientToken;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      if (typeof options.body === 'object') {
        reqOptions.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }
    }

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let body = data;
        try {
          body = JSON.parse(data);
        } catch (e) {
          // keep as raw text
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

before(async () => {
  // Re-seed DB fresh before tests
  seedDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login as admin
  const adminRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  assert.strictEqual(adminRes.status, 200);
  adminToken = adminRes.body.token;

  // Login as operator
  const opRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'op_ramesh', password: 'operator123' }
  });
  assert.strictEqual(opRes.status, 200);
  operatorToken = opRes.body.token;

  // Login as client
  const clientRes = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'client_lnt', password: 'client123' }
  });
  assert.strictEqual(clientRes.status, 200);
  clientToken = clientRes.body.token;
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('1. Authentication & Role-Based Access Control', () => {
  test('Login succeeds for Admin, Operator, and Client with correct roles', () => {
    assert.ok(adminToken, 'Admin token should exist');
    assert.ok(operatorToken, 'Operator token should exist');
    assert.ok(clientToken, 'Client token should exist');
  });

  test('Login fails with invalid credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' }
    });
    assert.strictEqual(res.status, 401);
    assert.match(res.body.error, /invalid/i);
  });

  test('Protected endpoint rejects request without token', async () => {
    const res = await request('/api/dashboard/metrics');
    assert.strictEqual(res.status, 401);
  });

  test('Role guard forbids Operator from accessing Admin dashboard metrics', async () => {
    const res = await request('/api/dashboard/metrics', {
      headers: { Authorization: `Bearer ${operatorToken}` }
    });
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /forbidden/i);
  });

  test('GET /api/auth/me returns authenticated profile', async () => {
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.username, 'admin');
    assert.strictEqual(res.body.role, 'admin');
  });
});

describe('2. FR-1: Job Order Registration (Admin)', () => {
  let createdJobId;

  test('Admin registers a new job order with existing client', async () => {
    // Get client 1
    const clientsRes = await request('/api/clients', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(clientsRes.status, 200);
    assert.ok(clientsRes.body.length > 0);
    const clientId = clientsRes.body[0].clientId;

    const res = await request('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        clientId,
        partName: 'Precision Hydraulic Bushing 50mm',
        specification: 'Outer Dia 50mm, ID 35mm, Ground finish Ra 0.8',
        quantity: 25,
        material: 'Phosphor Bronze PB-1',
        deadline: '2026-11-30'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.jobId);
    assert.match(res.body.jobId, /^TE-\d{4}-\d{3}$/);
    assert.strictEqual(res.body.status, 'Registered');
    assert.strictEqual(res.body.quantity, 25);
    createdJobId = res.body.jobId;
  });

  test('Job registration with inline new client creation', async () => {
    const res = await request('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        newClient: {
          name: 'Ahmedabad Precision Gears Pvt Ltd',
          contactNo: '+91 79 2658 9900',
          address: 'GIDC Vatva, Ahmedabad',
          email: 'contact@ahmedabadgears.com',
          gstNo: '24AAACA1122B1Z3'
        },
        partName: 'Helical Pinion Gear 24-Teeth',
        specification: 'Module 3, 24 Teeth, Pressure Angle 20 Deg',
        quantity: 10,
        material: 'EN-36 Case Hardening Steel',
        deadline: '2026-12-10'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.clientName, 'Ahmedabad Precision Gears Pvt Ltd');
  });

  test('Job registration rejects missing required fields or invalid quantity', async () => {
    const res = await request('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        partName: '',
        quantity: -5,
        material: 'Steel',
        deadline: '2026-11-30'
      }
    });
    assert.strictEqual(res.status, 400);
  });
});

describe('3. FR-2: Job Assignment & Machine Availability Checks (Admin)', () => {
  let testJobId;
  let availableMachine;
  let busyMachine;
  let operator;

  before(async () => {
    // Register a fresh job for assignment tests
    const clientRes = await request('/api/clients', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const regRes = await request('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        clientId: clientRes.body[0].clientId,
        partName: 'CNC Test Shaft Component',
        specification: 'Shaft 40mm Dia, Tolerance 0.01mm',
        quantity: 12,
        material: 'Mild Steel IS 2062',
        deadline: '2026-11-18'
      }
    });
    testJobId = regRes.body.jobId;

    // Get machines
    const machinesRes = await request('/api/machines', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    availableMachine = machinesRes.body.find(m => m.status === 'Available');
    busyMachine = machinesRes.body.find(m => m.status === 'Busy');

    // Get operators
    const opsRes = await request('/api/operators', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    operator = opsRes.body[0];
  });

  test('Assigning job to an Available machine succeeds and marks machine Busy', async () => {
    assert.ok(availableMachine, 'An available machine must exist in seeded data');
    const res = await request('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: testJobId,
        machineId: availableMachine.machineId,
        operatorId: operator.userId,
        notes: 'Priority batch, finish roughing today.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.newJobStatus, 'Assigned');

    // Check machine is now Busy
    const machinesRes = await request('/api/machines', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const machineCheck = machinesRes.body.find(m => m.machineId === availableMachine.machineId);
    assert.strictEqual(machineCheck.status, 'Busy');
  });

  test('Attempting to assign a job to a Busy machine fails with machine-unavailable error', async () => {
    // Create another job
    const clientRes = await request('/api/clients', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const regRes = await request('/api/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        clientId: clientRes.body[0].clientId,
        partName: 'Conflict Job',
        quantity: 5,
        material: 'Aluminum',
        deadline: '2026-11-20'
      }
    });
    const conflictJobId = regRes.body.jobId;

    const res = await request('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: conflictJobId,
        machineId: availableMachine.machineId, // is now Busy from previous test
        operatorId: operator.userId
      }
    });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /machine unavailable/i);
  });

  test('Reassigning job to another machine frees up the previous machine', async () => {
    // Find another machine that is Available
    const machinesRes = await request('/api/machines', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const secondAvailable = machinesRes.body.find(m => m.status === 'Available');
    if (!secondAvailable) {
      // Force one to available for test
      db.prepare("UPDATE Machine SET status = 'Available' WHERE machineCode = 'M-VMC-02'").run();
    }
    const targetMachine = db.prepare("SELECT * FROM Machine WHERE machineCode = 'M-VMC-02'").get();

    const reassignRes = await request('/api/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: testJobId,
        machineId: targetMachine.machineId,
        operatorId: operator.userId,
        notes: 'Reassigned due to tooling setup convenience'
      }
    });

    assert.strictEqual(reassignRes.status, 200);
    assert.strictEqual(reassignRes.body.isReassignment, true);

    // Old machine should now be Available again
    const oldMachine = db.prepare('SELECT * FROM Machine WHERE machineId = ?').get(availableMachine.machineId);
    assert.strictEqual(oldMachine.status, 'Available');
  });
});

describe('3. FR-3: Job Status Update & Lifecycle State Transitions (Operator)', () => {
  let jobId;

  before(async () => {
    // Use TE-2026-004 which is Assigned in seed data
    jobId = 'TE-2026-004';
  });

  test('Operator advances job status from Assigned to In Progress', async () => {
    const res = await request('/api/tracking/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
      body: {
        jobId,
        newStatus: 'In Progress',
        remarks: 'Tool setup completed, commenced turning operation.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.newStatus, 'In Progress');
  });

  test('Operator advances job status from In Progress to Inspection', async () => {
    const res = await request('/api/tracking/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
      body: {
        jobId,
        newStatus: 'Inspection',
        remarks: 'Batch turning done. Delivered to Quality Inspection table.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.newStatus, 'Inspection');
  });

  test('Inspection failure returns job to In Progress with rework count incremented', async () => {
    const res = await request('/api/tracking/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId,
        newStatus: 'In Progress',
        remarks: 'Internal bore undersized by 0.02mm. Rework pass required.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.newStatus, 'In Progress');
    assert.strictEqual(res.body.reworkCount, 1);

    // Verify status log contains rework marker
    const trackingRes = await request(`/api/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const lastLog = trackingRes.body.statusHistory[trackingRes.body.statusHistory.length - 1];
    assert.match(lastLog.remarks, /REWORK #1/);
  });

  test('Invalid state transition is rejected by state machine', async () => {
    // Current status is 'In Progress', cannot jump directly to 'Completed'
    const res = await request('/api/tracking/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId,
        newStatus: 'Completed',
        remarks: 'Direct bypass attempt'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /invalid status transition/i);
  });

  test('Operator reports Machine Breakdown', async () => {
    const machinesRes = await request('/api/machines', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const targetMachine = machinesRes.body[0];

    const res = await request('/api/tracking/breakdown', {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
      body: {
        machineId: targetMachine.machineId,
        jobId,
        reason: 'Hydraulic chuck pressure sensor failure'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'Breakdown');

    // Verify machine status updated
    const machine = db.prepare('SELECT * FROM Machine WHERE machineId = ?').get(targetMachine.machineId);
    assert.strictEqual(machine.status, 'Breakdown');

    // Restore machine status for subsequent tests
    db.prepare("UPDATE Machine SET status = 'Available' WHERE machineId = ?").run(targetMachine.machineId);
  });
});

describe('4. FR-4: Job Status Tracking & Role Protection', () => {
  test('Admin fetches full job tracking timeline', async () => {
    const res = await request('/api/jobs/TE-2026-006', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.job.jobId, 'TE-2026-006');
    assert.ok(Array.isArray(res.body.statusHistory));
    assert.ok(res.body.statusHistory.length >= 3);
  });

  test('Client fetches own job tracking timeline after login', async () => {
    // TE-2026-001 belongs to client1 (L&T Heavy Engineering)
    const res = await request('/api/jobs/TE-2026-001', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.job.jobId, 'TE-2026-001');
    assert.strictEqual(res.body.job.partName, 'Flange Coupling Hub 120mm');
    assert.ok(Array.isArray(res.body.statusHistory));
  });

  test('Unauthenticated request to track job is rejected (login required)', async () => {
    const res = await request('/api/jobs/TE-2026-001');
    assert.strictEqual(res.status, 401);
  });

  test('Legacy public tracking endpoint /api/public/track is removed (404)', async () => {
    const res = await request('/api/public/track?jobId=TE-2026-001&contactNo=2805000');
    assert.strictEqual(res.status, 404);
  });
});

describe('5. FR-5: Dispatch & Job Closure (Admin)', () => {
  let inspectJobId;

  before(async () => {
    // TE-2026-007 is in 'Inspection' status in seed data
    inspectJobId = 'TE-2026-007';
  });

  test('Dispatching a job not yet in Inspection status fails (quality gate)', async () => {
    // TE-2026-001 is in 'Registered' status
    const res = await request('/api/dispatch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: 'TE-2026-001',
        vehicleNo: 'GJ-05-BX-1122'
      }
    });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /quality inspection required/i);
  });

  test('Admin dispatches job that passed inspection with delivery challan note', async () => {
    const res = await request('/api/dispatch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: inspectJobId,
        dispatchDate: '2026-10-21',
        vehicleNo: 'GJ-05-BT-9901 (Tata Ace)',
        notes: 'Passed 100% CMM inspection. Packed in bubble wrap crates.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'Dispatched');
    assert.ok(res.body.deliveryChallanNo);
    assert.match(res.body.deliveryChallanNo, /^DC-TE-\d{4}-\d{3}$/);
  });

  test('GET /api/dispatch/note/:jobId returns complete formatted dispatch note for printing', async () => {
    const res = await request(`/api/dispatch/note/${inspectJobId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.jobId, inspectJobId);
    assert.ok(res.body.deliveryChallanNo);
    assert.ok(res.body.clientName);
    assert.ok(res.body.partName);
  });

  test('Admin closes dispatched job to Completed status', async () => {
    const res = await request('/api/dispatch/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobId: inspectJobId,
        remarks: 'Client delivery confirmed and signed off by stores manager.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'Completed');
  });
});

describe('6. Admin Dashboard Metrics & Filterable History', () => {
  test('GET /api/dashboard/metrics returns status counts, machine summary, overdue jobs', async () => {
    const res = await request('/api/dashboard/metrics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.statusCounts);
    assert.ok(res.body.machineSummary);
    assert.ok(Array.isArray(res.body.overdueJobs));
    assert.ok(res.body.overdueCount >= 1, 'Should detect overdue jobs');
  });

  test('GET /api/dashboard/history supports filtering by status and search', async () => {
    const res = await request('/api/dashboard/history?status=Completed&search=Pillars', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('7. Notifications System', () => {
  test('Admin receives breakdown and overdue notifications', async () => {
    const res = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  test('Marking notification as read works', async () => {
    const listRes = await request('/api/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const firstNotif = listRes.body[0];

    const markRes = await request(`/api/notifications/${firstNotif.notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(markRes.status, 200);
    assert.strictEqual(markRes.body.success, true);
  });
});
