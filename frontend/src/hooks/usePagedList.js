import { useCallback, useEffect, useRef, useState } from 'react';

// Loads a server-paginated list. Re-fetches when `params` change; page resets to 1 on filter change.
export default function usePagedList(fetcher, params, deps = []) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const key = JSON.stringify(params);

  useEffect(() => { setPage(1); }, [key, ...deps]);

  const load = useCallback(() => {
    const id = (seq.current += 1);
    setLoading(true); setError('');
    return fetcher({ ...params, page })
      .then((r) => { if (id === seq.current) { setItems(r.data || []); setMeta(r.meta || {}); } })
      .catch((e) => { if (id === seq.current) setError(e.message); })
      .finally(() => { if (id === seq.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { items, meta, page, setPage, loading, error, setError, reload: load };
}
