import { useEffect, useState } from 'react';

// Fetches the monthly payload from /api/monthly/:ym. Re-fetches on month change.
// Cancels in-flight responses if the user switches months mid-request.
export function useMonthlyData(ym) {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!ym) return;
    let cancelled = false;
    setData(null); setError(null);
    fetch(`/api/monthly/${ym}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(payload => { if (!cancelled) setData(payload); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [ym]);

  return { data, loading: !!ym && data === null && !error, error };
}
