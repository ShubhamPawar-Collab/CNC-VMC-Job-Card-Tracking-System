const { db } = require('../db');

function getNotifications(user) {
  if (!user) return [];

  if (user.role === 'admin') {
    return db.prepare(`
      SELECT * FROM Notification 
      WHERE recipientRole = 'admin' 
      ORDER BY notificationId DESC 
      LIMIT 50
    `).all();
  }

  if (user.role === 'operator') {
    return db.prepare(`
      SELECT * FROM Notification 
      WHERE recipientRole = 'operator' AND (recipientId = ? OR recipientId IS NULL)
      ORDER BY notificationId DESC 
      LIMIT 50
    `).all(user.userId);
  }

  return [];
}

function markAsRead(notificationId) {
  db.prepare(`UPDATE Notification SET isRead = 1 WHERE notificationId = ?`).run(notificationId);
  return { success: true };
}

function markAllAsRead(user) {
  if (user.role === 'admin') {
    db.prepare(`UPDATE Notification SET isRead = 1 WHERE recipientRole = 'admin'`).run();
  } else if (user.role === 'operator') {
    db.prepare(`UPDATE Notification SET isRead = 1 WHERE recipientRole = 'operator' AND (recipientId = ? OR recipientId IS NULL)`).run(user.userId);
  }
  return { success: true };
}

function syncOverdueAlerts() {
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueJobs = db.prepare(`
    SELECT j.jobId, j.partName, j.deadline, c.name as clientName
    FROM JobOrder j
    JOIN Client c ON j.clientId = c.clientId
    WHERE j.deadline < ? AND j.status NOT IN ('Dispatched', 'Completed')
  `).all(todayStr);

  for (const job of overdueJobs) {
    const existing = db.prepare(`
      SELECT * FROM Notification
      WHERE jobId = ? AND type = 'overdue' AND date(createdDate) = date('now', 'localtime')
    `).get(job.jobId);

    if (!existing) {
      db.prepare(`
        INSERT INTO Notification (recipientRole, title, message, jobId, type)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', `OVERDUE ALERT: Job ${job.jobId}`, `Job ${job.jobId} (${job.partName}) for client ${job.clientName} has passed deadline (${job.deadline}) and is not yet dispatched!`, job.jobId, 'overdue');
    }
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  syncOverdueAlerts
};
