import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Play,
  CheckCircle,
  AlertOctagon,
  Clock,
  Layers,
  RotateCcw,
  ExternalLink,
  X
} from 'lucide-react';
import { api } from '../api';

export default function OperatorPortal({ user, onOpenTimeline }) {
  const [jobs, setJobs] = useState([]);
  const [breakdownModalJob, setBreakdownModalJob] = useState(null);
  const [breakdownReason, setBreakdownReason] = useState('Tool shatter / insert breakage');
  const [customBreakdown, setCustomBreakdown] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadOperatorJobs = async () => {
    try {
      const data = await api.getJobs();
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to load operator jobs:', err);
    }
  };

  useEffect(() => {
    loadOperatorJobs();
  }, []);

  const handleUpdateStatus = async (jobId, newStatus, defaultRemarks) => {
    const remarks = window.prompt(`Enter status update remarks for ${newStatus}:`, defaultRemarks);
    if (remarks === null) return;

    try {
      setSubmitting(true);
      await api.updateJobStatus(jobId, newStatus, remarks);
      setActionMessage(`Job ${jobId} successfully updated to '${newStatus}'`);
      setTimeout(() => setActionMessage(''), 4000);
      loadOperatorJobs();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportBreakdown = async (e) => {
    e.preventDefault();
    if (!breakdownModalJob) return;

    const finalReason = breakdownReason === 'Other' ? customBreakdown : breakdownReason;
    if (!finalReason.trim()) {
      alert('Please provide breakdown fault details');
      return;
    }

    try {
      setSubmitting(true);
      await api.reportBreakdown(
        breakdownModalJob.machineId,
        breakdownModalJob.jobId,
        finalReason
      );
      alert(`Machine breakdown reported. Admin notified immediately.`);
      setBreakdownModalJob(null);
      loadOperatorJobs();
    } catch (err) {
      alert(`Failed to report breakdown: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

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
      default:
        return 'status-registered';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 text-[#1C2430]">
      {/* Operator Header */}
      <div className="p-5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8] flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C2430]">
              Shop Floor Operator Terminal
            </h1>
            <p className="text-xs text-[#5B6573] mt-0.5">
              Operator: <strong className="text-[#1C2430]">{user?.name || 'Ramesh Patel'}</strong> • Active Assigned Jobs
            </p>
          </div>
        </div>

        <button
          onClick={loadOperatorJobs}
          className="px-3.5 py-1.5 rounded-[6px] bg-white hover:bg-[#F5F4F0] border border-[#E2DFD8] text-xs font-medium text-[#1C2430] transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh Jobs
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-[6px] bg-[#DDF1E4] border border-[#C6E6D0] text-[#1E6B3A] text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Assigned Jobs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1C2430] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1F5FA8]" />
            <span>My Active Machining Orders ({jobs.length})</span>
          </h2>
          <span className="text-xs text-[#5B6573]">Touch-Friendly Shop Floor Interface</span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <CheckCircle className="w-8 h-8 text-[#1E6B3A] mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[#1C2430]">No active jobs assigned to you right now</h3>
            <p className="text-xs text-[#5B6573] mt-1">Check back once the administrator assigns fresh job orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const isAssigned = job.status === 'Assigned';
              const isInProgress = job.status === 'In Progress';
              const isInspection = job.status === 'Inspection';
              const hasRework = job.reworkCount > 0;

              return (
                <div
                  key={job.jobId}
                  className="p-5 rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between"
                >
                  <div>
                    {/* Top Bar with Job ID and Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-[#1F5FA8]">{job.jobId}</span>
                        <span className={`status-badge ${getStatusBadgeClass(job.status)}`}>
                          {job.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {job.drawingPath && (
                          <a
                            href={job.drawingPath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-[4px] bg-[#F5F4F0] text-[#1F5FA8] hover:bg-[#EAE8E3] border border-[#E2DFD8] text-xs"
                            title="Open CAD Drawing"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => onOpenTimeline(job.jobId)}
                          className="p-1.5 rounded-[4px] bg-[#F5F4F0] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#EAE8E3] border border-[#E2DFD8] text-xs cursor-pointer"
                          title="View Full Timeline"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Part Title & Customer */}
                    <h3 className="text-sm font-semibold text-[#1C2430]">{job.partName}</h3>
                    <div className="text-xs text-[#5B6573] mt-0.5">
                      Customer: <span className="text-[#1C2430] font-medium">{job.clientName}</span>
                    </div>

                    {/* Rework Alert Banner */}
                    {hasRework && (
                      <div className="my-2.5 p-2.5 rounded-[6px] bg-[#EDE5F5] border border-[#D9CBE8] text-[#5B3D86] text-xs">
                        <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                          <RotateCcw className="w-3.5 h-3.5 text-[#5B3D86]" />
                          <span>Rework Required (Pass #{job.reworkCount})</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {job.inspectionNotes || 'Dimensional variance detected during inspection. Please adjust tooling offsets.'}
                        </p>
                      </div>
                    )}

                    {/* Machine & Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-[6px] bg-[#F5F4F0] border border-[#E2DFD8] text-xs">
                      <div>
                        <span className="text-[#5B6573] text-[10px] block">Machining Unit</span>
                        <span className="font-mono text-[#1C2430] font-semibold">{job.machineCode || 'Assigned Machine'}</span>
                        <div className="text-[10px] text-[#5B6573] truncate">{job.machineName}</div>
                      </div>
                      <div>
                        <span className="text-[#5B6573] text-[10px] block">Batch Quantity</span>
                        <span className="font-mono text-[#1C2430] font-semibold">{job.quantity} Units</span>
                      </div>
                      <div>
                        <span className="text-[#5B6573] text-[10px] block">Material Grade</span>
                        <span className="font-medium text-[#1C2430]">{job.material}</span>
                      </div>
                      <div>
                        <span className="text-[#5B6573] text-[10px] block">Target Deadline</span>
                        <span className="font-mono text-[#1C2430] font-semibold">{job.deadline}</span>
                      </div>
                    </div>

                    {job.specification && (
                      <div className="mb-3 text-xs text-[#5B6573] bg-[#FAF9F6] p-2 rounded-[4px] border border-[#E2DFD8] line-clamp-2">
                        {job.specification}
                      </div>
                    )}
                  </div>

                  {/* Big Touch Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-[#E2DFD8]">
                    {isAssigned && (
                      <button
                        onClick={() => handleUpdateStatus(job.jobId, 'In Progress', 'Workpiece clamped, spindle rpm set, roughing pass initiated.')}
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Machining Operation</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        onClick={() => handleUpdateStatus(job.jobId, 'Inspection', 'Batch machining complete. Deburred and submitted for Quality Inspection.')}
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Finish Machining &amp; Send to QA Inspection</span>
                      </button>
                    )}

                    {isInspection && (
                      <div className="py-2.5 px-3 rounded-[6px] bg-[#EDE5F5] border border-[#D9CBE8] text-center text-xs text-[#5B3D86] font-medium">
                        Awaiting Quality Control Dimensional Signoff by Admin
                      </div>
                    )}

                    {/* Report Machine Breakdown Button */}
                    <button
                      onClick={() => setBreakdownModalJob(job)}
                      className="w-full py-2.5 px-3 rounded-[6px] bg-[#FBE1DF] hover:bg-[#F5C2BE] border border-[#F5C2BE] text-[#A32B22] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Report Machine Breakdown / Tool Fault</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Machine Breakdown Modal */}
      {breakdownModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="relative w-full max-w-md bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg p-6 text-[#1C2430]">
            <button
              onClick={() => setBreakdownModalJob(null)}
              className="absolute top-4 right-4 p-1 rounded-[4px] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-[6px] bg-[#FBE1DF] text-[#A32B22]">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C2430]">Report Machine Breakdown</h3>
                <p className="text-xs text-[#5B6573] font-mono">
                  Machine: {breakdownModalJob.machineCode} • Job: {breakdownModalJob.jobId}
                </p>
              </div>
            </div>

            <form onSubmit={handleReportBreakdown} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#1C2430] mb-1">Incident Type</label>
                <select
                  value={breakdownReason}
                  onChange={(e) => setBreakdownReason(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD8] rounded-[6px] p-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
                >
                  <option value="Tool shatter / insert breakage">Tool shatter / insert breakage</option>
                  <option value="Axis Servo Alarm / Drive Trip">Axis Servo Alarm / Drive Trip</option>
                  <option value="Hydraulic Chuck Pressure Drop">Hydraulic Chuck Pressure Drop</option>
                  <option value="Spindle Chattering / Overheating">Spindle Chattering / Overheating</option>
                  <option value="Coolant Pump Failure">Coolant Pump Failure</option>
                  <option value="Other">Other (Specify Below)</option>
                </select>
              </div>

              {breakdownReason === 'Other' && (
                <div>
                  <label className="block font-medium text-[#1C2430] mb-1">Describe Incident Details</label>
                  <textarea
                    rows="3"
                    value={customBreakdown}
                    onChange={(e) => setCustomBreakdown(e.target.value)}
                    required
                    placeholder="Provide details for the maintenance engineer..."
                    className="w-full bg-white border border-[#E2DFD8] rounded-[6px] p-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
                  />
                </div>
              )}

              <div className="p-2.5 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[11px] text-[#A32B22]">
                Reporting flags machine status as <strong>Breakdown</strong> and alerts Admin immediately.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBreakdownModalJob(null)}
                  className="px-3 py-1.5 rounded-[6px] bg-white border border-[#E2DFD8] text-[#1C2430] text-xs font-medium hover:bg-[#F5F4F0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-[6px] bg-[#A32B22] hover:bg-[#85231B] text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Submit Breakdown Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
