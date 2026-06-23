import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ConfirmDialog } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { deleteLabour, getLabour, getLabourHistory } from '../services/labourService.js';
import { formatMoney } from '../utils/date.js';

export default function LabourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const labourLoader = useMemo(() => () => getLabour(id), [id]);
  const historyLoader = useMemo(() => () => getLabourHistory(id), [id]);
  const { data: labourData, loading: labourLoading } = useAsyncData(async () => {
    const labour = await labourLoader();
    return labour ? [labour] : [];
  }, [labourLoader]);
  const { data: history, loading: historyLoading } = useAsyncData(historyLoader, [historyLoader]);
  const labour = labourData[0];

  async function remove() {
    await deleteLabour(id);
    showToast('Labour deleted');
    navigate('/labour');
  }

  if (labourLoading) {
    return <p className="text-sm">Loading...</p>;
  }

  if (!labour) {
    return <EmptyState title="Labour not found" text="This labour record is not available." />;
  }

  const balance = Number(labour.earned_amount || 0) - Number(labour.total_paid || 0);
  const pending = Math.max(balance, 0);
  const advance = Math.max(-balance, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{labour.name}</h2>
            <p className="text-sm text-ink/65">{labour.work_type} | {labour.mobile}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/labour')}>Back</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Metric label="Daily wage" value={formatMoney(labour.daily_wage)} />
          <Metric label="Earned" value={formatMoney(labour.earned_amount)} />
          <Metric label="Paid" value={formatMoney(labour.total_paid)} tone="text-green-700" bg="bg-green-50" />
          <Metric label={advance > 0 ? 'Advance' : 'Pending'} value={formatMoney(advance > 0 ? advance : pending)} tone={pending > 0 ? 'text-red-700' : 'text-green-700'} bg={advance > 0 ? 'bg-green-50' : 'bg-field'} />
        </div>
        <Button className="mt-4 w-full" variant="danger" onClick={() => setDeleting(true)}>
          Delete Labour
        </Button>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">History</h2>
        {historyLoading ? <p className="mt-3 text-sm">Loading...</p> : null}
        {!historyLoading && history.length === 0 ? (
          <EmptyState title="No history" text="Attendance and payment records will appear here." />
        ) : null}
        <div className="mt-3 space-y-2">
          {history.map((entry) => (
            <HistoryRow key={`${entry.entry_type}-${entry.id}`} entry={entry} />
          ))}
        </div>
      </section>

      {deleting ? (
        <ConfirmDialog
          title="Delete labour"
          message={`Delete ${labour.name} and all attendance/payment history?`}
          onCancel={() => setDeleting(false)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}

function HistoryRow({ entry }) {
  const isPayment = entry.entry_type === 'Payment';

  return (
    <div className="rounded-md bg-field p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{entry.date} | {entry.entry_type}</p>
          <p className="text-ink/65">
            {isPayment ? entry.mode : entry.title}
            {!isPayment && Number(entry.overtime_amount || 0) > 0 ? ` | Overtime ${formatMoney(entry.overtime_amount)}` : ''}
          </p>
          {entry.note ? <p className="mt-1 text-ink/65">{entry.note}</p> : null}
        </div>
        <p className={`font-bold ${isPayment ? 'text-green-700' : ''}`}>{formatMoney(entry.amount)}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = '', bg = 'bg-field' }) {
  return (
    <div className={`rounded-md p-3 ${bg}`}>
      <p className="text-xs text-ink/60">{label}</p>
      <p className={`font-bold ${tone}`}>{value}</p>
    </div>
  );
}
