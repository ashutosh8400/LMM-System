import { createContext, useContext, useMemo, useState } from 'react';
import { clearStoredUser, getStoredUser, loginUser } from '../services/userService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  async function login(name) {
    const nextUser = await loginUser(name);
    setUser(nextUser);
  }

  function logout() {
    clearStoredUser();
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
