import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { isTokenValid } from './apiClient';
import jwtDecode from 'jwt-decode';
import { getAccessToken, getRefreshToken, saveAccessToken, saveRefreshToken, deleteTokens } from './authStorage';

type User = { userId: string; correo: string; nombre: string; apellido: string; rol: string } | null;

const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const access = await getAccessToken();
      const refresh = await getRefreshToken();
      if (access && isTokenValid(access)) {
        try { const decoded: any = jwtDecode(access); setUser({ userId: decoded.sub, correo: decoded.email, nombre: decoded.nombre ?? '', apellido: decoded.apellido ?? '', rol: decoded.rol ?? '' }); } catch(e) { }
        setLoading(false);
        return;
      }

      if (refresh) {
        try {
          const res = await api.post('/auth/refresh', { refreshToken: refresh });
          if (res.data?.access_token) {
            await saveAccessToken(res.data.access_token);
            if (res.data?.refresh_token) await saveRefreshToken(res.data.refresh_token);
            const decoded: any = jwtDecode(res.data.access_token);
            setUser({ userId: decoded.sub, correo: decoded.email, nombre: decoded.nombre ?? '', apellido: decoded.apellido ?? '', rol: decoded.rol ?? '' });
            setLoading(false);
            return;
          }
        } catch (e) {
          // refresh failed: fallthrough to unauth state
        }
      }

      setUser(null);
      setLoading(false);
    })();
  }, []);

  async function login(credentials: { correo: string; password: string }) {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.access_token) {
      await saveAccessToken(res.data.access_token);
      if (res.data?.refresh_token) await saveRefreshToken(res.data.refresh_token);
      const decoded: any = jwtDecode(res.data.access_token);
      setUser({ userId: decoded.sub, correo: decoded.email, nombre: decoded.nombre ?? '', apellido: decoded.apellido ?? '', rol: decoded.rol ?? '' });
      return true;
    }
    return false;
  }

  async function logout() {
    const refresh = await getRefreshToken();
    if (refresh) {
      try { await api.post('/auth/logout', { refreshToken: refresh }); } catch (e) { }
    }
    await deleteTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
