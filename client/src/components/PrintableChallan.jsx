import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';

export default function PrintableChallan({ note, onClose }) {
  if (!note) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-[#E2DFD8] rounded-[6px] shadow-lg p-6 sm:p-8 my-8 text-[#1C2430]">
        {/* Modal Controls (No print) */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD8] mb-6 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1F5FA8]" />
            <span className="font-semibold text-sm text-[#1C2430]">Official Delivery Challan &amp; Dispatch Note</span>
            <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[#DDF1E4] text-[#1E6B3A] font-semibold">
              Passed QA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#5B6573] hover:text-[#1C2430] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="printable-challan bg-white text-[#1C2430] p-8 sm:p-10 rounded-[6px] border border-[#E2DFD8] font-sans text-xs sm:text-sm shadow-sm">
          {/* Header */}
          <div className="border-b-2 border-[#1F2A37] pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-wider text-[#1C2430]">
                  TRIANGLE ENGINEERING
                </span>
              </div>
              <p className="text-xs font-medium text-[#5B6573] tracking-wide uppercase mt-0.5">
                Precision CNC Turning &amp; Vertical Machining Center (VMC) Specialists
              </p>
              <p className="text-[11px] text-[#5B6573] mt-1 leading-relaxed">
                Plot No. 1420/B, Road No. 14, Sachin G.I.D.C., Surat – 394230, Gujarat, India<br />
                <strong>GSTIN:</strong> 24AAACT1940E1Z9 | <strong>Contact:</strong> +91 99047 73848 | <strong>Email:</strong> works@triangle-eng.com
              </p>
            </div>
            <div className="text-right sm:border-l-2 sm:border-[#E2DFD8] sm:pl-6">
              <span className="inline-block px-3 py-1 bg-[#1F2A37] text-white font-bold text-xs uppercase tracking-wider rounded-[4px] mb-1">
                DELIVERY CHALLAN
              </span>
              <div className="font-mono text-sm font-bold text-[#1C2430] mt-1">
                #{note.deliveryChallanNo}
              </div>
              <div className="text-[11px] text-[#5B6573] mt-0.5">
                <strong>Date:</strong> {note.dispatchDate}
              </div>
              <div className="text-[11px] text-[#5B6573]">
                <strong>Job Order:</strong> <span className="font-mono font-bold text-[#1C2430]">{note.jobId}</span>
              </div>
            </div>
          </div>

          {/* Consignee / Transport Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#E2DFD8] rounded-[6px] p-4 mb-6 bg-[#F5F4F0]/60">
            <div>
              <div className="text-[10px] font-bold text-[#5B6573] uppercase tracking-wider mb-1">
                CONSIGNEE / CLIENT DETAILS:
              </div>
              <div className="font-bold text-sm text-[#1C2430]">{note.clientName}</div>
              <div className="text-xs text-[#5B6573] mt-0.5">{note.clientAddress}</div>
              <div className="text-xs text-[#5B6573] mt-1">
                <strong>Contact:</strong> {note.clientContact}
              </div>
              {note.clientGst && (
                <div className="text-xs text-[#5B6573] font-mono">
                  <strong>GSTIN:</strong> {note.clientGst}
                </div>
              )}
            </div>

            <div className="sm:border-l sm:border-[#E2DFD8] sm:pl-4">
              <div className="text-[10px] font-bold text-[#5B6573] uppercase tracking-wider mb-1">
                DISPATCH &amp; TRANSPORT DETAILS:
              </div>
              <div className="text-xs text-[#1C2430]">
                <strong>Vehicle / Transporter:</strong> {note.vehicleNo || 'Local Dispatch / Handover'}
              </div>
              <div className="text-xs text-[#1C2430] mt-1">
                <strong>Dispatched By:</strong> {note.dispatchedBy || 'Mr. Dhaval Prajapati (Admin)'}
              </div>
              <div className="text-xs text-[#1C2430] mt-1">
                <strong>Machined On:</strong> {note.machineCode} ({note.machineName})
              </div>
              <div className="text-xs text-[#1C2430] mt-1">
                <strong>CNC Operator:</strong> {note.operatorName || 'Precision Machining Team'}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full border-collapse border border-[#E2DFD8] mb-6 text-xs">
            <thead>
              <tr className="bg-[#EAE8E3] text-[#1C2430]">
                <th className="border border-[#E2DFD8] p-2 text-center w-12 font-semibold">SR.</th>
                <th className="border border-[#E2DFD8] p-2 text-left font-semibold">PART DESCRIPTION &amp; SPECIFICATION</th>
                <th className="border border-[#E2DFD8] p-2 text-left w-32 font-semibold">MATERIAL</th>
                <th className="border border-[#E2DFD8] p-2 text-center w-24 font-semibold">QTY DISPATCHED</th>
                <th className="border border-[#E2DFD8] p-2 text-center w-28 font-semibold">QA STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[#E2DFD8] p-3 text-center font-bold">1</td>
                <td className="border border-[#E2DFD8] p-3">
                  <div className="font-bold text-[#1C2430] text-sm">{note.partName}</div>
                  <div className="text-[11px] text-[#5B6573] mt-0.5">{note.specification || 'As per engineering drawings'}</div>
                  <div className="text-[10px] font-mono text-[#5B6573] mt-1">Ref Job ID: {note.jobId}</div>
                </td>
                <td className="border border-[#E2DFD8] p-3 font-semibold text-[#1C2430]">
                  {note.material}
                </td>
                <td className="border border-[#E2DFD8] p-3 text-center font-mono font-bold text-base text-[#1C2430]">
                  {note.quantity} Nos.
                </td>
                <td className="border border-[#E2DFD8] p-3 text-center">
                  <span className="inline-block px-2.5 py-0.5 bg-[#DDF1E4] text-[#1E6B3A] font-semibold text-[11px] rounded-[4px]">
                    PASSED QA
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes and Quality Declaration */}
          <div className="p-3 bg-[#F5F4F0] border border-[#E2DFD8] rounded-[6px] mb-8 text-[11px] text-[#5B6573]">
            <strong className="text-[#1C2430]">Quality &amp; Inspection Declaration:</strong> Certified that the parts listed above have been machined on precision CNC/VMC equipment, verified with calibrated micrometers and bore gauges, and conform 100% to approved customer drawings and specifications.
            {note.notes && <div className="mt-1 font-semibold text-[#1C2430]">Special Notes: {note.notes}</div>}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center border-t border-[#E2DFD8] text-xs">
            <div>
              <div className="font-bold text-[#1C2430]">Quality Inspector</div>
              <div className="text-[10px] text-[#5B6573]">Sign &amp; Stamp</div>
            </div>
            <div>
              <div className="font-bold text-[#1C2430]">For TRIANGLE ENGINEERING</div>
              <div className="text-[10px] text-[#5B6573]">Authorized Signatory</div>
            </div>
            <div>
              <div className="font-bold text-[#1C2430]">Receiver's Acknowledgement</div>
              <div className="text-[10px] text-[#5B6573]">Received in Good Condition</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
