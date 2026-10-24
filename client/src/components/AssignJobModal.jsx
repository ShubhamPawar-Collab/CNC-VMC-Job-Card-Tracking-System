import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Check, AlertCircle, Cpu } from 'lucide-react';
import { api } from '../api';

export default function AssignJobModal({ isOpen, job, onClose, onAssigned, machines = [], operators = [] }) {
  const [machineId, setMachineId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      if (job.machineId) setMachineId(String(job.machineId));
      else {
        const firstAvail = machines.find(m => m.status === 'Available');
        if (firstAvail) setMachineId(String(firstAvail.machineId));
        else if (machines[0]) setMachineId(String(machines[0].machineId));
      }

      if (job.operatorId) setOperatorId(String(job.operatorId));
      else if (operators[0]) setOperatorId(String(operators[0].userId));

      setNotes(job.status === 'Assigned' || job.status === 'In Progress' ? 'Reassignment requested' : '');
    }
  }, [job, machines, operators]);

  if (!isOpen || !job) return null;

  const selectedMachine = machines.find(m => String(m.machineId) === String(machineId));
  const isMachineUnavailable = selectedMachine && selectedMachine.status !== 'Available' && selectedMachine.machineId !== job.machineId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!machineId) {
      setError('Please select a target machine');
      return;
    }
    if (!operatorId) {
      setError('Please select a shop floor operator');
      return;
    }

    try {
      setLoading(true);
      const res = await api.assignJob({
        jobId: job.jobId,
        machineId: Number(machineId),
        operatorId: Number(operatorId),
        notes: notes.trim()
      });
      onAssigned(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign job');
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg p-6 my-8 text-[#1C2430]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-[4px] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2DFD8] mb-4">
          <div className="p-2 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C2430]">
              {job.status === 'Registered' ? 'Machine & Operator Assignment' : 'Job Reassignment'}
            </h2>
            <p className="text-xs text-[#5B6573]">
              Job <span className="font-mono text-[#1F5FA8] font-semibold">{job.jobId}</span> — {job.partName}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[#A32B22] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Machine Selection */}
          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Select CNC / VMC Machine *</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {machines.map((m) => {
                const isSelected = String(m.machineId) === String(machineId);
                const isCurrent = m.machineId === job.machineId;

                return (
                  <div
                    key={m.machineId}
                    onClick={() => setMachineId(String(m.machineId))}
                    className={`p-2.5 rounded-[6px] border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1F5FA8] bg-[#E3EEF9]'
                        : 'border-[#E2DFD8] bg-[#FAF9F6] hover:bg-[#F5F4F0]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#1C2430]">{m.machineCode}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#E6EAF0] text-[#3E4C5E] font-medium">
                          {m.type}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#E3EEF9] text-[#1F5FA8] font-medium">
                            Current Machine
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5B6573] mt-0.5">{m.machineName}</div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getMachineBadgeClass(m.status)}`}>
                        {m.status}
                      </span>
                      {m.activeJobId && (
                        <div className="text-[10px] text-[#5B6573] font-mono mt-0.5">
                          {m.activeJobId}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Machine Warning banner if unavailable */}
            {isMachineUnavailable && (
              <div className="mt-2 p-2.5 rounded-[6px] bg-[#FCEFD6] border border-[#F5E2B8] text-[#8A5A00] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#8A5A00]" />
                <span>
                  <strong>Machine Busy / Unavailable:</strong> {selectedMachine.machineName} is currently {selectedMachine.status}. Assigning to a busy machine will be rejected.
                </span>
              </div>
            )}
          </div>

          {/* Operator Selection */}
          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Assign Operator *</label>
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
            >
              {operators.map((op) => (
                <option key={op.userId} value={op.userId}>
                  {op.name} ({op.contactNo}) — Active Jobs: {op.activeJobCount || 0}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Assignment / Setup Instructions</label>
            <input
              type="text"
              placeholder="e.g. Set carbide inserts for high-speed finishing, check bore tolerances."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E2DFD8] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[6px] bg-white border border-[#E2DFD8] text-[#1C2430] hover:bg-[#F5F4F0] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Assigning...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
