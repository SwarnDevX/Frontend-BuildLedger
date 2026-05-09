import { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCheck, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllVendors } from '../../api/vendors';
import { getContractsByVendor, vendorContractResponse } from '../../api/contracts';
import Modal from '../../components/ui/Modal';
import { Button, FormTextarea, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';

const CONTRACT_STATUS_COLOR = {
  DRAFT:      'text-slate-600 bg-slate-100 dark:bg-slate-700/40 dark:text-slate-300',
  PENDING:    'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  ACTIVE:     'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  REJECTED:   'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  COMPLETED:  'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  TERMINATED: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  EXPIRED:    'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
};

export default function VendorContracts() {
  const { user } = useAuth();
  const [vendor,           setVendor]           = useState(null);
  const [contracts,        setContracts]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [rejectContractId, setRejectContractId] = useState(null);
  const [rejectRemarks,    setRejectRemarks]    = useState('');
  const [saving,           setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRes = await getAllVendors();
      const mine = (vendorRes.data?.data || []).find(v => v.userId === user.userId || v.username === user.username);
      if (!mine) { setLoading(false); return; }
      setVendor(mine);
      const res = await getContractsByVendor(mine.vendorId);
      setContracts(res.data?.data || []);
    } catch { toast.error('Failed to load contracts'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (contractId) => {
    setSaving(true);
    try {
      await vendorContractResponse(contractId, 'ACCEPT', vendor.vendorId);
      toast.success('Contract accepted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept contract'); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!rejectRemarks.trim()) { toast.error('Rejection reason is required'); return; }
    setSaving(true);
    try {
      await vendorContractResponse(rejectContractId, 'REJECT', vendor.vendorId, rejectRemarks.trim());
      toast.success('Contract rejected');
      setRejectContractId(null); setRejectRemarks('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject contract'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin text-blue-500" />
      <span className="text-sm">Loading contracts…</span>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <PageHeader
        title="My Contracts"
        subtitle={`${contracts.length} total · ${contracts.filter(c => c.status === 'ACTIVE').length} active`}
        actions={<Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={load}>Refresh</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',      value: contracts.length,                                           color: '#2563EB' },
          { label: 'Pending',    value: contracts.filter(c => c.status === 'PENDING').length,    color: '#F59E0B' },
          { label: 'Active',     value: contracts.filter(c => c.status === 'ACTIVE').length,     color: '#22C55E' },
          { label: 'Completed',  value: contracts.filter(c => c.status === 'COMPLETED').length,  color: '#14B8A6' },
          { label: 'Terminated', value: contracts.filter(c => c.status === 'TERMINATED').length, color: '#F97316' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {contracts.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 py-16 text-slate-400">
          <FileText size={32} className="opacity-20" />
          <p className="text-sm font-medium">No contracts assigned yet</p>
          <p className="text-xs">Contracts assigned to you by the project manager will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.contractId} className="glass-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">#{c.contractId}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLOR[c.status] || 'text-slate-500 bg-slate-100'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {c.title || c.projectName || 'Contract'}
                  </p>
                  <div className="flex gap-4 mt-1.5 flex-wrap">
                    {c.startDate && <p className="text-[10px] text-slate-400">Start: {c.startDate}</p>}
                    {c.endDate   && <p className="text-[10px] text-slate-400">End: {c.endDate}</p>}
                    {c.value     && <p className="text-[10px] text-slate-400">Value: ${Number(c.value).toLocaleString()}</p>}
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{c.description}</p>
                  )}
                </div>
                {c.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(c.contractId)}
                      disabled={saving}
                      className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/35 disabled:opacity-50 transition-all"
                    >
                      {saving ? <Loader2 size={10} className="animate-spin" /> : <CheckCheck size={11} />} Accept
                    </button>
                    <button
                      onClick={() => { setRejectContractId(c.contractId); setRejectRemarks(''); }}
                      disabled={saving}
                      className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/40 hover:bg-red-100 dark:hover:bg-red-900/35 disabled:opacity-50 transition-all"
                    >
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={rejectContractId !== null}
        onClose={() => { setRejectContractId(null); setRejectRemarks(''); }}
        title="Reject Contract"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Provide a reason for rejecting contract{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">#{rejectContractId}</span>.
          </p>
          <FormTextarea
            label="Rejection Reason"
            required
            value={rejectRemarks}
            onChange={e => setRejectRemarks(e.target.value)}
            rows={3}
            placeholder="Explain why you are rejecting this contract…"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => { setRejectContractId(null); setRejectRemarks(''); }}>
              Cancel
            </Button>
            <Button variant="danger" size="xs" onClick={handleReject} loading={saving}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
