import { statusTone } from '../../utils/constants';

export default function StatusBadge({ status, label, tone }) {
  return <span className={`status ${tone || statusTone(status)}`}>{label || status}</span>;
}
