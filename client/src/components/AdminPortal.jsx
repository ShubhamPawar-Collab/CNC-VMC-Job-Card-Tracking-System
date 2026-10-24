import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Cpu,
  Users,
  Building2,
  Clock,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  Printer,
  Trash2,
  Wrench
} from 'lucide-react';
import { api } from '../api';
import RegisterJobModal from './RegisterJobModal';
import AssignJobModal from './AssignJobModal';
import DispatchModal from './DispatchModal';

export default function AdminPortal({
  user,
  onOpenTimeline,
  onOpenChallan
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [assignModalJob, setAssignModalJob] = useState(null);
  const [dispatchModalJob, setDispatchModalJob] = useState(null);

  // History filters
  const [historyClient, setHistoryClient] = useState('');
  const [historyStatus, setHistoryStatus] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  const loadData = async () => {
    try {
      const [m, j, c, mac, op] = await Promise.all([
        api.getDashboardMetrics(),
        api.getJobs(),
        api.getClients(),
        api.getMachines(),
        api.getOperators()
      ]);
      setMetrics(m);
      setJobs(j);
      setClients(c);
      setMachines(mac);
      setOperators(op);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const h = await api.getJobHistory({
        client: historyClient,
        status: historyStatus,
        search: historySearch,
        startDate: historyStartDate,
        endDate: historyEndDate
      });
      setHistoryJobs(h);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, historyClient, historyStatus, historySearch, historyStartDate, historyEndDate]);

  const handleMachineStatusChange = async (machineId, newStatus) => {
    try {
      await api.updateMachineStatus(machineId, newStatus);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(`Are you sure you want to delete job order ${jobId}?`)) return;
    try {
      await api.deleteJob(jobId);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteJob = async (jobId) => {
    const remarks = window.prompt('Enter closure / confirmation notes:', 'Client delivery acknowledged and accepted.');
    if (remarks === null) return;
    try {
      await api.completeJob(jobId, remarks);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchQuery ||
      job.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Registered':
        return 'status-registered';
      case 'Assigned':
        return 'status-assigned';
      case 'In Progress':
        return 'status-in-progress';
      case 'Inspection':
        return 'status-inspection';
      case 'Dispatched':
        return 'status-dispatched';
      case 'Completed':
        return 'status-completed';
      case 'Breakdown':
      case 'Overdue':
        return 'status-breakdown';
      default:
        return 'status-registered';
    }
  };

  const getMachineBadgeClass = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-[#DDF1E4] text-[#1E6B3A]';
      case 'Busy':
        return 'bg-[#FCEFD6] text-[#8A5A00]';
      case 'Breakdown':
        return 'bg-[#FBE1DF] text-[#A32B22]';
      default:
        return 'bg-[#E6EAF0] text-[#3E4C5E]';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6 text-[#1C2430]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8]">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#1C2430]">Admin Management Portal</h1>
          </div>
          <p className="text-xs text-[#5B6573] mt-1">
            Logged in as <strong>{user?.name || 'Administrator'}</strong> • Shop floor operations and job card control
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white font-medium text-xs shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Job</span>
          </button>
        </div>
      </div>

      {/* Overdue Jobs Alert Banner */}
      {metrics && metrics.overdueCount > 0 && (
        <div className="p-3.5 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[#A32B22] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <div className="font-semibold text-xs">
                {metrics.overdueCount} job order(s) past delivery deadline:
              </div>
              <div className="text-[11px] mt-0.5">
                {metrics.overdueJobs.map((o) => `${o.jobId} (${o.partName} - ${o.deadline})`).join(' • ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('jobs');
              setStatusFilter('In Progress');
            }}
            className="px-2.5 py-1 rounded-[4px] bg-[#A32B22] hover:bg-[#85231B] text-white text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
          >
            Filter In-Progress
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-[6px] border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        {[
          { id: 'dashboard', label: 'Dashboard & Metrics', icon: Cpu },
          { id: 'jobs', label: `Active Job Orders (${jobs.length})`, icon: Layers },
          { id: 'history', label: 'History & Reports', icon: Clock },
          { id: 'machines', label: `Machinery Fleet (${machines.length})`, icon: Wrench },
          { id: 'operators', label: `Operators (${operators.length})`, icon: Users },
          { id: 'clients', label: `Clients (${clients.length})`, icon: Building2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#1F5FA8] text-white'
                  : 'text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && metrics && (
        <div className="space-y-6">
          {/* 6 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <span className="text-[10px] text-[#5B6573] font-medium block">Total Registered</span>
              <div className="text-xl font-bold text-[#1C2430] mt-1">{metrics.totalJobs}</div>
              <span className="text-[10px] text-[#5B6573]">All-time jobs</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <span className="text-[10px] text-[#8A5A00] font-medium block">In Machining</span>
              <div className="text-xl font-bold text-[#8A5A00] mt-1">
                {metrics.statusCounts['In Progress'] || 0}
              </div>
              <span className="text-[10px] text-[#5B6573]">On shop floor</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <span className="text-[10px] text-[#5B3D86] font-medium block">In Inspection</span>
              <div className="text-xl font-bold text-[#5B3D86] mt-1">
                {metrics.statusCounts['Inspection'] || 0}
              </div>
              <span className="text-[10px] text-[#5B6573]">QA inspection</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <span className="text-[10px] text-[#1E6B3A] font-medium block">Dispatched</span>
              <div className="text-xl font-bold text-[#1E6B3A] mt-1">
                {metrics.statusCounts['Dispatched'] || 0}
              </div>
              <span className="text-[10px] text-[#5B6573]">With Delivery Challan</span>
            </div>

            <div className="p-3.5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <span className="text-[10px] text-[#17625C] font-medium block">Completed</span>
              <div className="text-xl font-bold text-[#17625C] mt-1">
                {metrics.statusCounts['Completed'] || 0}
              </div>
              <span className="text-[10px] text-[#5B6573]">Delivered &amp; closed</span>
            </div>

            <div className={`p-3.5 bg-white border rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${metrics.overdueCount > 0 ? 'border-[#F5C2BE] bg-[#FBE1DF]/40' : 'border-[#E2DFD8]'}`}>
              <span className="text-[10px] text-[#A32B22] font-semibold block">Overdue Alert</span>
              <div className="text-xl font-bold text-[#A32B22] mt-1">{metrics.overdueCount}</div>
              <span className="text-[10px] text-[#5B6573]">Past target date</span>
            </div>
          </div>

          {/* Machine Fleet Live Grid */}
          <div className="p-5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#1C2430] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#1F5FA8]" />
                  <span>Machinery Floor Status</span>
                </h3>
                <p className="text-xs text-[#5B6573] mt-0.5">
                  Fleet status: {metrics.machineSummary.available} Available, {metrics.machineSummary.busy} Busy, {metrics.machineSummary.breakdown} Breakdown
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {metrics.machineSummary.machines.map((m) => (
                <div
                  key={m.machineId}
                  className="p-3.5 bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-semibold text-[#1C2430]">{m.machineCode}</span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getMachineBadgeClass(m.status)}`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#1C2430]">{m.machineName}</div>
                  <div className="text-[11px] text-[#5B6573] mt-0.5">{m.type} Machining Center</div>

                  <div className="mt-2.5 pt-2 border-t border-[#E2DFD8] text-xs">
                    {m.activeJobId ? (
                      <div>
                        <span className="text-[10px] text-[#5B6573] block">Active Job:</span>
                        <span
                          onClick={() => onOpenTimeline(m.activeJobId)}
                          className="font-mono text-[#1F5FA8] font-semibold hover:underline cursor-pointer"
                        >
                          {m.activeJobId}
                        </span>
                        <div className="text-[11px] text-[#1C2430] truncate mt-0.5">{m.activePartName}</div>
                        <div className="text-[10px] text-[#5B6573] mt-0.5">Operator: {m.activeOperatorName}</div>
                      </div>
                    ) : (
                      <div className="text-[#5B6573] text-[11px] italic">Idle / Available</div>
                    )}
                  </div>

                  {/* Status Override */}
                  <div className="mt-2.5 pt-2 border-t border-[#E2DFD8] flex items-center justify-between text-xs">
                    <span className="text-[#5B6573] text-[10px]">Status:</span>
                    <select
                      value={m.status}
                      onChange={(e) => handleMachineStatusChange(m.machineId, e.target.value)}
                      className="bg-white border border-[#E2DFD8] text-[#1C2430] rounded-[4px] px-1.5 py-0.5 text-[11px]"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Breakdown">Breakdown</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Queue and Operators Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Active Production Queue */}
            <div className="p-5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-semibold text-[#1C2430] mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#1F5FA8]" />
                <span>Active Production Queue ({metrics.pendingJobs.length})</span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                {metrics.pendingJobs.map((p) => (
                  <div
                    key={p.jobId}
                    onClick={() => onOpenTimeline(p.jobId)}
                    className="p-2.5 rounded-[6px] bg-[#FAF9F6] hover:bg-[#F5F4F0] border border-[#E2DFD8] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#1F5FA8]">{p.jobId}</span>
                        <span className={`status-badge ${getStatusBadgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="font-medium text-[#1C2430] mt-0.5">{p.partName}</div>
                      <div className="text-[11px] text-[#5B6573]">
                        {p.clientName} • Qty: {p.quantity} • {p.material}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-[#5B6573] block text-[10px]">Deadline</span>
                      <span className="font-mono font-medium text-[#1C2430]">{p.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operator Workload */}
            <div className="p-5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-semibold text-[#1C2430] mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1F5FA8]" />
                <span>Operator Workload</span>
              </h3>
              <div className="space-y-2 text-xs">
                {metrics.operatorRows.map((op) => (
                  <div
                    key={op.userId}
                    className="p-2.5 rounded-[6px] bg-[#FAF9F6] border border-[#E2DFD8] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-[#1C2430]">{op.name}</div>
                      <div className="text-[11px] text-[#5B6573]">{op.contactNo}</div>
                    </div>
                    <div>
                      <span className="status-badge status-assigned">
                        {op.activeJobsCount} Active Jobs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE JOBS */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[6px] border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#5B6573]" />
              <input
                type="text"
                placeholder="Search by Job ID, part name, material, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-[#1C2430] placeholder-[#5B6573] focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#5B6573] shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Registered">Registered</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Inspection">Inspection</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="overflow-x-auto rounded-[6px] border border-[#E2DFD8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Part &amp; Specs</th>
                  <th>Client</th>
                  <th>Qty / Material</th>
                  <th>Machine &amp; Operator</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-[#5B6573] text-xs">
                      No matching job orders found
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((j) => (
                    <tr key={j.jobId}>
                      <td className="font-mono font-medium text-[#1F5FA8]">
                        {j.jobId}
                        {j.reworkCount > 0 && (
                          <span className="block text-[10px] text-[#A32B22] font-sans font-medium">
                            Rework #{j.reworkCount}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-[#1C2430]">{j.partName}</div>
                        <div className="text-[11px] text-[#5B6573] line-clamp-1">{j.specification}</div>
                      </td>
                      <td className="text-[#1C2430]">
                        {j.clientName}
                      </td>
                      <td>
                        <div className="font-mono font-medium text-[#1C2430]">{j.quantity} Nos.</div>
                        <div className="text-[11px] text-[#5B6573]">{j.material}</div>
                      </td>
                      <td>
                        {j.machineCode ? (
                          <div>
                            <span className="font-mono font-medium text-[#1C2430]">{j.machineCode}</span>
                            <div className="text-[11px] text-[#5B6573]">{j.operatorName}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#5B6573] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="font-mono text-[#1C2430]">
                        {j.deadline}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(j.status)}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Timeline Button */}
                          <button
                            onClick={() => onOpenTimeline(j.jobId)}
                            className="p-1 rounded-[4px] bg-[#F5F4F0] hover:bg-[#EAE8E3] text-[#1F5FA8] border border-[#E2DFD8] transition-colors cursor-pointer"
                            title="View Lifecycle Timeline"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* Assign / Reassign Button */}
                          {['Registered', 'Assigned', 'In Progress', 'Inspection'].includes(j.status) && (
                            <button
                              onClick={() => setAssignModalJob(j)}
                              className="px-2 py-0.5 rounded-[4px] bg-[#E3EEF9] hover:bg-[#D5E6F5] text-[#1F5FA8] text-[11px] font-medium transition-colors cursor-pointer"
                              title="Assign or Reassign"
                            >
                              {j.status === 'Registered' ? 'Assign' : 'Reassign'}
                            </button>
                          )}

                          {/* Dispatch Button - Gated to Inspection */}
                          {j.status === 'Inspection' && (
                            <button
                              onClick={() => setDispatchModalJob(j)}
                              className="px-2 py-0.5 rounded-[4px] bg-[#DDF1E4] hover:bg-[#CCEADB] text-[#1E6B3A] text-[11px] font-medium transition-colors cursor-pointer"
                              title="Pass Inspection & Issue Delivery Challan"
                            >
                              Dispatch
                            </button>
                          )}

                          {/* View Challan Note */}
                          {(j.status === 'Dispatched' || j.status === 'Completed') && (
                            <button
                              onClick={() => onOpenChallan(j.jobId)}
                              className="p-1 rounded-[4px] bg-[#D8EEEC] hover:bg-[#C5E6E3] text-[#17625C] transition-colors cursor-pointer"
                              title="Print Delivery Challan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Complete Job Button */}
                          {j.status === 'Dispatched' && (
                            <button
                              onClick={() => handleCompleteJob(j.jobId)}
                              className="px-2 py-0.5 rounded-[4px] bg-[#D8EEEC] hover:bg-[#C5E6E3] text-[#17625C] text-[11px] font-medium transition-colors cursor-pointer"
                              title="Confirm Delivery & Close Job"
                            >
                              Complete
                            </button>
                          )}

                          {/* Delete if Registered */}
                          {j.status === 'Registered' && (
                            <button
                              onClick={() => handleDeleteJob(j.jobId)}
                              className="p-1 rounded-[4px] bg-[#FBE1DF] hover:bg-[#F5C2BE] text-[#A32B22] transition-colors cursor-pointer"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY & REPORTS */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 rounded-[6px] border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-[#5B6573] mb-1">Filter by Client</label>
              <input
                type="text"
                placeholder="e.g. Larsen, Reliance"
                value={historyClient}
                onChange={(e) => setHistoryClient(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5B6573] mb-1">Filter by Status</label>
              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed Only</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Progress">In Progress</option>
                <option value="Inspection">Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5B6573] mb-1">Search Keywords</label>
              <input
                type="text"
                placeholder="Search part, material..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5B6573] mb-1">From Date</label>
              <input
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#5B6573] mb-1">To Date</label>
              <input
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-[6px] border border-[#E2DFD8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Client</th>
                  <th>Part Name</th>
                  <th>Quantity</th>
                  <th>Challan No</th>
                  <th>Dispatch Date</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {historyJobs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-6 text-center text-[#5B6573] text-xs">
                      No matching historical records found
                    </td>
                  </tr>
                ) : (
                  historyJobs.map((h) => (
                    <tr key={h.jobId}>
                      <td className="font-mono font-medium text-[#1F5FA8]">{h.jobId}</td>
                      <td className="text-[#1C2430]">{h.clientName}</td>
                      <td className="text-[#1C2430]">{h.partName}</td>
                      <td className="font-mono">{h.quantity} Nos</td>
                      <td className="font-mono text-[#1E6B3A]">{h.deliveryChallanNo || '—'}</td>
                      <td className="font-mono text-[#5B6573]">{h.dispatchDate || '—'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(h.status)}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenTimeline(h.jobId)}
                            className="p-1 rounded-[4px] bg-[#F5F4F0] hover:bg-[#EAE8E3] text-[#1F5FA8] border border-[#E2DFD8] transition-colors"
                            title="View History Timeline"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          {h.deliveryChallanNo && (
                            <button
                              onClick={() => onOpenChallan(h.jobId)}
                              className="p-1 rounded-[4px] bg-[#D8EEEC] hover:bg-[#C5E6E3] text-[#17625C] transition-colors"
                              title="Print Challan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MACHINERY FLEET */}
      {activeTab === 'machines' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map((m) => (
            <div key={m.machineId} className="p-4 rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-[#1C2430]">{m.machineCode}</span>
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getMachineBadgeClass(m.status)}`}>
                  {m.status}
                </span>
              </div>
              <h3 className="text-xs font-semibold text-[#1C2430]">{m.machineName}</h3>
              <p className="text-[11px] text-[#5B6573] mt-1 leading-relaxed">{m.specifications}</p>
              <div className="mt-3 pt-2 border-t border-[#E2DFD8] text-[10px] flex justify-between text-[#5B6573]">
                <span>Last Maintained:</span>
                <span className="font-mono text-[#1C2430]">{m.lastMaintained}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: OPERATORS */}
      {activeTab === 'operators' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {operators.map((op) => (
            <div key={op.userId} className="p-4 rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8] flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#1C2430]">{op.name}</h3>
                  <p className="text-[11px] text-[#5B6573]">{op.contactNo}</p>
                </div>
              </div>
              <div className="mt-2.5 p-2 rounded-[4px] bg-[#FAF9F6] border border-[#E2DFD8] text-xs flex justify-between items-center">
                <span className="text-[#5B6573]">Assigned Jobs:</span>
                <span className="font-mono font-semibold text-[#1F5FA8]">{op.activeJobCount || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: CLIENTS */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div key={c.clientId} className="p-4 rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#1C2430]">{c.name}</h3>
                  <p className="text-[11px] text-[#5B6573]">Contact: {c.contactNo}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#5B6573] mt-1">{c.address}</p>
              {c.gstNo && (
                <div className="mt-1.5 text-[10px] font-mono text-[#5B6573]">
                  GSTIN: {c.gstNo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RegisterJobModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        clients={clients}
        onJobCreated={(newJob) => {
          loadData();
          onOpenTimeline(newJob.jobId);
        }}
      />

      <AssignJobModal
        isOpen={!!assignModalJob}
        job={assignModalJob}
        machines={machines}
        operators={operators}
        onClose={() => setAssignModalJob(null)}
        onAssigned={() => {
          loadData();
        }}
      />

      <DispatchModal
        isOpen={!!dispatchModalJob}
        job={dispatchModalJob}
        onClose={() => setDispatchModalJob(null)}
        onDispatched={(res) => {
          loadData();
          if (onOpenChallan) {
            onOpenChallan(res.jobId);
          }
        }}
      />
    </div>
  );
}
