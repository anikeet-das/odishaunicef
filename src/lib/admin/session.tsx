import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ADMIN_KEY } from "@/lib/data/reset";

type Ctx = { unlocked: boolean; tryUnlock: (pw: string) => boolean; lock: () => void };
const C = createContext<Ctx>({ unlocked: false, tryUnlock: () => false, lock: () => {} });

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  // Restore from session storage so reload within a tab keeps state.
  useEffect(() => {
    try { if (sessionStorage.getItem("crsap.admin") === "1") setUnlocked(true); } catch {}
  }, []);
  function tryUnlock(pw: string) {
    if (pw === ADMIN_KEY) {
      setUnlocked(true);
      try { sessionStorage.setItem("crsap.admin", "1"); } catch {}
      return true;
    }
    return false;
  }
  function lock() {
    setUnlocked(false);
    try { sessionStorage.removeItem("crsap.admin"); } catch {}
  }
  return <C.Provider value={{ unlocked, tryUnlock, lock }}>{children}</C.Provider>;
}

export const useAdminSession = () => useContext(C);