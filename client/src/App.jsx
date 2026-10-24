import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import JobTimelineModal from './components/JobTimelineModal';
import PrintableChallan from './components/PrintableChallan';
import AdminPortal from './components/AdminPortal';
import OperatorPortal from './components/OperatorPortal';
import ClientPortal from './components/ClientPortal';
import { api } from './api';

const ROLE_TO_VIEW = {
  admin: 'admin',
  operator: 'operator',
  client: 'client'
};

const VALID_VIEWS = ['login', 'admin', 'operator', 'client'];

function getViewFromLocation() {
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  const hash = window.location.hash.replace(/^#\/+/, '').split('/')[0].toLowerCase();

  if (VALID_VIEWS.includes(hash)) return hash;
  if (VALID_VIEWS.includes(path)) return path;
  return 'login';
}

function syncUrl(view) {
  const currentPath = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  const targetPath = view === 'login' ? '/' : `/${view}`;
  if (currentPath !== (view === 'login' ? '' : view)) {
    window.history.replaceState({ view }, '', targetPath);
  }
}

export default function App() {
  // Pre-seed user state from localStorage if available to avoid flash on refresh
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('te_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    const route = getViewFromLocation();
    try {
      const saved = localStorage.getItem('te_user');
      const savedUser = saved ? JSON.parse(saved) : null;
      if (savedUser && ROLE_TO_VIEW[savedUser.role]) {
        return ROLE_TO_VIEW[savedUser.role];
      }
    } catch {
      // ignore
    }
    return 'login';
  });

  const [activeTimeline, setActiveTimeline] = useState(null);
  const [activeChallan, setActiveChallan] = useState(null);

  // Validate session against backend on mount
  useEffect(() => {
    const token = localStorage.getItem('te_token');
    if (token) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('te_user', JSON.stringify(userData));
          const properView = ROLE_TO_VIEW[userData.role] || 'login';
          setCurrentView(properView);
          syncUrl(properView);
        })
        .catch(() => {
          localStorage.removeItem('te_token');
          localStorage.removeItem('te_user');
          setUser(null);
          setCurrentView('login');
          syncUrl('login');
        });
    } else {
      setUser(null);
      setCurrentView('login');
      syncUrl('login');
    }
  }, []);

  // Listen to browser navigation (back/forward or manual URL change)
  useEffect(() => {
    const handleUrlChange = () => {
      if (!user) {
        setCurrentView('login');
        syncUrl('login');
      } else {
        const allowedView = ROLE_TO_VIEW[user.role] || 'login';
        setCurrentView(allowedView);
        syncUrl(allowedView);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('te_user', JSON.stringify(userData));
    const targetView = ROLE_TO_VIEW[userData.role] || 'login';
    setCurrentView(targetView);
    syncUrl(targetView);
  };

  const handleLogout = () => {
    localStorage.removeItem('te_token');
    localStorage.removeItem('te_user');
    setUser(null);
    setCurrentView('login');
    syncUrl('login');
  };

  const handleOpenTimeline = async (jobId) => {
    try {
      const data = await api.getJobDetails(jobId);
      setActiveTimeline(data);
    } catch (err) {
      alert(`Could not load timeline for ${jobId}: ${err.message}`);
    }
  };

  const handleOpenChallan = async (jobId) => {
    try {
      const note = await api.getDispatchNote(jobId);
      setActiveChallan(note);
    } catch (err) {
      alert(`Could not load delivery challan for ${jobId}: ${err.message}`);
    }
  };

  // If not authenticated, always display full-page Login screen
  if (!user || currentView === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#1C2430] flex flex-col font-sans">
      {/* App Shell Navigation for Authenticated Users */}
      <Navbar
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
        onJobSelect={handleOpenTimeline}
      />

      {/* Main Content Area Protected by Role */}
      <main className="flex-1">
        {user.role === 'admin' && (
          <AdminPortal
            user={user}
            onOpenTimeline={handleOpenTimeline}
            onOpenChallan={handleOpenChallan}
          />
        )}

        {user.role === 'operator' && (
          <OperatorPortal
            user={user}
            onOpenTimeline={handleOpenTimeline}
          />
        )}

        {user.role === 'client' && (
          <ClientPortal
            user={user}
            onOpenTimeline={handleOpenTimeline}
            onOpenChallan={handleOpenChallan}
          />
        )}
      </main>

      {/* Clean Business Footer */}
      <footer className="bg-[#1F2A37] border-t border-[#374151] py-4 px-4 text-xs text-[#E8ECF1] no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="font-semibold text-white tracking-wide">TRIANGLE ENGINEERING</span>
            <span className="text-[11px] text-[#9CA3AF] block">
              Plot 1420/B, Road No. 14, Sachin G.I.D.C., Surat – 394230, Gujarat
            </span>
          </div>

          <div className="text-[11px] text-[#9CA3AF]">
            Precision CNC/VMC Job Card &amp; Order Tracking System • ISO 9001:2015
          </div>
        </div>
      </footer>

      {/* Job Audit Trail Timeline Modal (FR-4) */}
      {activeTimeline && (
        <JobTimelineModal
          trackingData={activeTimeline}
          onClose={() => setActiveTimeline(null)}
          onOpenChallan={handleOpenChallan}
        />
      )}

      {/* Printable Delivery Challan Modal (FR-5) */}
      {activeChallan && (
        <PrintableChallan
          note={activeChallan}
          onClose={() => setActiveChallan(null)}
        />
      )}
    </div>
  );
}
