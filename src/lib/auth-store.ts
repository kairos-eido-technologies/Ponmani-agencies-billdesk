import { create } from 'zustand';
import { db, User } from './db/db';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loginWithPin: (username: string, pin: string) => boolean;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: db.getUsers()[0] || null, // Default to Admin on boot for smooth UX
  isAuthenticated: true,

  loginWithPin: (username: string, pin: string) => {
    const matchedUser = db.authenticate(username, pin);
    if (matchedUser) {
      set({ user: matchedUser, isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  initializeAuth: () => {
    const users = db.getUsers();
    if (users.length > 0) {
      set({ user: users[0], isAuthenticated: true });
    }
  },
}));
