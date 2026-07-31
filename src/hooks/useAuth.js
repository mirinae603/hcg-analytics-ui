"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser, isTokenValid, getTokenExpiryMs, setSession, clearSession } from '@/utils/auth';

// Real, server-verified session (JWT). Sign-in stores the token the backend issued
// (see app/core/jwt_auth.py) plus the decoded user (id/name/email/role/status); every
// protected request attaches it as `Authorization: Bearer <token>`. Session validity is
// the JWT's own expiry (12h server-side, app/core/config.py JWT_EXPIRE_MINUTES) — no
// separate client-side timer duplicating that number, just an auto-logout scheduled at
// the real exp claim.
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const logoutTimer = useRef(null);

  const logout = useCallback(() => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
    clearSession();
    setIsLoggedIn(false);
    setUser(null);
    router.push('/signin');
  }, [router]);

  useEffect(() => {
    const token = getToken();
    const valid = isTokenValid(token);
    setIsLoggedIn(valid);
    setUser(valid ? getUser() : null);
    setIsChecking(false);

    if (!valid && window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
      router.push('/signin');
    }

    if (valid) {
      const remaining = getTokenExpiryMs(token) - Date.now();
      if (remaining > 0) {
        logoutTimer.current = setTimeout(() => logout(), remaining);
      } else {
        logout();
      }
    }

    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
    // Runs once per mount: each component instance re-reads the shared localStorage
    // session for itself (same pattern the old flag-based version used), so a fresh
    // sign-in is picked up the moment a gated layout mounts after the /signin redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((token, userData) => {
    setSession(token, userData);
    setUser(userData);
    setIsLoggedIn(true);
    router.push('/');
  }, [router]);

  return {
    isLoggedIn,
    isChecking,
    user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
  };
}
