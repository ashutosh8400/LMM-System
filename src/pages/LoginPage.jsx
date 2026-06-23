import { useState } from 'react';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { required } from '../utils/validation.js';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  async function submit(event) {
    event.preventDefault();
    const message = required(name, 'User name');
    setError(message);
    if (message) return;
    try {
      await login(name);
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-field p-4 text-ink">
      <section className="w-full max-w-sm rounded-lg bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Construction Manager</p>
        <h1 className="mt-1 text-2xl font-bold">Select User</h1>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <Field label="User name" error={error}>
            <input
              className={inputClass()}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter user name"
            />
          </Field>
          <Button className="w-full" type="submit">Login</Button>
        </form>
      </section>
    </main>
  );
}
