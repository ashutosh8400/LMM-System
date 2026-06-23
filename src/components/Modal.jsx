import Button from './Button.jsx';

export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-auto rounded-t-lg bg-field p-4 shadow-soft sm:max-w-lg sm:rounded-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button variant="secondary" className="min-h-9 px-3" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ink/75">{message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
