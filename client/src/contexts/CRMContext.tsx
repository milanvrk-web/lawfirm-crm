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
  type FollowUp,
  type Targets,
  addLead,
  addPayment,
  closeDayRecord,
  deleteLead,
  deletePayment,
  loadData,
  saveData,
  updateLead,
  updatePayment,
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  addFollowUpComment,
  addLeadNote,
  loadTargets,
  saveTargets,
} from "@/lib/store";

interface CRMContextValue {
  data: CRMData;
  targets: Targets;
  updateTargets: (t: Targets) => void;
  // Leads
  addLead: (lead: Omit<Lead, "id">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  // Payments
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  // Day Close
  closeDay: (date: string) => void;
  isDayClosed: (date: string) => boolean;
  getDayClose: (date: string) => DayClose | undefined;
  // Follow-Ups
  addFollowUp: (fu: Omit<FollowUp, "id" | "createdAt" | "comments">) => void;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => void;
  deleteFollowUp: (id: string) => void;
  addFollowUpComment: (followUpId: string, initial: string, text: string) => void;
  // Lead Notes
  addLeadNote: (leadId: string, text: string) => void;
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CRMData>(() => loadData());
  const [targets, setTargets] = useState<Targets>(() => loadTargets());

  // Persist on every change
  useEffect(() => {
    saveData(data);
  }, [data]);

  const handleUpdateTargets = useCallback((t: Targets) => {
    setTargets(t);
    saveTargets(t);
  }, []);

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

  // Follow-Up handlers
  const handleAddFollowUp = useCallback((fu: Omit<FollowUp, "id" | "createdAt" | "comments">) => {
    setData(d => addFollowUp(d, fu));
  }, []);
  const handleUpdateFollowUp = useCallback((id: string, updates: Partial<FollowUp>) => {
    setData(d => updateFollowUp(d, id, updates));
  }, []);
  const handleDeleteFollowUp = useCallback((id: string) => {
    setData(d => deleteFollowUp(d, id));
  }, []);
  const handleAddFollowUpComment = useCallback((followUpId: string, initial: string, text: string) => {
    setData(d => addFollowUpComment(d, followUpId, initial, text));
  }, []);
  const handleAddLeadNote = useCallback((leadId: string, text: string) => {
    setData(d => addLeadNote(d, leadId, text));
  }, []);

  return (
    <CRMContext.Provider value={{
      data,
      targets,
      updateTargets: handleUpdateTargets,
      addLead: handleAddLead,
      updateLead: handleUpdateLead,
      deleteLead: handleDeleteLead,
      addPayment: handleAddPayment,
      updatePayment: handleUpdatePayment,
      deletePayment: handleDeletePayment,
      closeDay: handleCloseDay,
      isDayClosed,
      getDayClose,
      addFollowUp: handleAddFollowUp,
      updateFollowUp: handleUpdateFollowUp,
      deleteFollowUp: handleDeleteFollowUp,
      addFollowUpComment: handleAddFollowUpComment,
      addLeadNote: handleAddLeadNote,
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
