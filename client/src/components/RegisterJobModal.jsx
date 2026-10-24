import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Upload, Check, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function RegisterJobModal({ isOpen, onClose, onJobCreated, clients = [] }) {
  const [clientId, setClientId] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    contactNo: '',
    address: 'Sachin GIDC, Surat',
    email: '',
    gstNo: ''
  });

  const [partName, setPartName] = useState('');
  const [specification, setSpecification] = useState('');
  const [quantity, setQuantity] = useState(20);
  const [material, setMaterial] = useState('SS-304 Stainless Steel');
  const [deadline, setDeadline] = useState('');
  const [drawingFile, setDrawingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clients.length > 0 && !clientId) {
      setClientId(clients[0].clientId);
    }
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDeadline(d.toISOString().split('T')[0]);
  }, [clients]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!partName.trim()) {
      setError('Part name is required');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!deadline) {
      setError('Target deadline is required');
      return;
    }

    try {
      setSubmitting(true);
      let drawingPath = null;

      if (drawingFile) {
        setUploading(true);
        const uploadRes = await api.uploadDrawing(drawingFile);
        drawingPath = uploadRes.drawingPath;
        setUploading(false);
      }

      const payload = {
        partName: partName.trim(),
        specification: specification.trim(),
        quantity: Number(quantity),
        material: material.trim(),
        deadline,
        drawingPath
      };

      if (isNewClient) {
        payload.newClient = newClient;
      } else {
        payload.clientId = Number(clientId);
      }

      const res = await api.registerJob(payload);
      onJobCreated(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register job order');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg p-6 my-8 text-[#1C2430]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-[4px] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2DFD8] mb-4">
          <div className="p-2 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8]">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C2430]">Register New Job Order</h2>
            <p className="text-xs text-[#5B6573]">
              Generate digital manufacturing job card with sequential ID tracking
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[6px] bg-[#FBE1DF] border border-[#F5C2BE] text-[#A32B22] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Client Selection */}
          <div className="p-3 rounded-[6px] bg-[#FAF9F6] border border-[#E2DFD8]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-[#1C2430]">Customer / Client *</label>
              <button
                type="button"
                onClick={() => setIsNewClient(!isNewClient)}
                className="text-[#1F5FA8] hover:text-[#174A85] font-medium text-[11px] cursor-pointer"
              >
                {isNewClient ? '← Select Existing Client' : '+ Add New Client'}
              </button>
            </div>

            {!isNewClient ? (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.name} — {c.contactNo}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Company / Client Name *"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  required
                  className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Contact Phone No *"
                  value={newClient.contactNo}
                  onChange={(e) => setNewClient({ ...newClient, contactNo: e.target.value })}
                  required
                  className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Factory Address"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="GST Number (Optional)"
                  value={newClient.gstNo}
                  onChange={(e) => setNewClient({ ...newClient, gstNo: e.target.value })}
                  className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Part Name & Material */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Part / Component Name *</label>
              <input
                type="text"
                placeholder="e.g. Precision CNC Shaft 45mm"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Raw Material Grade *</label>
              <input
                type="text"
                placeholder="e.g. SS-304, EN-24, Aluminum 6061"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Batch Quantity (Nos) *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] font-mono font-medium focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#1C2430] mb-1">Completion Deadline *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full bg-white border border-[#E2DFD8] rounded-[6px] px-3 py-2 text-xs text-[#1C2430] font-mono focus:border-[#1F5FA8] focus:outline-none"
              />
            </div>
          </div>

          {/* Technical Specifications */}
          <div>
            <label className="block font-medium text-[#1C2430] mb-1">
              Technical Specifications &amp; Tolerances
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Bore 45H7 (+0.025/-0), Surface roughness Ra 0.8, Keyway 12mm width."
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              className="w-full bg-white border border-[#E2DFD8] rounded-[6px] p-2.5 text-[#1C2430] text-xs focus:border-[#1F5FA8] focus:outline-none"
            />
          </div>

          {/* File Upload for CAD drawing */}
          <div>
            <label className="block font-medium text-[#1C2430] mb-1">
              Part Drawing / Blueprint (PDF, PNG, JPG)
            </label>
            <div className="flex items-center gap-2.5 bg-[#FAF9F6] border border-dashed border-[#E2DFD8] rounded-[6px] p-2.5">
              <Upload className="w-4 h-4 text-[#1F5FA8] shrink-0" />
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setDrawingFile(e.target.files[0] || null)}
                className="text-xs text-[#5B6573] file:mr-2.5 file:py-1 file:px-2.5 file:rounded-[4px] file:border-0 file:text-xs file:font-medium file:bg-[#E3EEF9] file:text-[#1F5FA8] hover:file:bg-[#D5E6F5] cursor-pointer"
              />
            </div>
            {drawingFile && (
              <span className="text-[11px] text-[#1E6B3A] mt-1 inline-block">
                ✓ Ready to upload: {drawingFile.name} ({(drawingFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
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
              disabled={submitting}
              className="px-4 py-1.5 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <span>{uploading ? 'Uploading Drawing...' : 'Registering...'}</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Register Job Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
