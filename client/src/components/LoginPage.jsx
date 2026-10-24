import React, { useState } from 'react';
import { Shield, Wrench, Building2, Lock, User, AlertCircle, ArrowRight, Layers } from 'lucide-react';
import { api } from '../api';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem('te_token', data.token);
      localStorage.setItem('te_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setError('');
    setLoading(true);

    try {
      const data = await api.login(userVal, passVal);
      localStorage.setItem('te_token', data.token);
      localStorage.setItem('te_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col justify-center items-center px-4 py-12 text-[#1C2430]">
      {/* Brand & System Heading */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[6px] bg-[#1F2A37] text-white mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <Layers className="w-6 h-6 text-[#E8ECF1]" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1C2430]">
          TRIANGLE ENGINEERING
        </h1>
        <p className="text-sm font-semibold text-[#1F5FA8] mt-1">
          CNC/VMC Job Card &amp; Order Tracking System
        </p>
        <p className="text-xs text-[#5B6573] mt-0.5">
          Plot No. 1420/B, Road No. 14, Sachin G.I.D.C., Surat – 394230
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6 sm:p-8">
        <div className="mb-5 pb-4 border-b border-[#E2DFD8]">
          <h2 className="text-sm font-bold text-[#1C2430]">Account Login</h2>
          <p className="text-xs text-[#5B6573] mt-0.5">
            Sign in with your assigned credentials to access your terminal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[#A32B22] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1C2430] mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-[#5B6573]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] focus:border-[#1F5FA8] focus:ring-1 focus:ring-[#1F5FA8] focus:outline-none rounded-[6px] pl-9 pr-3 py-2 text-xs text-[#1C2430]"
                placeholder="Enter username (e.g. admin)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C2430] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#5B6573]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] focus:border-[#1F5FA8] focus:ring-1 focus:ring-[#1F5FA8] focus:outline-none rounded-[6px] pl-9 pr-3 py-2 text-xs text-[#1C2430]"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Log In to System</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Login Buttons Below Form */}
        <div className="mt-6 pt-5 border-t border-[#E2DFD8]">
          <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider mb-2.5 text-center">
            Or 1-Click Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-[6px] bg-[#F5F4F0] hover:bg-[#EAE8E3] border border-[#E2DFD8] transition-colors cursor-pointer text-center"
            >
              <Shield className="w-4 h-4 text-[#1F5FA8] mb-1" />
              <span className="text-xs font-medium text-[#1C2430]">Admin</span>
              <span className="text-[10px] text-[#5B6573]">Dhaval P.</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('op_ramesh', 'operator123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-[6px] bg-[#F5F4F0] hover:bg-[#EAE8E3] border border-[#E2DFD8] transition-colors cursor-pointer text-center"
            >
              <Wrench className="w-4 h-4 text-[#1F5FA8] mb-1" />
              <span className="text-xs font-medium text-[#1C2430]">Operator</span>
              <span className="text-[10px] text-[#5B6573]">Ramesh P.</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('client_lnt', 'client123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-[6px] bg-[#F5F4F0] hover:bg-[#EAE8E3] border border-[#E2DFD8] transition-colors cursor-pointer text-center"
            >
              <Building2 className="w-4 h-4 text-[#1F5FA8] mb-1" />
              <span className="text-xs font-medium text-[#1C2430]">Client</span>
              <span className="text-[10px] text-[#5B6573]">L&amp;T Heavy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-[11px] text-[#5B6573]">
        Precision CNC Turning &amp; Vertical Machining Center Operations • Authorized Access Only
      </div>
    </div>
  );
}
