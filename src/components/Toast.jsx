import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');

  const showToast = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setMessage(''), 2400);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-md bg-ink px-4 py-3 text-center text-sm font-semibold text-white shadow-soft">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
