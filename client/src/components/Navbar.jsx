import React from 'react';
import {
  Shield,
  Wrench,
  Building2,
  LogOut,
  Layers
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar({
  user,
  currentView,
  setCurrentView,
  onLogout,
  onJobSelect
}) {
  const getRoleIcon = () => {
    if (user?.role === 'admin') return <Shield className="w-3.5 h-3.5" />;
    if (user?.role === 'operator') return <Wrench className="w-3.5 h-3.5" />;
    return <Building2 className="w-3.5 h-3.5" />;
  };

  const getPortalLabel = () => {
    if (user?.role === 'admin') return 'Admin Portal';
    if (user?.role === 'operator') return 'Operator Terminal';
    return 'Client Portal';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1F2A37] border-b border-[#374151] px-4 lg:px-8 py-2.5 text-[#E8ECF1]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => {
            if (user?.role === 'admin') setCurrentView('admin');
            else if (user?.role === 'operator') setCurrentView('operator');
            else if (user?.role === 'client') setCurrentView('client');
          }}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-[6px] bg-[#1F5FA8] flex items-center justify-center text-white shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-wide text-white">
                TRIANGLE ENGINEERING
              </span>
            </div>
            <p className="text-[10px] text-[#9CA3AF] tracking-tight">
              CNC / VMC Job Card &amp; Order Tracking • Sachin GIDC, Surat
            </p>
          </div>
        </div>

        {/* Current Active Portal Indicator */}
        <div className="hidden md:flex items-center gap-1 bg-[#16202B] px-3 py-1.5 rounded-[6px] border border-[#2B3848] text-xs font-medium text-[#E8ECF1]">
          {getRoleIcon()}
          <span>{getPortalLabel()}</span>
        </div>

        {/* Right Section: Notification Bell, User Auth, Logout Button */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          {user && <NotificationBell user={user} onJobSelect={onJobSelect} />}

          {/* User Profile Info */}
          {user && (
            <div className="hidden sm:block text-right pl-2 border-l border-[#374151]">
              <div className="text-xs font-medium text-white">{user.name}</div>
              <div className="text-[10px] uppercase text-[#9CA3AF] font-semibold">{user.role}</div>
            </div>
          )}

          {/* Logout Button */}
          {user && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#283647] hover:bg-[#324357] text-[#E8ECF1] border border-[#3E526A] text-xs font-medium transition-colors cursor-pointer"
              title="Log Out of system"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
