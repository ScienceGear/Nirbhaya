import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
  email: string;
  name: string;
}

const AuthContext = createContext<{
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string) => boolean;
  logout: () => void;
}>({ user: null, login: () => false, signup: () => false, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("sr-user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("sr-user", JSON.stringify(user));
    else localStorage.removeItem("sr-user");
  }, [user]);

  const login = (email: string, _password: string) => {
    const u = { email, name: email.split("@")[0] };
    setUser(u);
    return true;
  };

  const signup = (name: string, email: string, _password: string) => {
    setUser({ email, name });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
