import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Wrench, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api';

export default function NotificationBell({ user, onJobSelect }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.notificationId === id ? { ...n, isRead: 1 } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-[#A32B22] shrink-0" />;
      case 'breakdown':
        return <AlertCircle className="w-4 h-4 text-[#A32B22] shrink-0" />;
      case 'rework':
        return <Wrench className="w-4 h-4 text-[#5B3D86] shrink-0" />;
      case 'dispatch':
        return <CheckCircle2 className="w-4 h-4 text-[#1E6B3A] shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-[#1F5FA8] shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-[6px] bg-[#283647] hover:bg-[#324357] border border-[#3E526A] text-[#E8ECF1] transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#A32B22] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg z-50 overflow-hidden text-[#1C2430]">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E2DFD8] bg-[#F0EEEA]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1F5FA8]" />
              <span className="font-semibold text-xs text-[#1C2430]">Alerts &amp; Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#FBE1DF] text-[#A32B22] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-[#1F5FA8] hover:text-[#174A85] font-medium transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E2DFD8]">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#5B6573]">
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.notificationId}
                  onClick={() => {
                    if (item.jobId && onJobSelect) {
                      onJobSelect(item.jobId);
                      setIsOpen(false);
                    }
                  }}
                  className={`p-3 flex gap-2.5 text-left transition-colors cursor-pointer ${
                    item.isRead ? 'bg-white hover:bg-[#FAF9F6]' : 'bg-[#F5F4F0] hover:bg-[#EAE8E3]'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold leading-snug ${item.isRead ? 'text-[#1C2430]' : 'text-[#1F5FA8]'}`}>
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <button
                          onClick={(e) => handleMarkRead(item.notificationId, e)}
                          className="w-2 h-2 rounded-full bg-[#1F5FA8] shrink-0 hover:scale-125 transition-transform"
                          title="Mark as read"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#5B6573] mt-0.5 line-clamp-2">{item.message}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#5B6573] font-mono">
                      <span>{item.createdDate}</span>
                      {item.jobId && <span className="text-[#1F5FA8] font-semibold">{item.jobId}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
