const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Path to SQLite database file
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode if applicable
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'client')),
      password TEXT NOT NULL,
      contactNo TEXT,
      createdDate TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS Client (
      clientId INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contactNo TEXT NOT NULL,
      address TEXT NOT NULL,
      email TEXT,
      gstNo TEXT,
      userId INTEGER,
      createdDate TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(userId) REFERENCES User(userId) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Machine (
      machineId INTEGER PRIMARY KEY AUTOINCREMENT,
      machineCode TEXT UNIQUE NOT NULL,
      machineName TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('CNC', 'VMC')),
      status TEXT NOT NULL CHECK(status IN ('Available', 'Busy', 'Breakdown')),
      specifications TEXT,
      lastMaintained TEXT
    );

    CREATE TABLE IF NOT EXISTS JobOrder (
      jobId TEXT PRIMARY KEY,
      clientId INTEGER NOT NULL,
      partName TEXT NOT NULL,
      specification TEXT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      material TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Registered', 'Assigned', 'In Progress', 'Inspection', 'Dispatched', 'Completed')),
      createdDate TEXT DEFAULT (datetime('now', 'localtime')),
      registeredBy TEXT NOT NULL,
      drawingPath TEXT,
      reworkCount INTEGER DEFAULT 0,
      inspectionNotes TEXT,
      FOREIGN KEY(clientId) REFERENCES Client(clientId)
    );

    CREATE TABLE IF NOT EXISTS Assignment (
      assignmentId INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT NOT NULL,
      machineId INTEGER NOT NULL,
      operatorId INTEGER NOT NULL,
      assignedDate TEXT DEFAULT (datetime('now', 'localtime')),
      assignedBy TEXT NOT NULL,
      notes TEXT,
      isActive INTEGER DEFAULT 1,
      FOREIGN KEY(jobId) REFERENCES JobOrder(jobId) ON DELETE CASCADE,
      FOREIGN KEY(machineId) REFERENCES Machine(machineId),
      FOREIGN KEY(operatorId) REFERENCES User(userId)
    );

    CREATE TABLE IF NOT EXISTS StatusLog (
      logId INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT NOT NULL,
      status TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now', 'localtime')),
      remarks TEXT,
      FOREIGN KEY(jobId) REFERENCES JobOrder(jobId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS DispatchNote (
      dispatchId INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT UNIQUE NOT NULL,
      dispatchDate TEXT NOT NULL,
      deliveryChallanNo TEXT UNIQUE NOT NULL,
      vehicleNo TEXT,
      dispatchedBy TEXT NOT NULL,
      receivedBy TEXT,
      notes TEXT,
      createdDate TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(jobId) REFERENCES JobOrder(jobId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Notification (
      notificationId INTEGER PRIMARY KEY AUTOINCREMENT,
      recipientRole TEXT NOT NULL,
      recipientId INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      jobId TEXT,
      type TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      createdDate TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

initDatabase();

module.exports = {
  db,
  initDatabase
};
