"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Real session auth (restored). Sign-in sets a timestamped localStorage session;
// protected routes redirect to /signin when there is no valid session.
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  const logout = useCallback(() => {
    localStorage.setItem('loggedIn', 'false');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    router.push('/signin');
  }, [router]);

  const checkSessionExpiry = useCallback(() => {
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    const loginTime = localStorage.getItem('loginTime');
    if (loggedIn && loginTime) {
      const timeElapsed = Date.now() - parseInt(loginTime);
      if (timeElapsed >= SESSION_DURATION) {
        logout();
        return false;
      }
      return true;
    }
    return false;
  }, [logout, SESSION_DURATION]);

  useEffect(() => {
    const isValid = checkSessionExpiry();
    setIsLoggedIn(isValid);
    setIsChecking(false);

    if (!isValid && window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
      router.push('/signin');
    }

    if (isValid) {
      const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
      const timeRemaining = SESSION_DURATION - (Date.now() - loginTime);
      if (timeRemaining > 0) {
        const timeoutId = setTimeout(() => logout(), timeRemaining);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [checkSessionExpiry, logout, router, SESSION_DURATION]);

  const login = () => {
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('loginTime', Date.now().toString());
    setIsLoggedIn(true);
    router.push('/');
  };

  return { isLoggedIn, isChecking, login, logout };
}
