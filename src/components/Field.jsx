export default function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink/80">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs font-medium text-red-700">{error}</span> : null}
    </label>
  );
}

export function inputClass() {
  return 'min-h-11 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
}
