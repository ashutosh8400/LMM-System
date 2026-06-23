import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import { useToast } from '../components/Toast.jsx';
import { exportDatabaseJson, importDatabaseJson } from '../db/database.js';

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
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
      showToast(`Backup saved: ${fileName}`);
    } catch (error) {
      showToast(error.message || 'Backup failed');
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
      showToast('Backup restored');
    } catch (error) {
      showToast(error.message || 'Restore failed');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-soft">
        <h2 className="text-lg font-bold">SQLite Backup</h2>
        <p className="mt-2 text-sm text-ink/70">
          Export and restore a local SQLite JSON backup. The same code path is compatible with Android and future iOS builds.
        </p>
        <div className="mt-4 grid gap-3">
          <Button disabled={busy} onClick={backup}>Create Backup</Button>
          <Button disabled={busy} variant="secondary" onClick={() => inputRef.current?.click()}>Restore Backup</Button>
          <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={restore} />
        </div>
      </section>
    </div>
  );
}
