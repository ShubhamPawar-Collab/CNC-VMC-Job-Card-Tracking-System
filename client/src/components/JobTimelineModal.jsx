import React from 'react';
import {
  X,
  Clock,
  CheckCircle,
  ExternalLink,
  Printer
} from 'lucide-react';

const STEPS = ['Registered', 'Assigned', 'In Progress', 'Inspection', 'Dispatched', 'Completed'];

export default function JobTimelineModal({ trackingData, onClose, onOpenChallan }) {
  if (!trackingData) return null;

  const { job, assignment, statusHistory, dispatchNote } = trackingData;

  const currentStepIdx = STEPS.indexOf(job.status);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg p-6 sm:p-7 my-8 text-[#1C2430]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-[4px] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DFD8]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-lg font-bold text-[#1F5FA8]">{job.jobId}</span>
              <span className={`status-badge ${getStatusBadgeClass(job.status)}`}>
                {job.status}
              </span>
              {job.reworkCount > 0 && (
                <span className="status-badge status-breakdown">
                  Rework: {job.reworkCount}x
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-[#1C2430] mt-1">{job.partName}</h2>
            <p className="text-xs text-[#5B6573]">Client: <span className="text-[#1C2430] font-medium">{job.clientName}</span></p>
          </div>

          <div className="flex items-center gap-2">
            {dispatchNote && onOpenChallan && (
              <button
                onClick={() => onOpenChallan(job.jobId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#D8EEEC] hover:bg-[#C5E6E3] text-[#17625C] text-xs font-medium transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View Challan</span>
              </button>
            )}
            {job.drawingPath && (
              <a
                href={job.drawingPath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#F5F4F0] hover:bg-[#EAE8E3] text-[#1F5FA8] border border-[#E2DFD8] text-xs font-medium transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Part Drawing</span>
              </a>
            )}
          </div>
        </div>

        {/* Horizontal Lifecycle Stepper */}
        <div className="py-5 border-b border-[#E2DFD8]">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-[#E2DFD8] z-0"></div>
            <div
              className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-[#1F5FA8] transition-all duration-300 z-0"
              style={{ width: `${Math.max(0, (currentStepIdx / (STEPS.length - 1)) * 100)}%` }}
            ></div>

            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isPast
                        ? 'bg-[#1F5FA8] text-white'
                        : isCurrent
                        ? 'bg-[#1F5FA8] text-white ring-4 ring-[#E3EEF9]'
                        : 'bg-white text-[#5B6573] border border-[#E2DFD8]'
                    }`}
                  >
                    {isPast ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-medium text-center hidden sm:block ${
                      isCurrent ? 'text-[#1F5FA8] font-semibold' : isPast ? 'text-[#1C2430]' : 'text-[#5B6573]'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specifications & Assignment Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-[6px] bg-[#F5F4F0] border border-[#E2DFD8] text-xs">
          <div>
            <span className="text-[#5B6573] text-[10px] block">Quantity</span>
            <span className="font-semibold text-[#1C2430] font-mono">{job.quantity} Units</span>
          </div>
          <div>
            <span className="text-[#5B6573] text-[10px] block">Material</span>
            <span className="font-semibold text-[#1C2430]">{job.material}</span>
          </div>
          <div>
            <span className="text-[#5B6573] text-[10px] block">Target Deadline</span>
            <span className="font-mono text-[#1C2430] font-semibold">{job.deadline}</span>
          </div>
          <div>
            <span className="text-[#5B6573] text-[10px] block">Machine / Operator</span>
            <span className="font-semibold text-[#1C2430]">
              {assignment ? `${assignment.machineCode} (${assignment.operatorName})` : 'Unassigned'}
            </span>
          </div>
        </div>

        {job.specification && (
          <div className="mb-5 p-2.5 rounded-[6px] bg-[#FAF9F6] border border-[#E2DFD8] text-xs">
            <span className="text-[10px] font-medium text-[#5B6573] block mb-0.5">Technical Specification:</span>
            <p className="text-[#1C2430] text-[11px] leading-relaxed">{job.specification}</p>
          </div>
        )}

        {/* Vertical Audit Trail Timeline */}
        <h3 className="text-xs font-semibold text-[#1C2430] mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#1F5FA8]" />
          <span>Audit Trail &amp; Status History</span>
        </h3>

        <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2DFD8] max-h-72 overflow-y-auto pr-2">
          {statusHistory && statusHistory.map((item, index) => {
            const isRework = item.remarks && item.remarks.includes('[REWORK');
            const isBreakdown = item.remarks && item.remarks.includes('[MACHINE BREAKDOWN');

            return (
              <div key={item.logId || index} className="relative text-left">
                {/* Node dot */}
                <div
                  className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 ${
                    isBreakdown
                      ? 'bg-[#A32B22] border-white ring-1 ring-[#FBE1DF]'
                      : isRework
                      ? 'bg-[#5B3D86] border-white ring-1 ring-[#EDE5F5]'
                      : 'bg-[#1F5FA8] border-white ring-1 ring-[#E3EEF9]'
                  }`}
                ></div>

                <div className={`p-2.5 rounded-[6px] border text-xs ${
                  isBreakdown
                    ? 'bg-[#FBE1DF] border-[#F5C2BE] text-[#A32B22]'
                    : isRework
                    ? 'bg-[#EDE5F5] border-[#D9CBE8] text-[#5B3D86]'
                    : 'bg-[#FAF9F6] border-[#E2DFD8] text-[#1C2430]'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="font-medium text-[#1C2430]">{item.updatedBy}</span>
                    </div>
                    <span className="text-[10px] text-[#5B6573] font-mono">{item.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#5B6573]">{item.remarks}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
