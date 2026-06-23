import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getItem, getPurchaseHistory } from '../services/stockService.js';
import { formatMoney } from '../utils/date.js';

export default function StockDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: itemRows, loading: itemLoading } = useAsyncData(async () => {
    const item = await getItem(id);
    return item ? [item] : [];
  }, [id]);
  const { data: history, loading: historyLoading, error: historyError } = useAsyncData(() => getPurchaseHistory(id), [id]);
  const item = itemRows[0];

  if (itemLoading) {
    return <p className="text-sm">Loading...</p>;
  }

  if (!item) {
    return <EmptyState title="Item not found" text="This stock item is not available." />;
  }

  const unit = item.unit || 'Qty';
  const totalIn = Number(item.stock_in || 0);
  const totalUsed = Number(item.stock_out || 0);
  const current = Number(item.current_stock || 0);
  const purchase = Number(item.purchase_value || 0);
  const paid = Number(item.total_paid || 0);
  const pending = Math.max(purchase - paid, 0);
  const groupedHistory = groupByDate(history);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{item.name}</h2>
            <p className="text-sm text-ink/65">Supplier: {item.supplier_name}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/stock')}>Back</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label="Total In" value={`${totalIn} ${unit}`} />
          <Metric label="Used" value={`${totalUsed} ${unit}`} />
          <Metric label="Current" value={`${current} ${unit}`} highlight />
          <Metric label="Purchase" value={formatMoney(purchase)} />
          <Metric label="Paid" value={formatMoney(paid)} tone="text-green-700" bg="bg-green-50" />
          <Metric label="Pending" value={formatMoney(pending)} tone={pending > 0 ? 'text-red-700' : ''} />
        </div>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Date-wise History</h2>
            <p className="text-sm text-ink/60">Stock in, stock out aur payments ek jagah.</p>
          </div>
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{history.length} Entry</p>
        </div>

        {historyLoading ? <p className="mt-3 text-sm">Loading history...</p> : null}
        {historyError ? (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
            History load nahi ho rahi: {historyError}
          </p>
        ) : null}
        {!historyLoading && !historyError && history.length === 0 ? <EmptyState title="No history" text="Stock in, stock out, and payments will appear here." /> : null}
        <div className="mt-3 space-y-3">
          {groupedHistory.map((group) => (
            <DateGroup key={group.date} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DateGroup({ group }) {
  return (
    <div className="overflow-hidden rounded-lg border border-blue-100 bg-white">
      <div className="bg-blue-100 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">{group.date}</p>
            <p className="text-xs text-ink/65">{group.rows.length} entry</p>
          </div>
          <div className="grid grid-cols-3 gap-1 text-right text-xs">
            <p><span className="block text-blue-700">In</span><b>{group.stockIn} {group.unit}</b></p>
            <p><span className="block text-red-700">Used</span><b>{group.used} {group.unit}</b></p>
            <p><span className="block text-green-700">Paid</span><b>{formatMoney(group.paid)}</b></p>
          </div>
        </div>
      </div>
      <div className="space-y-2 bg-white p-2">
        {group.rows.map((row) => (
          <HistoryRow key={`${row.entry_type}-${row.history_id}`} row={row} />
        ))}
      </div>
    </div>
  );
}

function HistoryRow({ row }) {
  const isPayment = row.entry_type === 'PAYMENT';
  const isOut = row.entry_type === 'OUT';
  const border = isPayment ? 'border-green-500' : isOut ? 'border-red-500' : 'border-blue-500';
  const badge = isPayment ? 'bg-green-100 text-green-700' : isOut ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className={`rounded-md border-l-4 p-3 text-sm ${border} ${isPayment ? 'bg-green-50' : isOut ? 'bg-red-50' : 'bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${badge}`}>{typeLabel(row.entry_type)}</p>
          <p className={isPayment ? 'mt-2 font-bold text-green-700' : isOut ? 'mt-2 font-bold text-red-700' : 'mt-2 font-bold text-blue-700'}>{title(row)}</p>
          <p className="mt-1 text-ink/65">{meta(row)}</p>
          {!isPayment ? <p className="mt-1 text-ink/65">Supplier: {row.supplier_name || 'No supplier'}</p> : null}
        </div>
        {isPayment ? <p className="font-bold text-green-700">{formatMoney(row.amount)}</p> : null}
      </div>
    </div>
  );
}

function groupByDate(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.date)) {
      map.set(row.date, {
        date: row.date,
        rows: [],
        stockIn: 0,
        used: 0,
        paid: 0,
        unit: row.unit || 'Qty',
      });
    }

    const group = map.get(row.date);
    group.rows.push(row);
    if (row.entry_type === 'IN') group.stockIn += Number(row.quantity || 0);
    if (row.entry_type === 'OUT') group.used += Number(row.quantity || 0);
    if (row.entry_type === 'PAYMENT') group.paid += Number(row.amount || 0);
  }

  return Array.from(map.values());
}

function title(row) {
  if (row.entry_type === 'PAYMENT') return `Payment (${row.mode})`;
  if (row.entry_type === 'OUT') return `Used ${row.quantity} ${row.unit || 'Qty'}`;
  return `Stock In ${row.quantity} ${row.unit || 'Qty'}`;
}

function typeLabel(type) {
  if (type === 'PAYMENT') return 'Payment';
  if (type === 'OUT') return 'Stock Out';
  return 'Stock In';
}

function meta(row) {
  if (row.entry_type === 'PAYMENT') return `Supplier payment${row.note ? ` | ${row.note}` : ''}`;
  const value = row.entry_type === 'IN' ? `Purchase ${formatMoney(row.unit_price)}` : 'Stock used';
  return `${value}${row.note ? ` | ${row.note}` : ''}`;
}

function Metric({ label, value, highlight = false, tone = '', bg = 'bg-blue-50' }) {
  return (
    <div className={`rounded-md p-3 ${highlight ? 'bg-blue-600 text-white' : `${bg} text-ink`}`}>
      <p className={`text-xs ${highlight ? 'text-white/80' : 'text-ink/60'}`}>{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
