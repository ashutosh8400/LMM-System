import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';
import { exportDatabaseJson, importDatabaseJson } from '../db/database.js';

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const { showToast } = useToast();

  async function backup() {
    setBusy(true);
    try {
      const data = await exportDatabaseJson();
      const fileName = `construction-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      const text = `Backup saved in Documents: ${fileName}`;
      setMessage(text);
      showToast('Backup saved');
    } catch (error) {
      const text = error.message || 'Backup failed';
      setMessage(text);
      showToast(text);
    } finally {
      setBusy(false);
    }
  }

  async function restore(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      await importDatabaseJson(JSON.parse(text));
      const success = 'Backup restored. Your old data is back.';
      setMessage(success);
      showToast('Backup restored');
    } catch (error) {
      const text = error.message || 'Restore failed';
      setMessage(text);
      showToast(text);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">Backup & Restore</h2>
        <div className="mt-2 space-y-2 text-sm text-ink/70">
          <p>Uninstall karne se pehle backup banao. Reinstall ke baad isi file se data wapas restore ho jayega.</p>
          <p>Backup file phone ke Documents/Files folder mein save hoti hai. Is file ko delete mat karna.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <Button disabled={busy} onClick={backup}>{busy ? 'Please wait...' : 'Create Backup'}</Button>
          <Button disabled={busy} variant="secondary" onClick={() => inputRef.current?.click()}>Restore Backup</Button>
          <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={restore} />
        </div>
        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</p> : null}
      </section>
    </div>
  );
}
