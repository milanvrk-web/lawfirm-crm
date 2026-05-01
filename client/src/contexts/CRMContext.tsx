/* ============================================================
   Law Firm CRM — Global State Context
   Wraps all CRM data operations with React context
   ============================================================ */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type CRMData,
  type DayClose,
  type Lead,
  type Payment,
  addLead,
  addPayment,
  closeDayRecord,
  deleteLead,
  deletePayment,
  loadData,
  saveData,
  updateLead,
  updatePayment,
} from "@/lib/store";

interface CRMContextValue {
  data: CRMData;
  addLead: (lead: Omit<Lead, "id">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  closeDay: (date: string) => void;
  isDayClosed: (date: string) => boolean;
  getDayClose: (date: string) => DayClose | undefined;
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CRMData>(() => loadData());

  // Persist on every change
  useEffect(() => {
    saveData(data);
  }, [data]);

  const handleAddLead = useCallback((lead: Omit<Lead, "id">) => {
    setData(d => addLead(d, lead));
  }, []);

  const handleUpdateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setData(d => updateLead(d, id, updates));
  }, []);

  const handleDeleteLead = useCallback((id: string) => {
    setData(d => deleteLead(d, id));
  }, []);

  const handleAddPayment = useCallback((payment: Omit<Payment, "id">) => {
    setData(d => addPayment(d, payment));
  }, []);

  const handleUpdatePayment = useCallback((id: string, updates: Partial<Payment>) => {
    setData(d => updatePayment(d, id, updates));
  }, []);

  const handleDeletePayment = useCallback((id: string) => {
    setData(d => deletePayment(d, id));
  }, []);

  const handleCloseDay = useCallback((date: string) => {
    setData(d => closeDayRecord(d, date));
  }, []);

  const isDayClosed = useCallback((date: string) => {
    return data.dayCloses.some(dc => dc.date === date);
  }, [data.dayCloses]);

  const getDayClose = useCallback((date: string) => {
    return data.dayCloses.find(dc => dc.date === date);
  }, [data.dayCloses]);

  return (
    <CRMContext.Provider value={{
      data,
      addLead: handleAddLead,
      updateLead: handleUpdateLead,
      deleteLead: handleDeleteLead,
      addPayment: handleAddPayment,
      updatePayment: handleUpdatePayment,
      deletePayment: handleDeletePayment,
      closeDay: handleCloseDay,
      isDayClosed,
      getDayClose,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}
