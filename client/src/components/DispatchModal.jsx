import React, { useState } from 'react';
import { X, Truck, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function DispatchModal({ isOpen, job, onClose, onDispatched }) {
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryChallanNo, setDeliveryChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('GJ-05-BX-4412 (Tata Ace)');
  const [notes, setNotes] = useState('100% Quality Inspection Passed. Dispatched in wooden crates.');
  const [receivedBy, setReceivedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await api.dispatchJob({
        jobId: job.jobId,
        dispatchDate,
        deliveryChallanNo: deliveryChallanNo.trim() || undefined,
        vehicleNo: vehicleNo.trim(),
        notes: notes.trim(),
        receivedBy: receivedBy.trim()
      });
      onDispatched(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Dispatch failed');
    } finally {
      setLoading(false);
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
          <div className="p-2 rounded-[6px] bg-[#DDF1E4] text-[#1E6B3A]">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C2430]">Quality Signoff &amp; Dispatch</h2>
            <p className="text-xs text-[#5B6573]">
              Generate Delivery Challan for Job <span className="font-mono text-[#1F5FA8] font-semibold">{job.jobId}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[#A32B22] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4 p-3 rounded-[6px] bg-[#F5F4F0] border border-[#E2DFD8] text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#5B6573]">Part Name:</span>
            <span className="font-semibold text-[#1C2430]">{job.partName}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#5B6573]">Client:</span>
            <span className="font-semibold text-[#1C2430]">{job.clientName}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#5B6573]">Batch Quantity:</span>
            <span className="font-semibold text-[#1C2430] font-mono">{job.quantity} Units</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#5B6573]">Machined On:</span>
            <span className="font-medium text-[#1C2430]">{job.machineCode || 'CNC/VMC'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Dispatch Date *</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Delivery Challan No</label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={deliveryChallanNo}
                onChange={(e) => setDeliveryChallanNo(e.target.value)}
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Vehicle / Transporter Details *</label>
            <input
              type="text"
              placeholder="e.g. GJ-05-BX-4412 (Tata 407) / Hand Delivery"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              required
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Consignee Receiving Contact / Dept</label>
            <input
              type="text"
              placeholder="e.g. Inward Stores / Mr. Patel"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-[#1C2430] mb-1">Inspection Signoff &amp; Dispatch Remarks</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] p-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-[6px] bg-[#DDF1E4] border border-[#C6E6D0] text-[11px] text-[#1E6B3A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Dispatching releases machine <strong>{job.machineCode}</strong> back to "Available".</span>
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
                <span>Processing...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Issue Challan &amp; Dispatch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
