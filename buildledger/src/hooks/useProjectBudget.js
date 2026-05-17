import { useState, useEffect } from 'react';
import { getProjectBudgetSummary } from '../api/contracts';

export function useBudgetSummary(projectId) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) { setSummary(null); return; }
    setLoading(true);
    getProjectBudgetSummary(projectId)
      .then(res => setSummary(res.data?.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  return { summary, loading };
}
