/* ============================================================
   ActiveMemberContext
   Persists the currently selected CRM member in localStorage.
   Any component can read activeMember or call setActiveMember.
   ============================================================ */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ActiveMember {
  id: string;
  name: string;
  color: string;
  role: string;
}

interface ActiveMemberContextValue {
  activeMember: ActiveMember | null;
  setActiveMember: (m: ActiveMember | null) => void;
}

const ActiveMemberContext = createContext<ActiveMemberContextValue>({
  activeMember: null,
  setActiveMember: () => {},
});

const STORAGE_KEY = "crm_active_member";

export function ActiveMemberProvider({ children }: { children: ReactNode }) {
  const [activeMember, setActiveMemberState] = useState<ActiveMember | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ActiveMember) : null;
    } catch {
      return null;
    }
  });

  const setActiveMember = useCallback((m: ActiveMember | null) => {
    setActiveMemberState(m);
    if (m) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ActiveMemberContext.Provider value={{ activeMember, setActiveMember }}>
      {children}
    </ActiveMemberContext.Provider>
  );
}

export function useActiveMember() {
  return useContext(ActiveMemberContext);
}
