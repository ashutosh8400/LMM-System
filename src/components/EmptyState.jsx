export default function EmptyState({ title, text }) {
  return (
    <section className="rounded-lg border border-dashed border-black/20 p-6 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink/65">{text}</p>
    </section>
  );
}
