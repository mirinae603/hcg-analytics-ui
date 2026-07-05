"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  // POC: auth disabled (backend UserService not deployed). Always authenticated.
  return { isLoggedIn: true, isChecking: false, login: () => {}, logout: () => {} };
}

function useAuthLegacy() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  const SESSION_DURATION = 1 * 60 * 60 * 1000; // 6 hours in milliseconds
// const SESSION_DURATION = 1 * 60 * 1000;

  const logout = useCallback(() => {
    localStorage.setItem('loggedIn', 'false');
    localStorage.removeItem('loginTime');
    setIsLoggedIn(false);
    router.push('/signin');
  }, [router]);

  const checkSessionExpiry = useCallback(() => {
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    const loginTime = localStorage.getItem('loginTime');
    
    if (loggedIn && loginTime) {
      const currentTime = Date.now();
      const timeElapsed = currentTime - parseInt(loginTime);
      
      if (timeElapsed >= SESSION_DURATION) {
        logout();
        return false;
      }
      return true;
    }
    return false;
  }, [logout]);

  useEffect(() => {
    const isValid = checkSessionExpiry();
    setIsLoggedIn(isValid);
    setIsChecking(false);
    
    if (!isValid && window.location.pathname !== '/signin') {
      router.push('/signin');
    }

    // Set up automatic logout timer
    if (isValid) {
      const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
      const timeElapsed = Date.now() - loginTime;
      const timeRemaining = SESSION_DURATION - timeElapsed;
      
      if (timeRemaining > 0) {
        const timeoutId = setTimeout(() => {
          logout();
        }, timeRemaining);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [checkSessionExpiry, logout]);

  const login = () => {
    const currentTime = Date.now().toString();
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('loginTime', currentTime);
    setIsLoggedIn(true);
    router.push('/');
  };

  return { isLoggedIn, isChecking, login, logout };
}
