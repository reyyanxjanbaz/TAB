import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tab_token');
    if (!token) { setLoading(false); return; }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('tab_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, email) {
    const { token, user } = await api.register({ username, email });
    localStorage.setItem('tab_token', token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('tab_token');
    setUser(null);
  }

  async function updateUser(data) {
    const { user: updated } = await api.updateMe(data);
    setUser(updated);
    return updated;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
