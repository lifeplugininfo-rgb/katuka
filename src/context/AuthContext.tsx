import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../data/demoData';
import { auth, googleProvider, signInWithGoogle, signOutFromFirebase } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  currentUser: User;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isFirebaseSignedIn: boolean;
  loginAsRole: (role: UserRole) => void;
  loginWithGoogleAuth: () => Promise<{ success: boolean; error?: string }>;
  loginWithCredentials: (identifier: string, requiresOtp?: boolean) => Promise<{ success: boolean; requiresOtp?: boolean; message?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  allUsers: User[];
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('aems_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEMO_USERS[0]; // Default to Super Admin for immediate exploration
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aems_token') || 'demo-token');
  const [pendingOtpUserId, setPendingOtpUserId] = useState<string | null>(null);

  // Sync Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Map or enrich user
        setCurrentUser((prev) => ({
          ...prev,
          id: `fb-${fbUser.uid}`,
          name: fbUser.displayName || prev.name || 'Google Observer',
          email: fbUser.email || prev.email,
          phone: fbUser.phoneNumber || prev.phone,
          status: 'ACTIVE',
        }));
        const t = `fb-token-${fbUser.uid}`;
        setToken(t);
        localStorage.setItem('aems_token', t);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('aems_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const loginAsRole = (role: UserRole) => {
    const match = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setCurrentUser(match);
    const newToken = `aems-token-${match.id}-${Date.now()}`;
    setToken(newToken);
    localStorage.setItem('aems_token', newToken);
  };

  const setUserRole = (role: UserRole) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
    }));
  };

  const loginWithGoogleAuth = async () => {
    const res = await signInWithGoogle();
    if (res.success && res.user) {
      const fbUser = res.user;
      const enrichedUser: User = {
        id: `fb-${fbUser.uid}`,
        name: fbUser.displayName || 'Google Verified Observer',
        email: fbUser.email || 'observer@aems.org',
        phone: fbUser.phoneNumber || '+2348030000000',
        role: currentUser.role || 'OBSERVER',
        organization: 'Independent Civic Observer',
        status: 'ACTIVE',
        assignedWardIds: ['ward-01', 'ward-02'],
        assignedPuIds: ['pu-01', 'pu-02'],
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(enrichedUser);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const loginWithCredentials = async (identifier: string, requiresOtp = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, requires2FA: requiresOtp }),
      });
      const data = await res.json();
      if (data.requiresOtp) {
        setPendingOtpUserId(data.user.id);
        return { success: true, requiresOtp: true, message: data.message };
      }
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem('aems_token', data.token);
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const verifyOtp = async (otp: string) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingOtpUserId || currentUser.id, otp }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem('aems_token', data.token);
        setPendingOtpUserId(null);
        return { success: true };
      }
      return { success: false, message: data.message || 'OTP verification failed' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    await signOutFromFirebase();
    setFirebaseUser(null);
    loginAsRole('OBSERVER');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        token,
        isAuthenticated: !!currentUser,
        isFirebaseSignedIn: !!firebaseUser,
        loginAsRole,
        loginWithGoogleAuth,
        loginWithCredentials,
        verifyOtp,
        logout,
        allUsers: DEMO_USERS,
        setUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
