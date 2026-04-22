import { useState } from 'react';
import { Plus, X, CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import Modal from '../../components/ui/Modal';
import { contracts } from '../../data/mockData';

function ContractTimeline({ progress }) {
  const stages = ['Draft', 'Active', 'Review', 'Completed'];
  const activeIdx = progress === 100 ? 3 : progress >= 60 ? 2 : progress >= 10 ? 1 : 0;
  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white transition-all ${i <= activeIdx ? 'bg-blue-600' : 'bg-slate-200'}`}>
              {i < activeIdx ? <CheckCircle2 size={12} /> : i === activeIdx ? <Circle size={12} fill="white" /> : <div className="w-2 h-2 rounded-full bg-white/60" />}
            </div>
            <span className="text-[9px] text-slate-400 whitespace-nowrap">{s}</span>
          </div>
          {i < stages.length - 1 && (
            <div className={`h-0.5 w-12 mb-4 transition-all ${i < activeIdx ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ContractDetailModal({ contract, onClose }) {
  if (!contract) return null;
  return (
    <Modal open={!!contract} onClose={onClose} title={`Contract ${contract.id}`} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Project', contract.project],
            ['Vendor', contract.vendor],
            ['Contract Type', contract.type],
            ['Contract Value', `$${contract.value.toLocaleString()}`],
            ['Start Date', contract.start],
            ['End Date', contract.end],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-slate-400 mb-0.5">{k}</p>
              <p className="text-sm font-semibold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Progress</p>
          <ProgressBar value={contract.progress} showLabel />
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Timeline</p>
          <ContractTimeline progress={contract.progress} />
        </div>
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            {contract.compliance === 'Flag'
              ? <AlertTriangle size={14} className="text-red-500" />
              : <CheckCircle2 size={14} className="text-green-600" />}
            <p className="text-xs font-semibold text-slate-700">Compliance Status: <span className={contract.compliance === 'Flag' ? 'text-red-600' : 'text-green-600'}>{contract.compliance}</span></p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {contract.compliance === 'Flag'
              ? 'This contract has been flagged for compliance review. Payment terms deviate from standard template. Requires legal sign-off before next milestone payment.'
              : 'All compliance requirements are met. Documentation is up to date and all milestones have been reviewed by the compliance team.'}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary text-xs" onClick={onClose}>Close</button>
          <button className="btn-primary text-xs">Edit Contract</button>
        </div>
      </div>
    </Modal>
  );
}

export default function ContractManagement() {
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Contract Management</h2>
          <p className="text-sm text-slate-400">{contracts.length} active contracts</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create New Contract
        </button>
      </div>

      {/* Summary bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: contracts.filter(c => c.status === 'Active').length, color: '#22C55E' },
          { label: 'Pending', count: contracts.filter(c => c.status === 'Pending').length, color: '#F59E0B' },
          { label: 'On Hold', count: contracts.filter(c => c.status === 'On Hold').length, color: '#94a3b8' },
          { label: 'Completed', count: contracts.filter(c => c.status === 'Completed').length, color: '#2563EB' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contract Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {contracts.map(c => (
          <div key={c.id} className="glass-card p-5 cursor-pointer" onClick={() => setSelected(c)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-mono text-blue-600 font-semibold">{c.id}</p>
                <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{c.project}</h3>
              </div>
              <Badge status={c.status} />
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vendor</span>
                <span className="text-slate-700 font-medium">{c.vendor}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Value</span>
                <span className="text-slate-700 font-semibold">${c.value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Type</span>
                <span className="text-slate-500">{c.type}</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Progress</span>
                <span className="text-slate-600 font-semibold">{c.progress}%</span>
              </div>
              <ProgressBar value={c.progress} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock size={10} />
                <span>{c.start} → {c.end}</span>
              </div>
              {c.compliance === 'Flag' && (
                <span className="flex items-center gap-1 text-[10px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  <AlertTriangle size={9} /> Compliance Flag
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ContractDetailModal contract={selected} onClose={() => setSelected(null)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Contract">
        <div className="space-y-4">
          {[
            ['Project Name', 'text', 'Enter project name'],
            ['Vendor', 'text', 'Select vendor'],
            ['Contract Value', 'number', '$0.00'],
            ['Start Date', 'date', ''],
            ['End Date', 'date', ''],
          ].map(([label, type, placeholder]) => (
            <div key={label}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
              <input type={type} placeholder={placeholder}
                className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:bg-white transition-all" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contract Type</label>
            <select className="w-full text-sm bg-white/60 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-all">
              {['Fixed Price','Lump Sum','Unit Price','Cost Plus'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary text-xs" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary text-xs">Create Contract</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

