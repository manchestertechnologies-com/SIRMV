import React from 'react';
import { CreditCard, CheckCircle2, Download, Receipt, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FeeModule: React.FC = () => {
  const feeDetails = {
    totalFee: 85000,
    paidAmount: 65000,
    dueAmount: 20000,
    dueDate: 'October 15, 2026',
    transactions: [
      { id: 'TXN-001', term: 'Term 1 Tuition & Laboratory Fee', amount: 45000, date: '2026-06-15', status: 'PAID', mode: 'Online UPI' },
      { id: 'TXN-002', term: 'Term 2 Coaching & NEET Intensive', amount: 20000, date: '2026-08-10', status: 'PAID', mode: 'Net Banking' },
      { id: 'TXN-003', term: 'Term 3 Special Assessment & Library Fee', amount: 20000, date: 'Pending', status: 'DUE', mode: 'Pay Online' }
    ]
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ded9cf]">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>Academic Fee & Receipts Portal</span>
          </h1>
          <p className="text-xs text-slate-500">
            Tuition fee breakdown, installment schedules, online receipts, and payment status.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#ded8cb] p-5 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Academic Fee</span>
          <div className="text-xl font-black text-slate-900">₹{feeDetails.totalFee.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">Academic Year 2026-27</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#ded8cb] p-5 shadow-2xs space-y-1">
          <span className="text-xs text-emerald-600 font-medium">Paid Amount</span>
          <div className="text-xl font-black text-emerald-700">₹{feeDetails.paidAmount.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Receipts Generated
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-[#ded8cb] p-5 shadow-2xs space-y-1">
          <span className="text-xs text-amber-600 font-medium">Pending Dues</span>
          <div className="text-xl font-black text-amber-700">₹{feeDetails.dueAmount.toLocaleString()}</div>
          <span className="text-[10px] text-slate-500 font-medium">Due Date: {feeDetails.dueDate}</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#ded8cb] shadow-2xs overflow-hidden">
        <div className="p-4 bg-[#faf8f3] border-b border-[#ded8cb] flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Installment Breakdown & Receipts
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f7f5ee] border-b border-[#ded8cb] text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Receipt / Txn ID</th>
                <th className="py-3 px-4">Fee Particulars</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeDetails.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{tx.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{tx.term}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">₹{tx.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-500">{tx.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {tx.status === 'PAID' ? (
                      <button className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer">
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    ) : (
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer">
                        Pay ₹{tx.amount.toLocaleString()}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default FeeModule;
