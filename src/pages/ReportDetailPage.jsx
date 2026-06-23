import { Link, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { getFullReport } from '../services/reportService.js';
import { formatMoney } from '../utils/date.js';

const sections = {
  'labour-attendance': {
    title: 'Labour Attendance',
    getRows: (report) => report.labourAttendance,
  },
  'labour-payments': {
    title: 'Labour Payments',
    getRows: (report) => report.labourPayments,
  },
  'stock-history': {
    title: 'Stock History',
    getRows: (report) => report.stockTransactions,
  },
  'stock-payments': {
    title: 'Stock Payments',
    getRows: (report) => report.stockPayments,
  },
};

export default function ReportDetailPage() {
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') === 'month' ? 'month' : 'today';
  const currentSection = sections[section] ? section : 'labour-attendance';
  const config = sections[currentSection];
  const { data, loading, error } = useAsyncData(async () => {
    const report = await getFullReport(period);
    return [report];
  }, [period]);
  const report = data[0];
  const rows = report ? config.getRows(report) : [];
  const groupedRows = groupByDate(rows, currentSection);

  function changePeriod(nextPeriod) {
    setSearchParams({ period: nextPeriod });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/reports" className="rounded-md bg-blue-100 px-4 py-2 text-sm font-bold text-blue-900">
          Back
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={period === 'today' ? 'primary' : 'secondary'} onClick={() => changePeriod('today')}>Today</Button>
          <Button variant={period === 'month' ? 'primary' : 'secondary'} onClick={() => changePeriod('month')}>Month</Button>
        </div>
      </div>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <p className="text-sm font-semibold text-brand">{report?.range.label || ''} Report</p>
        <h2 className="text-2xl font-bold">{config.title}</h2>
        {report ? <p className="mt-1 text-sm text-ink/65">{report.range.from} to {report.range.to}</p> : null}
        {report ? <Summary section={currentSection} report={report} rows={rows} /> : null}
      </section>

      {loading ? <p className="text-sm">Loading report...</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? <EmptyState title="No records" text="No entries found for selected period." /> : null}

      <div className="space-y-3">
        {groupedRows.map((group) => (
          <section key={group.date} className="overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="bg-blue-100 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{group.date}</h3>
                  <p className="text-xs text-ink/65">{group.rows.length} record</p>
                </div>
                <p className="rounded-md bg-white px-3 py-1 text-sm font-bold text-blue-700">{group.total}</p>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {group.rows.map((row, index) => (
                <ReportRow key={`${group.date}-${index}`} section={currentSection} row={row} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Summary({ section, report, rows }) {
  if (section === 'labour-attendance') {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Present" value={report.labour.present || 0} />
        <Metric label="Absent" value={report.labour.absent || 0} />
        <Metric label="Half Day" value={report.labour.halfDay || 0} />
      </div>
    );
  }

  if (section === 'stock-history') {
    return (
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Entries" value={rows.length} />
        <Metric label="Stock In" value={report.stock.stockIn || 0} />
        <Metric label="Used" value={report.stock.stockOut || 0} />
      </div>
    );
  }

  const total = section === 'labour-payments' ? report.labour.paid : report.stock.paid;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Metric label="Records" value={rows.length} />
      <Metric label="Paid" value={formatMoney(total)} paid />
    </div>
  );
}

function ReportRow({ section, row }) {
  if (section === 'labour-attendance') {
    const amount = Number(row.wage_amount || 0) + Number(row.overtime_amount || 0);
    const isAbsent = row.status === 'Absent';
    return (
      <Card tone={isAbsent ? 'red' : 'blue'} title={`${row.name} | ${row.status}`} amount={formatMoney(amount)}>
        <p>{row.work_type} | {row.mobile}</p>
        {row.remark ? <p>{row.remark}</p> : null}
      </Card>
    );
  }

  if (section === 'labour-payments') {
    return (
      <Card tone="green" title={`${row.name} | ${row.mode}`} amount={formatMoney(row.amount)}>
        <p>{row.mobile}</p>
        {row.note ? <p>{row.note}</p> : null}
      </Card>
    );
  }

  if (section === 'stock-history') {
    const isOut = row.type === 'OUT';
    const amount = row.type === 'IN' ? formatMoney(row.unit_price) : '';
    return (
      <Card tone={isOut ? 'red' : 'blue'} title={`${row.item_name} | ${isOut ? 'Stock Out' : 'Stock In'}`} amount={amount}>
        <p>{row.quantity} {row.unit || 'Qty'} | Supplier: {row.supplier_name || 'No supplier'}</p>
        {row.note ? <p>{row.note}</p> : null}
      </Card>
    );
  }

  return (
    <Card tone="green" title={`${row.item_name} | ${row.mode}`} amount={formatMoney(row.amount)}>
      <p>Supplier: {row.supplier_name || 'No supplier'}</p>
      {row.note ? <p>{row.note}</p> : null}
    </Card>
  );
}

function Card({ title, amount, children, tone }) {
  const styles = {
    blue: 'border-blue-500 bg-blue-50 text-blue-700',
    green: 'border-green-500 bg-green-50 text-green-700',
    red: 'border-red-500 bg-red-50 text-red-700',
  };
  const style = styles[tone] || styles.blue;

  return (
    <div className={`rounded-md border-l-4 p-3 text-sm ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">{title}</p>
          <div className="mt-1 space-y-1 text-ink/65">{children}</div>
        </div>
        {amount ? <p className="shrink-0 font-bold">{amount}</p> : null}
      </div>
    </div>
  );
}

function Metric({ label, value, paid = false }) {
  return (
    <div className={`rounded-md p-3 ${paid ? 'bg-green-50' : 'bg-blue-50'}`}>
      <p className={`text-xs ${paid ? 'text-green-700' : 'text-blue-700'}`}>{label}</p>
      <p className={`mt-1 text-lg font-bold ${paid ? 'text-green-700' : ''}`}>{value}</p>
    </div>
  );
}

function groupByDate(rows, section) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.date)) {
      map.set(row.date, { date: row.date, rows: [], total: '' });
    }
    map.get(row.date).rows.push(row);
  }

  return Array.from(map.values()).map((group) => {
    if (section === 'labour-attendance') {
      const present = group.rows.filter((row) => row.status === 'Present').length;
      const absent = group.rows.filter((row) => row.status === 'Absent').length;
      return { ...group, total: `P ${present} | A ${absent}` };
    }

    if (section === 'stock-history') {
      const inCount = group.rows.filter((row) => row.type === 'IN').length;
      const outCount = group.rows.filter((row) => row.type === 'OUT').length;
      return { ...group, total: `In ${inCount} | Out ${outCount}` };
    }

    const paid = group.rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return {
      ...group,
      total: formatMoney(paid),
    };
  });
}
