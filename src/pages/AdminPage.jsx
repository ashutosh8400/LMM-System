import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { createUser, listUsers, updateUserPermission } from '../services/userService.js';
import { required } from '../utils/validation.js';

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setUsers(await listUsers());
  }

  async function submit(event) {
    event.preventDefault();
    const nextError = required(name, 'User name');
    setError(nextError);
    if (nextError) return;

    try {
      await createUser(name, makeAdmin);
      setName('');
      setMakeAdmin(false);
      refresh();
    } catch (err) {
      setError(err.message || 'Unable to create user');
    }
  }

  async function updatePermission(target, changes) {
    if (target.id === user.id && changes.is_active === false) {
      return;
    }

    await updateUserPermission(target.id, {
      is_admin: Number(target.is_admin) === 1,
      is_active: Number(target.is_active) === 1,
      ...changes,
    });
    refresh();
  }

  if (Number(user?.is_admin) !== 1) {
    return (
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">Admin only</h2>
        <p className="mt-1 text-sm text-ink/65">You do not have permission to manage users.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">Create User</h2>
        <form className="mt-3 space-y-3" onSubmit={submit}>
          <Field label="User name" error={error}>
            <input
              className={inputClass()}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter user name"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-md bg-blue-50 px-3 text-sm font-semibold">
            <input
              checked={makeAdmin}
              className="h-5 w-5"
              onChange={(event) => setMakeAdmin(event.target.checked)}
              type="checkbox"
            />
            Make this user Admin
          </label>
          <Button className="w-full" type="submit">Create User</Button>
        </form>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">Manage Users</h2>
        <div className="mt-3 space-y-3">
          {users.map((item) => {
            const isSelf = item.id === user.id;
            const active = Number(item.is_active) === 1;
            const admin = Number(item.is_admin) === 1;

            return (
              <div key={item.id} className="rounded-md bg-field p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-ink/60">
                      {admin ? 'Admin' : 'User'} | {active ? 'Allowed' : 'Blocked'}
                    </p>
                  </div>
                  {isSelf ? <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">You</span> : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    disabled={isSelf}
                    variant={active ? 'secondary' : 'primary'}
                    onClick={() => updatePermission(item, { is_active: !active })}
                  >
                    {active ? 'Block Login' : 'Allow Login'}
                  </Button>
                  <Button
                    disabled={isSelf}
                    variant={admin ? 'secondary' : 'outline'}
                    onClick={() => updatePermission(item, { is_admin: !admin })}
                  >
                    {admin ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
