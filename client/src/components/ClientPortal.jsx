import React, { useState, useEffect } from 'react';
import {
  Building2,
  Package,
  Search,
  Clock,
  Printer
} from 'lucide-react';
import { api } from '../api';

export default function ClientPortal({ user, onOpenTimeline, onOpenChallan }) {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const loadClientOrders = async () => {
    try {
      const data = await api.getJobs();
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load client orders:', err);
    }
  };

  useEffect(() => {
    loadClientOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
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
      default:
        return 'status-registered';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 text-[#1C2430]">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-[#E2DFD8] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#E3EEF9] text-[#1F5FA8] flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C2430]">
              Customer Order Tracking Portal
            </h1>
            <p className="text-xs text-[#5B6573] mt-0.5">
              Client Account: <strong className="text-[#1C2430]">{user?.name || user?.clientName || 'Larsen & Toubro Heavy Engineering'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadClientOrders}
          className="px-3.5 py-1.5 rounded-[6px] bg-white hover:bg-[#F5F4F0] border border-[#E2DFD8] text-xs font-medium text-[#1C2430] transition-colors cursor-pointer self-start sm:self-auto"
        >
          Refresh Orders
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[6px] border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#5B6573]" />
          <input
            type="text"
            placeholder="Search orders by Job ID, part name, material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF9F6] border border-[#E2DFD8] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-[#1C2430] placeholder-[#5B6573] focus:border-[#1F5FA8] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-[#E2DFD8] rounded-[6px] px-2.5 py-1.5 text-xs text-[#1C2430] focus:border-[#1F5FA8] focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="In Progress">In Machining</option>
            <option value="Inspection">Quality Inspection</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#1C2430] flex items-center gap-2">
          <Package className="w-4 h-4 text-[#1F5FA8]" />
          <span>My Manufacturing Orders ({filteredOrders.length})</span>
        </h2>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <Package className="w-8 h-8 text-[#5B6573] mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[#1C2430]">No matching orders found</h3>
            <p className="text-xs text-[#5B6573] mt-1">Check search query or status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((o) => (
              <div
                key={o.jobId}
                className="p-5 rounded-[6px] bg-white border border-[#E2DFD8] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-base font-bold text-[#1F5FA8]">{o.jobId}</span>
                    <span className={`status-badge ${getStatusBadgeClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#1C2430]">{o.partName}</h3>
                  <p className="text-xs text-[#5B6573] mt-1 line-clamp-2">{o.specification}</p>

                  <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-[6px] bg-[#F5F4F0] border border-[#E2DFD8] text-xs">
                    <div>
                      <span className="text-[#5B6573] text-[10px] block">Batch Quantity</span>
                      <span className="font-mono text-[#1C2430] font-semibold">{o.quantity} Units</span>
                    </div>
                    <div>
                      <span className="text-[#5B6573] text-[10px] block">Material Grade</span>
                      <span className="font-medium text-[#1C2430]">{o.material}</span>
                    </div>
                    <div>
                      <span className="text-[#5B6573] text-[10px] block">Target Deadline</span>
                      <span className="font-mono text-[#1C2430] font-semibold">{o.deadline}</span>
                    </div>
                    <div>
                      <span className="text-[#5B6573] text-[10px] block">Machining Unit</span>
                      <span className="font-mono text-[#1C2430]">{o.machineCode || 'Awaiting Setup'}</span>
                    </div>
                  </div>

                  {o.deliveryChallanNo && (
                    <div className="mb-3 p-2.5 rounded-[6px] bg-[#DDF1E4] border border-[#C6E6D0] text-xs text-[#1E6B3A] flex items-center justify-between">
                      <div>
                        <strong>Delivery Challan:</strong> #{o.deliveryChallanNo}
                      </div>
                      <span className="text-[10px] font-mono">{o.dispatchDate}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E2DFD8]">
                  <button
                    onClick={() => onOpenTimeline(o.jobId)}
                    className="flex-1 py-2 px-3 rounded-[6px] bg-[#1F5FA8] hover:bg-[#174A85] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Track Live Timeline</span>
                  </button>

                  {o.deliveryChallanNo && (
                    <button
                      onClick={() => onOpenChallan(o.jobId)}
                      className="py-2 px-3 rounded-[6px] bg-[#D8EEEC] hover:bg-[#C5E6E3] text-[#17625C] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Download / Print Delivery Challan"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Challan</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
