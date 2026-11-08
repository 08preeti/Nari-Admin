import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, page, onPage }) {
  if (!meta || !meta.totalPages || meta.totalPages <= 1) return meta?.total ? <div className="pager"><span>{meta.total} record{meta.total === 1 ? '' : 's'}</span></div> : null;
  return <div className="pager">
    <span>{meta.total} records · page {page} of {meta.totalPages}</span>
    <div>
      <button className="outline-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Prev</button>
      <button className="outline-btn" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14} /></button>
    </div>
  </div>;
}
