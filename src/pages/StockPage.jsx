import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import Modal, { ConfirmDialog } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { addStockPayment, addStockTransaction, deleteItem, listItems, saveItem } from '../services/stockService.js';
import { formatMoney, todayKey } from '../utils/date.js';
import { firstError, required, validateNonNegative, validateNotFutureDate, validatePositive } from '../utils/validation.js';

const emptyItem = { name: '', unit: 'Qty', supplier_name: '', low_stock_limit: 0 };
const unitOptions = ['Qty', 'Kg', 'Ton'];

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [movement, setMovement] = useState(null);
  const [payment, setPayment] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loader = useMemo(() => () => listItems(search), [search]);
  const { data, loading, refresh } = useAsyncData(loader, [loader]);

  async function remove() {
    await deleteItem(deleting.id);
    setDeleting(null);
    showToast('Item deleted');
    refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold">Materials</h2>
            <p className="text-xs text-ink/60">Item search karo ya naya material add karo.</p>
          </div>
          <Button className="shrink-0 px-4" onClick={() => setEditing(emptyItem)}>
            Add Item
          </Button>
        </div>
        <div className={search ? 'grid grid-cols-[1fr_auto] gap-2' : 'block'}>
          <label className="block">
            <input
              className={inputClass()}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search item or supplier"
              type="search"
            />
          </label>
          {search ? (
            <button className="min-h-11 rounded-md bg-blue-50 px-4 text-sm font-bold text-blue-800" type="button" onClick={() => setSearch('')}>
              Clear
            </button>
          ) : null}
        </div>
      </section>

      {loading ? <p className="text-sm">Loading...</p> : null}
      {!loading && data.length === 0 ? <EmptyState title="No stock items" text="Add material once, then use stock in and stock out." /> : null}

      <div className="grid gap-3">
        {data.map((item) => (
          <StockCard
            key={item.id}
            item={item}
            onIn={() => setMovement({ item, type: 'IN' })}
            onOut={() => setMovement({ item, type: 'OUT' })}
            onPayment={() => setPayment(item)}
            onHistory={() => navigate(`/stock/${item.id}`)}
            onEdit={() => setEditing(item)}
            onDelete={() => setDeleting(item)}
          />
        ))}
      </div>

      {editing ? <ItemForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); showToast('Item saved'); refresh(); }} /> : null}
      {movement ? <MovementForm data={movement} onClose={() => setMovement(null)} onSaved={() => { setMovement(null); showToast('Stock updated'); refresh(); }} /> : null}
      {payment ? <PaymentForm item={payment} onClose={() => setPayment(null)} onSaved={() => { setPayment(null); showToast('Payment saved'); refresh(); }} /> : null}
      {deleting ? <ConfirmDialog title="Delete item" message={`Delete ${deleting.name}?`} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </div>
  );
}

