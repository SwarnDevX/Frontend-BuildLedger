import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  Button, FormTextarea, InfoBox, Modal, PageHeader, StatusCards,
} from '../../components/ui';
import { getVendorContracts, vendorRespondToContract } from '../../api/contracts';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ContractCard from '../ContractManagement/ContractCard';
import ContractDetailModal from '../ContractManagement/ContractDetailModal';
import { STATUS_OPTIONS } from '../ContractManagement/contractConstants';

export default function VendorContracts() {
  const { user } = useAuth();
  const [contracts, setContracts]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filterStatus, setFilterStatus]   = useState('ALL');
  const [selected, setSelected]           = useState(null);
  const [respondContract, setRespondContract] = useState(null);
  const [respondAction, setRespondAction] = useState(null);
  const [remarks, setRemarks]             = useState('');
  const [saving, setSaving]               = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendorContracts();
      setContracts(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openRespond = (e, contract, action) => {
    e.stopPropagation();
    setRespondContract(contract);
    setRespondAction(action);
    setRemarks('');
  };

  const handleRespond = async () => {
    if (respondAction === 'REJECT' && !remarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setSaving(true);
    try {
      await vendorRespondToContract(
        respondContract.contractId,
        respondAction,
        respondContract.vendorId,
        remarks.trim() || undefined,
      );
      toast.success(respondAction === 'ACCEPT' ? 'Contract accepted!' : 'Contract rejected');
      setRespondContract(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    ALL: contracts.length, DRAFT: 0, PENDING: 0, ACTIVE: 0,
    COMPLETED: 0, TERMINATED: 0, EXPIRED: 0, REJECTED: 0,
  };
  contracts.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  const displayed = filterStatus === 'ALL'
    ? contracts
    : contracts.filter(c => c.status === filterStatus);

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
        subtitle={`${contracts.length} contract${contracts.length !== 1 ? 's' : ''} assigned to you`}
        actions={
          <Button variant="secondary" size="xs" icon={<RefreshCw size={13} />} onClick={fetchData}>
            Refresh
          </Button>
        }
      />

      <StatusCards
        options={STATUS_OPTIONS}
        counts={counts}
        value={filterStatus}
        onChange={setFilterStatus}
        cols={8}
      />

      {displayed.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-400 text-sm">
          {filterStatus === 'ALL'
            ? 'No contracts assigned to you yet.'
            : `No ${filterStatus.toLowerCase()} contracts.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(c => (
            <div key={c.contractId}>
              <ContractCard contract={c} canManage={false} onClick={() => setSelected(c)} />
              {c.status === 'PENDING' && (
                <div className="flex gap-2 mt-2 px-1">
                  <button
                    onClick={e => openRespond(e, c, 'ACCEPT')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{ background: '#22C55E', boxShadow: '0 2px 8px #22C55E44' }}
                  >
                    <CheckCircle2 size={13} /> Accept Contract
                  </button>
                  <button
                    onClick={e => openRespond(e, c, 'REJECT')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{ background: '#EF4444', boxShadow: '0 2px 8px #EF444444' }}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contract detail (read-only for vendor) */}
      <ContractDetailModal
        contract={selected}
        vendors={[]}
        projects={[]}
        onClose={() => setSelected(null)}
        onRefresh={fetchData}
        canManage={false}
        isAdmin={false}
      />

      {/* Respond modal */}
      <Modal
        open={!!respondContract}
        onClose={() => setRespondContract(null)}
        title={
          respondAction === 'ACCEPT'
            ? `Accept Contract #${respondContract?.contractId}`
            : `Reject Contract #${respondContract?.contractId}`
        }
      >
        <div className="space-y-4">
          {respondAction === 'ACCEPT' ? (
            <InfoBox variant="success">
              You are accepting contract <strong>#{respondContract?.contractId}</strong>.
              It will become <strong className="text-green-600 mx-1">ACTIVE</strong> immediately.
            </InfoBox>
          ) : (
            <InfoBox variant="warning">
              You are rejecting contract <strong>#{respondContract?.contractId}</strong>.
              Please provide a reason for the record.
            </InfoBox>
          )}
          <FormTextarea
            label={respondAction === 'REJECT' ? 'Rejection Reason' : 'Remarks (optional)'}
            required={respondAction === 'REJECT'}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={3}
            placeholder={
              respondAction === 'REJECT'
                ? 'Reason for rejection…'
                : 'Optional remarks…'
            }
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="xs" onClick={() => setRespondContract(null)}>
              Cancel
            </Button>
            <Button
              variant={respondAction === 'ACCEPT' ? 'primary' : 'danger'}
              size="xs"
              onClick={handleRespond}
              loading={saving}
            >
              {respondAction === 'ACCEPT' ? 'Confirm Acceptance' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
