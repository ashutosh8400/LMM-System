import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { addAttendance, addPayment, calculateAttendanceWage, listLabour, saveLabour } from '../services/labourService.js';
import { formatMoney, todayKey } from '../utils/date.js';
import { firstError, required, validateMobile, validateNonNegative, validateNotFutureDate, validatePositive } from '../utils/validation.js';

const emptyForm = { name: '', mobile: '', work_type: '', daily_wage: '' };
const workTypes = ['Helper', 'Mistri', 'Labour', 'Electrician', 'Plumber', 'Painter', 'Tile Fitter', 'Other'];

export default function LabourPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [payment, setPayment] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loader = useMemo(() => () => listLabour(search), [search]);
  const { data, loading, refresh } = useAsyncData(loader, [loader]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search labour" />
        <Button onClick={() => setEditing(emptyForm)}>Add</Button>
      </div>

      {loading ? <p className="text-sm">Loading...</p> : null}
      {!loading && data.length === 0 ? <EmptyState title="No labour found" text="Add labour once, then record daily attendance and payments." /> : null}

      <div className="space-y-3">
        {data.map((item) => (
          <LabourCard
            key={item.id}
            item={item}
            onAttendance={() => setAttendance(item)}
            onPayment={() => setPayment(item)}
            onHistory={() => navigate(`/labour/${item.id}`)}
            onEdit={() => setEditing(item)}
          />
        ))}
      </div>

      {editing ? (
        <LabourForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast('Labour saved');
            refresh();
          }}
        />
      ) : null}
      {attendance ? (
        <AttendanceForm
          labour={attendance}
          onClose={() => setAttendance(null)}
          onSaved={() => {
            setAttendance(null);
            showToast('Attendance saved');
            refresh();
          }}
        />
      ) : null}
      {payment ? (
        <PaymentForm
          labour={payment}
          onClose={() => setPayment(null)}
          onSaved={() => {
            setPayment(null);
            showToast('Payment saved');
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function LabourCard({ item, onAttendance, onPayment, onHistory, onEdit }) {
  const balance = Number(item.earned_amount || 0) - Number(item.total_paid || 0);
  const pending = Math.max(balance, 0);
  const advance = Math.max(-balance, 0);

  return (
    <section className="rounded-lg bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{item.name}</h2>
          <p className="text-sm text-ink/65">{item.work_type} | {item.mobile}</p>
        </div>
        <p className="rounded-md bg-brand/10 px-2 py-1 text-xs font-bold text-brand">
          {formatMoney(item.daily_wage)}/day
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Info label="Total earned" value={formatMoney(item.earned_amount)} />
        <Info label="Total paid" value={formatMoney(item.total_paid)} tone="text-green-700" bg="bg-green-50" />
        <Info label="Pending" value={formatMoney(pending)} tone={pending > 0 ? 'text-red-700' : ''} />
        <Info label="Advance" value={formatMoney(advance)} tone={advance > 0 ? 'text-green-700' : ''} bg={advance > 0 ? 'bg-green-50' : 'bg-field'} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" onClick={onAttendance}>Attendance</Button>
        <Button variant="secondary" onClick={onPayment}>Payment</Button>
        <Button variant="outline" onClick={onHistory}>History</Button>
        <Button variant="outline" onClick={onEdit}>Edit</Button>
      </div>
    </section>
  );
}

function LabourForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {
      name: required(form.name, 'Name'),
      mobile: validateMobile(form.mobile),
      work_type: required(form.work_type, 'Work type'),
      daily_wage: validatePositive(form.daily_wage, 'Daily wage'),
    };
    setErrors(next);
    return !firstError(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    await saveLabour(form);
    onSaved();
  }

  return (
    <Modal title={form.id ? 'Edit Labour' : 'Add Labour'} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <TextField label="Name" value={form.name} error={errors.name} onChange={(name) => setForm({ ...form, name })} />
        <TextField
          label="Mobile"
          value={form.mobile}
          error={errors.mobile}
          inputMode="numeric"
          maxLength={10}
          onChange={(mobile) => setForm({ ...form, mobile: mobile.replace(/\D/g, '').slice(0, 10) })}
        />
        <Field label="Work type" error={errors.work_type}>
          <select className={inputClass()} value={form.work_type} onChange={(event) => setForm({ ...form, work_type: event.target.value })}>
            <option value="">Select work type</option>
            {workTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Field>
        <TextField label="Daily wage" value={form.daily_wage} error={errors.daily_wage} type="number" onChange={(daily_wage) => setForm({ ...form, daily_wage })} />
        <Button className="w-full" type="submit">Save Labour</Button>
      </form>
    </Modal>
  );
}

function AttendanceForm({ labour, onClose, onSaved }) {
  const [form, setForm] = useState({
    labour_id: labour.id,
    date: todayKey(),
    status: 'Present',
    overtime_amount: 0,
    remark: '',
  });
  const [errors, setErrors] = useState({});
  const wageAmount = calculateAttendanceWage(labour.daily_wage, form.status, form.overtime_amount);

  function validate() {
    const next = {
      date: validateNotFutureDate(form.date),
      overtime_amount: validateNonNegative(form.overtime_amount || 0, 'Overtime'),
    };
    setErrors(next);
    return !firstError(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    try {
      await addAttendance({ ...form, wage_amount: wageAmount });
      onSaved();
    } catch (error) {
      setErrors({ form: error.message || 'Unable to save attendance' });
    }
  }

  return (
    <Modal title={`Attendance: ${labour.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {errors.form ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{errors.form}</p> : null}
        <TextField label="Date" value={form.date} error={errors.date} type="date" max={todayKey()} onChange={(date) => setForm({ ...form, date })} />
        <Field label="Status">
          <select className={inputClass()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option>Present</option>
            <option>Absent</option>
            <option>Half Day</option>
          </select>
        </Field>
        <TextField label="Overtime amount" value={form.overtime_amount} error={errors.overtime_amount} type="number" onChange={(overtime_amount) => setForm({ ...form, overtime_amount })} />
        <TextField label="Remark" value={form.remark} onChange={(remark) => setForm({ ...form, remark })} />
        <Info label="Daily wage calculation" value={formatMoney(wageAmount)} />
        <Button className="w-full" type="submit">Save Attendance</Button>
      </form>
    </Modal>
  );
}

function PaymentForm({ labour, onClose, onSaved }) {
  const [form, setForm] = useState({
    labour_id: labour.id,
    date: todayKey(),
    amount: '',
    mode: 'Cash',
    note: '',
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {
      date: validateNotFutureDate(form.date),
      amount: validatePositive(form.amount, 'Amount'),
      mode: required(form.mode, 'Payment mode'),
    };
    setErrors(next);
    return !firstError(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    await addPayment(form);
    onSaved();
  }

  return (
    <Modal title={`Payment: ${labour.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <TextField label="Date" value={form.date} error={errors.date} type="date" max={todayKey()} onChange={(date) => setForm({ ...form, date })} />
        <TextField label="Amount" value={form.amount} error={errors.amount} type="number" onChange={(amount) => setForm({ ...form, amount })} />
        <Field label="Payment mode" error={errors.mode}>
          <select className={inputClass()} value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
            <option>Cash</option>
            <option>UPI</option>
          </select>
        </Field>
        <TextField label="Note" value={form.note} onChange={(note) => setForm({ ...form, note })} />
        <Button className="w-full" type="submit">Save Payment</Button>
      </form>
    </Modal>
  );
}

function TextField({ label, value, onChange, error, type = 'text', inputMode, maxLength, max }) {
  return (
    <Field label={label} error={error}>
      <input
        className={inputClass()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => {
          if (type === 'number') event.currentTarget.blur();
        }}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        max={max}
      />
    </Field>
  );
}

function Info({ label, value, tone = '', bg = 'bg-field' }) {
  return (
    <div className={`rounded-md p-3 ${bg}`}>
      <p className="text-xs text-ink/60">{label}</p>
      <p className={`font-bold ${tone}`}>{value}</p>
    </div>
  );
}
