const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./db');

function seedDatabase() {
  console.log('--- Initializing Database & Running Seed Script ---');
  initDatabase();

  // Clear existing data in reverse foreign key order
  db.exec(`
    DELETE FROM Notification;
    DELETE FROM DispatchNote;
    DELETE FROM StatusLog;
    DELETE FROM Assignment;
    DELETE FROM JobOrder;
    DELETE FROM Machine;
    DELETE FROM Client;
    DELETE FROM User;
    DELETE FROM sqlite_sequence;
  `);

  console.log('Existing tables cleared.');

  // 1. Seed Users (1 Admin, 3 Operators, 4 Clients)
  const passwordAdmin = bcrypt.hashSync('admin123', 10);
  const passwordOp = bcrypt.hashSync('operator123', 10);
  const passwordClient = bcrypt.hashSync('client123', 10);

  const insertUser = db.prepare(`
    INSERT INTO User (username, name, role, password, contactNo)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Admin
  insertUser.run('admin', 'Mr. Dhaval Prajapati', 'admin', passwordAdmin, '+91 99047 73848');

  // Operators
  insertUser.run('op_ramesh', 'Ramesh Patel', 'operator', passwordOp, '+91 98251 44321');
  insertUser.run('op_suresh', 'Suresh Sharma', 'operator', passwordOp, '+91 97240 55123');
  insertUser.run('op_rajesh', 'Rajesh Mistry', 'operator', passwordOp, '+91 98980 66789');

  // Clients
  insertUser.run('client_lnt', 'Larsen & Toubro Ltd', 'client', passwordClient, '+91 261 280 5000');
  insertUser.run('client_reliance', 'Reliance Industries Ltd', 'client', passwordClient, '+91 261 286 1000');
  insertUser.run('client_surat', 'Surat Precision Tools', 'client', passwordClient, '+91 98241 12345');
  insertUser.run('client_adani', 'Adani Ports & SEZ', 'client', passwordClient, '+91 261 287 3000');

  console.log('Users seeded successfully.');

  // Map User IDs
  const users = db.prepare(`SELECT * FROM User`).all();
  const userMap = {};
  for (const u of users) {
    userMap[u.username] = u.userId;
  }

  // 2. Seed 4 Clients
  const insertClient = db.prepare(`
    INSERT INTO Client (name, contactNo, address, email, gstNo, userId)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertClient.run(
    'Larsen & Toubro Heavy Engineering',
    '+91 261 280 5000',
    'Hazira Manufacturing Complex, Surat-394510, Gujarat',
    'procurement.hazira@larsentoubro.com',
    '24AAACL0149C1ZV',
    userMap['client_lnt']
  );

  insertClient.run(
    'Reliance Industries Petrochemical Div.',
    '+91 261 286 1000',
    'Hazira Petrochem Complex, PO Surat-394510',
    'purchase.surat@ril.com',
    '24AAACR5055K1ZI',
    userMap['client_reliance']
  );

  insertClient.run(
    'Surat Precision Tools & Dies',
    '+91 98241 12345',
    'Plot 2104, Road No. 2, Sachin G.I.D.C, Surat-394230',
    'orders@suratprecision.com',
    '24AABCS4451M1Z8',
    userMap['client_surat']
  );

  insertClient.run(
    'Adani Ports & Special Economic Zone',
    '+91 261 287 3000',
    'APSEZ Terminal, Hazira Port, Surat-394270',
    'logistics.parts@adani.com',
    '24AAACA3020H1ZT',
    userMap['client_adani']
  );

  console.log('Clients seeded successfully.');

  const clients = db.prepare(`SELECT * FROM Client`).all();
  const clientMap = {};
  for (const c of clients) {
    clientMap[c.name] = c.clientId;
  }

  // 3. Seed 5 Machines (CNC/VMC)
  // Types: CNC / VMC. Statuses: Available, Busy, Breakdown
  const insertMachine = db.prepare(`
    INSERT INTO Machine (machineCode, machineName, type, status, specifications, lastMaintained)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMachine.run(
    'M-CNC-01',
    'Ace Micromatic Jobber XL Turning Center',
    'CNC',
    'Available',
    '2-Axis CNC Lathe, 200mm Hydraulic Chuck, 4000 RPM, Fanuc 0i-TF Controller',
    '2026-10-10'
  );

  insertMachine.run(
    'M-CNC-02',
    'LMW Smarturn II Heavy Duty CNC Lathe',
    'CNC',
    'Busy',
    'Slant Bed CNC Turning Center, 8-Station Servo Turret, 3500 RPM, Siemens 828D',
    '2026-10-12'
  );

  insertMachine.run(
    'M-VMC-01',
    'BFW BMV 45+ High Precision 3-Axis VMC',
    'VMC',
    'Busy',
    'Table 1000x500mm, BT-40 Spindle 8000 RPM, 24-Tool Twin Arm ATC, Fanuc Controller',
    '2026-10-05'
  );

  insertMachine.run(
    'M-VMC-02',
    'Haas VF-2SS Super-Speed Vertical Machining Center',
    'VMC',
    'Available',
    '12,000 RPM High Speed Spindle, 30+1 Side Mount ATC, 3-Axis Precision VMC',
    '2026-10-14'
  );

  insertMachine.run(
    'M-VMC-03',
    'Jyoti VMC 850 Performance Machining Center',
    'VMC',
    'Breakdown',
    'Travel X:850 Y:510 Z:510mm, Spindle BT-40, Status: Axis Servo Alarm (Pending Technician)',
    '2026-09-28'
  );

  console.log('Machines seeded successfully.');

  const machines = db.prepare(`SELECT * FROM Machine`).all();
  const machineMap = {};
  for (const m of machines) {
    machineMap[m.machineCode] = m.machineId;
  }

  // 4. Seed 12 Sample Jobs across ALL statuses
  // Status flow: Registered -> Assigned -> In Progress -> Inspection -> Dispatched -> Completed
  const jobsData = [
    {
      jobId: 'TE-2026-001',
      clientName: 'Larsen & Toubro Heavy Engineering',
      partName: 'Flange Coupling Hub 120mm',
      specification: 'OD 120mm, Bore 45H7 with 12mm Keyway. Tolerance +/- 0.015mm. Surface finish Ra 1.6.',
      quantity: 50,
      material: 'SS-304 Stainless Steel',
      deadline: '2026-11-15',
      status: 'Registered',
      createdDate: '2026-10-18 10:30:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      drawingPath: '/drawings/sample_flange_coupling.png'
    },
    {
      jobId: 'TE-2026-002',
      clientName: 'Surat Precision Tools & Dies',
      partName: 'Precision Involute Spline Shaft',
      specification: 'Shaft Dia 32mm, 18-Teeth Involute Splines DIN 5480, Induction Hardened to 55 HRC.',
      quantity: 20,
      material: 'EN-24 Alloy Steel',
      deadline: '2026-11-20',
      status: 'Registered',
      createdDate: '2026-10-19 14:15:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      drawingPath: '/drawings/sample_spline_shaft.png'
    },
    {
      jobId: 'TE-2026-003',
      clientName: 'Reliance Industries Petrochemical Div.',
      partName: 'Hydraulic Manifold Block 4-Port',
      specification: '6-sided milling, G 1/2 BSPP internal ports, high pressure test certified for 350 Bar.',
      quantity: 15,
      material: 'Aluminum 6061-T6',
      deadline: '2026-11-05',
      status: 'Assigned',
      createdDate: '2026-10-17 09:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-VMC-02',
      operatorUsername: 'op_suresh',
      drawingPath: '/drawings/sample_manifold.png'
    },
    {
      jobId: 'TE-2026-004',
      clientName: 'Adani Ports & Special Economic Zone',
      partName: 'Heavy Crane Bushing Sleeve',
      specification: 'OD 90mm, ID 75mm, Length 140mm with dual spiral grease grooves.',
      quantity: 100,
      material: 'Phosphor Bronze PB-2',
      deadline: '2026-11-08',
      status: 'Assigned',
      createdDate: '2026-10-17 11:45:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-01',
      operatorUsername: 'op_ramesh',
      drawingPath: '/drawings/sample_bushing.png'
    },
    {
      jobId: 'TE-2026-005',
      clientName: 'Larsen & Toubro Heavy Engineering',
      partName: 'Centrifugal Impeller Impeller Hub',
      specification: 'Complex multi-vane turning and face contouring. Dynamic balance G2.5.',
      quantity: 12,
      material: 'Cast Iron FG-260',
      deadline: '2026-11-02',
      status: 'In Progress',
      createdDate: '2026-10-15 08:30:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-02',
      operatorUsername: 'op_ramesh',
      drawingPath: '/drawings/sample_impeller.png'
    },
    {
      jobId: 'TE-2026-006',
      clientName: 'Surat Precision Tools & Dies',
      partName: 'Die Casting Core Insert Pin',
      specification: 'Precision 3D pocket milling, taper angle 1.5 deg, vacuum hardened to 52 HRC.',
      quantity: 8,
      material: 'AISI H-13 Tool Steel',
      deadline: '2026-10-30',
      status: 'In Progress',
      createdDate: '2026-10-14 16:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-VMC-01',
      operatorUsername: 'op_rajesh',
      drawingPath: '/drawings/sample_core_insert.png',
      hasReworkHistory: true // Shows failed inspection rework loop!
    },
    {
      jobId: 'TE-2026-007',
      clientName: 'Reliance Industries Petrochemical Div.',
      partName: 'Cryogenic Valve Stem & Bonnet',
      specification: 'Thread 1.25-8 UN-2A ground thread, super finished stem Dia 25h6.',
      quantity: 35,
      material: 'SS-316L Austenitic Stainless Steel',
      deadline: '2026-10-28',
      status: 'Inspection',
      createdDate: '2026-10-12 11:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-01',
      operatorUsername: 'op_ramesh',
      drawingPath: '/drawings/sample_valve_stem.png'
    },
    {
      jobId: 'TE-2026-008',
      clientName: 'Adani Ports & Special Economic Zone',
      partName: 'Conveyor Roller Bearing End Cover',
      specification: 'Bearing fit bore 85H7 (+0.035/-0), seal groove diameter 105mm.',
      quantity: 60,
      material: 'Mild Steel IS 2062 Grade B',
      deadline: '2026-10-29',
      status: 'Inspection',
      createdDate: '2026-10-11 13:20:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-02',
      operatorUsername: 'op_suresh',
      drawingPath: '/drawings/sample_bearing_cover.png'
    },
    {
      // OVERDUE JOB 1 (Deadline was 2026-10-16, status In Progress)
      jobId: 'TE-2026-009',
      clientName: 'Larsen & Toubro Heavy Engineering',
      partName: 'Heavy Gearbox Output Flange',
      specification: 'Pitch circle dia 240mm, 12 holes Dia 18mm equally spaced, Face runout within 0.02mm.',
      quantity: 18,
      material: 'EN-8 Carbon Steel',
      deadline: '2026-10-16', // Overdue!
      status: 'In Progress',
      createdDate: '2026-10-06 09:30:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-02',
      operatorUsername: 'op_ramesh',
      drawingPath: '/drawings/sample_gearbox_flange.png'
    },
    {
      // OVERDUE JOB 2 (Deadline was 2026-10-18, status Assigned)
      jobId: 'TE-2026-010',
      clientName: 'Surat Precision Tools & Dies',
      partName: 'Servo Motor Mounting Bracket',
      specification: 'NEMA 34 face mount pattern, circular pilot register Dia 73h7, anodized finish.',
      quantity: 40,
      material: 'Aluminum 7075-T6',
      deadline: '2026-10-18', // Overdue!
      status: 'Assigned',
      createdDate: '2026-10-08 14:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-VMC-01',
      operatorUsername: 'op_rajesh',
      drawingPath: '/drawings/sample_servo_bracket.png'
    },
    {
      jobId: 'TE-2026-011',
      clientName: 'Reliance Industries Petrochemical Div.',
      partName: 'Heat Exchanger Tube Sheet Plate',
      specification: '144 holes Dia 19.25mm reamed, Pitch 25.4mm triangular, Ligament tolerance +/- 0.05mm.',
      quantity: 4,
      material: 'SS-304L Clad Plate',
      deadline: '2026-10-15',
      status: 'Dispatched',
      createdDate: '2026-10-01 10:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-VMC-01',
      operatorUsername: 'op_rajesh',
      drawingPath: '/drawings/sample_tube_sheet.png',
      dispatchDate: '2026-10-16',
      deliveryChallanNo: 'DC-TE-2026-001',
      vehicleNo: 'GJ-05-BX-4412 (Tata 407)',
      dispatchedBy: 'Mr. Dhaval Prajapati'
    },
    {
      jobId: 'TE-2026-012',
      clientName: 'Adani Ports & Special Economic Zone',
      partName: 'Hardened Precision Guide Pillars Set',
      specification: 'OD 50g6 (-0.009/-0.025), Case Carburized & Ground to 60 HRC, Mirror finish.',
      quantity: 48,
      material: 'OHNS High Carbon Tool Steel',
      deadline: '2026-10-10',
      status: 'Completed',
      createdDate: '2026-09-25 09:00:00',
      registeredBy: 'Mr. Dhaval Prajapati',
      machineCode: 'M-CNC-01',
      operatorUsername: 'op_ramesh',
      drawingPath: '/drawings/sample_guide_pillars.png',
      dispatchDate: '2026-10-09',
      deliveryChallanNo: 'DC-TE-2026-002',
      vehicleNo: 'GJ-05-AT-7890 (Mahindra Bolero Maxi Truck)',
      dispatchedBy: 'Mr. Dhaval Prajapati'
    }
  ];

  const insertJob = db.prepare(`
    INSERT INTO JobOrder (
      jobId, clientId, partName, specification, quantity, material, deadline, status, createdDate, registeredBy, drawingPath, reworkCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssignment = db.prepare(`
    INSERT INTO Assignment (jobId, machineId, operatorId, assignedDate, assignedBy, notes, isActive)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const insertLog = db.prepare(`
    INSERT INTO StatusLog (jobId, status, updatedBy, timestamp, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertDispatch = db.prepare(`
    INSERT INTO DispatchNote (jobId, dispatchDate, deliveryChallanNo, vehicleNo, dispatchedBy, receivedBy, notes, createdDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const job of jobsData) {
    const clientId = clientMap[job.clientName];
    const reworkCount = job.hasReworkHistory ? 1 : 0;

    insertJob.run(
      job.jobId,
      clientId,
      job.partName,
      job.specification,
      job.quantity,
      job.material,
      job.deadline,
      job.status,
      job.createdDate,
      job.registeredBy,
      job.drawingPath || null,
      reworkCount
    );

    // Initial Registration log
    insertLog.run(
      job.jobId,
      'Registered',
      job.registeredBy,
      job.createdDate,
      `Job order registered with quantity ${job.quantity} for part '${job.partName}'. Material: ${job.material}`
    );

    // Assignment log if assigned or further
    if (['Assigned', 'In Progress', 'Inspection', 'Dispatched', 'Completed'].includes(job.status)) {
      const machineId = machineMap[job.machineCode];
      const operatorId = userMap[job.operatorUsername];
      const assignDate = job.createdDate.replace(/ \d\d:/, ' 14:');

      insertAssignment.run(
        job.jobId,
        machineId,
        operatorId,
        assignDate,
        job.registeredBy,
        `Assigned to ${job.machineCode} for precision machining operations`
      );

      insertLog.run(
        job.jobId,
        'Assigned',
        job.registeredBy,
        assignDate,
        `Assigned to machine '${job.machineCode}' and operator.`
      );
    }

    // In Progress log
    if (['In Progress', 'Inspection', 'Dispatched', 'Completed'].includes(job.status)) {
      insertLog.run(
        job.jobId,
        'In Progress',
        'Ramesh Patel',
        job.createdDate.replace(/ \d\d:/, ' 16:'),
        'Raw material loaded, chuck alignment verified, roughing cuts commenced.'
      );
    }

    // If has rework history
    if (job.hasReworkHistory) {
      insertLog.run(
        job.jobId,
        'Inspection',
        'Rajesh Mistry',
        '2026-10-18 11:30:00',
        'First machining stage finished. Submitted for dimensional verification.'
      );
      insertLog.run(
        job.jobId,
        'In Progress',
        'Mr. Dhaval Prajapati',
        '2026-10-18 14:00:00',
        '[REWORK #1] Inspection failed: Corner radius chamfer measured 0.8mm instead of 0.5mm. Sent back to operator for finishing pass.'
      );
    }

    // Inspection log
    if (['Inspection', 'Dispatched', 'Completed'].includes(job.status)) {
      insertLog.run(
        job.jobId,
        'Inspection',
        'Quality Engineer',
        '2026-10-19 10:00:00',
        'Final machining finished. Undergoing vernier caliper, bore gauge, and surface roughness (Ra) QA inspection.'
      );
    }

    // Dispatched log & record
    if (['Dispatched', 'Completed'].includes(job.status)) {
      insertDispatch.run(
        job.jobId,
        job.dispatchDate,
        job.deliveryChallanNo,
        job.vehicleNo,
        job.dispatchedBy,
        'Warehouse Receiving Supervisor',
        '100% Quality Inspected and Verified against specifications. Handed over with test certificate.',
        job.dispatchDate + ' 16:30:00'
      );

      insertLog.run(
        job.jobId,
        'Dispatched',
        job.dispatchedBy,
        job.dispatchDate + ' 16:30:00',
        `Dispatched under Delivery Challan ${job.deliveryChallanNo} via ${job.vehicleNo}. Machine freed to Available.`
      );
    }

    // Completed log
    if (job.status === 'Completed') {
      insertLog.run(
        job.jobId,
        'Completed',
        job.registeredBy,
        job.dispatchDate + ' 18:00:00',
        'Client acknowledged receipt in good condition. Quality signoff received. Job closed.'
      );
    }
  }

  console.log('12 Sample Jobs with complete history seeded.');

  // 5. Seed Initial Notifications
  const insertNotification = db.prepare(`
    INSERT INTO Notification (recipientRole, recipientId, title, message, jobId, type, isRead)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Admin breakdown alert
  insertNotification.run(
    'admin',
    userMap['admin'],
    'MACHINE BREAKDOWN ALERT: M-VMC-03',
    'Jyoti VMC 850 reported Axis Servo Alarm fault during machining. Technician scheduled.',
    null,
    'breakdown',
    0
  );

  // Admin overdue alerts
  insertNotification.run(
    'admin',
    userMap['admin'],
    'OVERDUE ALERT: Job TE-2026-009',
    'Job TE-2026-009 (Heavy Gearbox Output Flange) for Larsen & Toubro passed deadline (2026-10-16)!',
    'TE-2026-009',
    'overdue',
    0
  );

  insertNotification.run(
    'admin',
    userMap['admin'],
    'OVERDUE ALERT: Job TE-2026-010',
    'Job TE-2026-010 (Servo Motor Mounting Bracket) for Surat Precision passed deadline (2026-10-18)!',
    'TE-2026-010',
    'overdue',
    0
  );

  // Operator assignments
  insertNotification.run(
    'operator',
    userMap['op_ramesh'],
    'New Job Assigned: TE-2026-004',
    'Heavy Crane Bushing Sleeve (Qty: 100) assigned to you on machine M-CNC-01. Deadline: 2026-11-08',
    'TE-2026-004',
    'assignment',
    0
  );

  insertNotification.run(
    'operator',
    userMap['op_suresh'],
    'New Job Assigned: TE-2026-003',
    'Hydraulic Manifold Block 4-Port (Qty: 15) assigned to you on machine M-VMC-02. Deadline: 2026-11-05',
    'TE-2026-003',
    'assignment',
    0
  );

  insertNotification.run(
    'operator',
    userMap['op_rajesh'],
    'Rework Needed: Job TE-2026-006',
    'Die Casting Core Insert Pin sent back from Inspection for chamfer rework. Please adjust CNC offsets.',
    'TE-2026-006',
    'rework',
    0
  );

  console.log('Demo notifications seeded.');
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
