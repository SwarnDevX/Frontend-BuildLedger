import { useState, useEffect } from 'react';
import { getContractBudgetSummary } from '../api/deliveries';

export function useContractBudgetSummary(contractId, status) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contractId || status !== 'ACTIVE') { setSummary(null); return; }
    setLoading(true);
    getContractBudgetSummary(contractId)
      .then(res => setSummary(res.data?.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [contractId, status]);

  return { summary, loading };
}
