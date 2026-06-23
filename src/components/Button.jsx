export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand text-white shadow-sm active:bg-blue-800',
    secondary: 'bg-blue-100 text-blue-900 active:bg-blue-200',
    danger: 'bg-red-600 text-white active:bg-red-700',
    outline: 'border border-blue-200 bg-white text-blue-900 active:bg-blue-50',
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
