import { useEffect, useState } from 'react';

// Fetches the dynamic month list from /api/available-months.
// Backend (server.js + lib/buildPayload.js) derives this from min/max created_at
// across activity tables — we just consume the result.
export function useAvailableMonths() {
  const [months,  setMonths]  = useState(null);   // null = loading, [] = no data
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/available-months')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(({ months }) => { if (!cancelled) setMonths(months ?? []); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return { months, loading: months === null && !error, error };
}