function StockCard({ item, onIn, onOut, onPayment, onHistory, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const current = Number(item.current_stock || 0);
  const totalIn = Number(item.stock_in || 0);
  const lowLimit = Number(item.low_stock_limit || 0);
  const used = Number(item.stock_out || 0);
  const low = current <= lowLimit;
  const purchase = Number(item.purchase_value || 0);
  const paid = Number(item.total_paid || 0);
  const balance = purchase - paid;
  const pending = Math.max(balance, 0);
  const advance = Math.max(-balance, 0);

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-soft">
      <button
        className="w-full border-b border-blue-100 bg-blue-50 p-4 text-left active:bg-blue-100"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold leading-tight text-ink">{item.name}</h2>
            <p className="mt-1 truncate text-sm font-medium text-ink/70">Supplier: {item.supplier_name}</p>
            <p className="mt-1 text-xs font-semibold text-ink/55">Low alert: {lowLimit} {item.unit || 'Qty'}</p>
          </div>
          <div className="grid shrink-0 gap-2 text-right">
            <span className={`inline-flex min-h-7 items-center justify-center rounded-md px-2 py-1 text-xs font-bold ${low ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}`}>
              {low ? 'Low Stock' : 'In Stock'}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-full bg-white text-lg font-bold leading-none text-blue-800">
              <span className={`block transition-transform duration-300 ease-out ${open ? 'rotate-180' : 'rotate-0'}`}>
                ↓
              </span>
            </span>
          </div>
        </div>
      </button>

      <div className={`grid overflow-hidden transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className={`p-4 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : '-translate-y-2'}`}>
            <div className="rounded-lg bg-brand p-4 text-white">
              <p className="text-sm font-semibold text-white/80">Current Stock</p>
              <p className="mt-1 text-3xl font-bold leading-tight">{current} {item.unit || 'Qty'}</p>
              <p className="mt-2 text-xs text-white/75">Total In {totalIn} {item.unit || 'Qty'} | Used {used} {item.unit || 'Qty'}</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Info label="Paid" value={formatMoney(paid)} tone="text-green-700" bg="bg-green-50" />
              <Info label="Pending" value={formatMoney(pending)} tone={pending > 0 ? 'text-red-700' : ''} />
              <Info label="Advance" value={formatMoney(advance)} tone={advance > 0 ? 'text-green-700' : ''} bg={advance > 0 ? 'bg-green-50' : 'bg-blue-50'} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionCard label="Stock In" text="Add material" primary onClick={onIn} />
              <ActionCard label="Stock Out" text="Use material" onClick={onOut} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ActionCard label="Payment" text="Pay supplier" paid onClick={onPayment} />
              <ActionCard label="History" text="View records" onClick={onHistory} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionCard({ label, text, primary = false, paid = false, onClick }) {
  const style = primary
    ? 'bg-brand text-white'
    : paid
      ? 'bg-green-50 text-green-700'
      : 'bg-blue-50 text-blue-900';

  return (
    <button className={`min-h-16 rounded-md p-3 text-left font-bold active:brightness-95 ${style}`} type="button" onClick={onClick}>
      <span className="block text-sm leading-tight">{label}</span>
      <span className={`mt-1 block text-xs font-semibold ${primary ? 'text-white/80' : 'text-ink/55'}`}>{text}</span>
    </button>
  );
}

function PaymentForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    item_id: item.id,
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
    await addStockPayment(form);
    onSaved();
  }

  return (
    <Modal title={`Payment: ${item.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <TextField label="Date" value={form.date} error={errors.date} type="date" max={todayKey()} onChange={(date) => setForm({ ...form, date })} />
        <TextField label="Amount" value={form.amount} error={errors.amount} type="number" clearZero onChange={(amount) => setForm({ ...form, amount })} />
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

function ItemForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial, unit: initial.unit || 'Qty' });
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {
      name: required(form.name, 'Name'),
      unit: required(form.unit, 'Unit'),
      supplier_name: required(form.supplier_name, 'Supplier name'),
      low_stock_limit: validateNonNegative(form.low_stock_limit || 0, 'Low stock limit'),
    };
    setErrors(next);
    return !firstError(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    await saveItem(form);
    onSaved();
  }

  return (
    <Modal title={form.id ? 'Edit Item' : 'Add Item'} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <TextField label="Item name" value={form.name} error={errors.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Unit" error={errors.unit}>
          <select className={inputClass()} value={form.unit || 'Qty'} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </Field>
        <TextField label="Supplier name" value={form.supplier_name} error={errors.supplier_name} onChange={(supplier_name) => setForm({ ...form, supplier_name })} />
        <TextField label="Low stock limit" value={form.low_stock_limit} error={errors.low_stock_limit} type="number" onChange={(low_stock_limit) => setForm({ ...form, low_stock_limit })} />
        <Button className="w-full" type="submit">
          Save Item
        </Button>
      </form>
    </Modal>
  );
}

function MovementForm({ data, onClose, onSaved }) {
  const [form, setForm] = useState({
    item_id: data.item.id,
    type: data.type,
    quantity: '',
    unit_price: '',
    supplier_name: data.item.supplier_name,
    note: '',
    date: todayKey(),
  });
  const [errors, setErrors] = useState({});
  const isIn = data.type === 'IN';

  function validate() {
    const quantityError = validatePositive(form.quantity, 'Quantity');
    const available = Number(data.item.current_stock || 0);
    const requested = Number(form.quantity || 0);
    const next = {
      quantity: !isIn && requested > available ? `Stock Out cannot be more than ${available} ${data.item.unit || 'Qty'}` : quantityError,
      unit_price: isIn ? validatePositive(form.unit_price, 'Price') : '',
      supplier_name: isIn ? required(form.supplier_name, 'Supplier name') : '',
      date: validateNotFutureDate(form.date),
    };
    setErrors(next);
    return !firstError(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    await addStockTransaction(form);
    onSaved();
  }

  return (
    <Modal title={`${isIn ? 'Stock In' : 'Stock Out'}: ${data.item.name}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <div className={`rounded-lg p-4 ${isIn ? 'bg-blue-50 text-blue-900' : 'bg-sky-50 text-sky-900'}`}>
          <div className="flex items-center gap-2 font-bold">
            {isIn ? 'Material received' : 'Material used'}
          </div>
        </div>
        <TextField label={`Quantity (${data.item.unit || 'Qty'})`} value={form.quantity} error={errors.quantity} type="number" clearZero onChange={(quantity) => setForm({ ...form, quantity })} />
        {isIn ? (
          <>
            <TextField label="Price" value={form.unit_price} error={errors.unit_price} type="number" clearZero onChange={(unit_price) => setForm({ ...form, unit_price })} />
            <TextField label="Supplier name" value={form.supplier_name} error={errors.supplier_name} onChange={(supplier_name) => setForm({ ...form, supplier_name })} />
          </>
        ) : null}
        <TextField label="Date" value={form.date} error={errors.date} type="date" max={todayKey()} onChange={(date) => setForm({ ...form, date })} />
        <TextField label="Note" value={form.note} onChange={(note) => setForm({ ...form, note })} />
        <Button className="w-full" type="submit">
          Save Stock
        </Button>
      </form>
    </Modal>
  );
}

function TextField({ label, value, onChange, error, type = 'text', max, clearZero = false }) {
  return (
    <Field label={label} error={error}>
      <input
        className={inputClass()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (clearZero && Number(value) === 0) onChange('');
        }}
        onWheel={(event) => {
          if (type === 'number') event.currentTarget.blur();
        }}
        type={type}
        max={max}
      />
    </Field>
  );
}

function Info({ label, value, highlight = false, tone = '', bg = 'bg-blue-50' }) {
  return (
    <div className={`rounded-md p-3 ${highlight ? 'bg-blue-600 text-white' : `${bg} text-ink`}`}>
      <p className={`text-xs ${highlight ? 'text-white/80' : 'text-ink/60'}`}>{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
