import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

export type UserRole = "user" | "guardian";

export interface SharingPrefs {
  location: boolean;
  routeInfo: boolean;
  sosAlerts: boolean;
  batteryLevel: boolean;
  checkpoints: boolean;
  incidentReports: boolean;
}

export interface User {
  _id: string;
  email: string;
  username: string;
  name: string;          // alias for username
  role: UserRole;
  phone?: string;
  linkCode?: string;
  points?: number;
  sharingPrefs?: SharingPrefs;
  guardianOf?: string[];
  myGuardians?: string[];
  emergencyContacts?: Array<{ name: string; phone: string; relation: string }>;
}

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<string | null>;
  signup: (name: string, email: string, password: string, role?: UserRole) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => null,
  signup: async () => null,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const toUser = (u: any): User => ({
    _id: u._id,
    email: u.email,
    username: u.username,
    name: u.username,
    role: u.role,
    phone: u.phone,
    linkCode: u.linkCode,
    points: u.points,
    sharingPrefs: u.sharingPrefs,
    guardianOf: u.guardianOf,
    myGuardians: u.myGuardians,
    emergencyContacts: u.emergencyContacts,
  });

  /* Check if already logged in (JWT cookie) */
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/check`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(toUser(data));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (email: string, password: string, role: UserRole = "user"): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) return data.message || "Login failed";
      setUser(toUser(data.user));
      return null; // success
    } catch (err: any) {
      return err.message || "Network error";
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole = "user"): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) return data.message || "Signup failed";
      setUser(toUser(data.user));
      return null; // success
    } catch (err: any) {
      return err.message || "Network error";
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

