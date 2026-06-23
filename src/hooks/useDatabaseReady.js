import { useEffect, useState } from 'react';
import { initDatabase } from '../db/database.js';

export function useDatabaseReady() {
  const [state, setState] = useState({ ready: false, error: '' });

  useEffect(() => {
    let active = true;
    initDatabase()
      .then(() => active && setState({ ready: true, error: '' }))
      .catch((error) => active && setState({ ready: false, error: error.message || 'Unable to open SQLite' }));

    return () => {
      active = false;
    };
  }, []);

  return state;
}
