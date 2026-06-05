/* ============================================================
   Law Firm CRM — App Entry
   Design: Dark Luxury Legal — Navy + Gold
   Layout: Fixed left sidebar + main content area
   ============================================================ */

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CRMProvider } from "./contexts/CRMContext";
import { ActiveMemberProvider, useActiveMember } from "./contexts/ActiveMemberContext";
import Layout from "./components/Layout";
import LockScreen from "./components/LockScreen";
import MemberSelectScreen from "./components/MemberSelectScreen";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Payments from "./pages/Payments";
import Clients from "./pages/Clients";
import CloseDay from "./pages/CloseDay";
import AllData from "./pages/AllData";
import FollowUps from "./pages/FollowUps";
import Settings from "./pages/Settings";
import Members from "./pages/Members";
import PipelineEditor from "./pages/PipelineEditor";
import Intelligence from "./pages/Intelligence";
import NotFound from "./pages/NotFound";
import { trpc } from "@/lib/trpc";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route path="/payments" component={Payments} />
        <Route path="/clients" component={Clients} />
        <Route path="/close-day" component={CloseDay} />
        <Route path="/all-data" component={AllData} />
        <Route path="/follow-ups" component={FollowUps} />
        <Route path="/settings" component={Settings} />
        <Route path="/members" component={Members} />
        <Route path="/pipeline-editor" component={PipelineEditor} />
        <Route path="/intelligence" component={Intelligence} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// Inner gate that runs inside ActiveMemberProvider so it can read activeMember
function MemberGate({ children }: { children: React.ReactNode }) {
  const { activeMember } = useActiveMember();
  const [memberSelected, setMemberSelected] = useState(() => activeMember !== null);

  // If activeMember was already in localStorage, skip the screen
  if (memberSelected && activeMember) {
    return <>{children}</>;
  }

  return (
    <MemberSelectScreen
      onSelect={() => setMemberSelected(true)}
    />
  );
}

function AppGate() {
  // Check if already unlocked this session
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem("crm_unlocked") === "1";
  });

  // Ask server if an access code is required
  const { data: accessData, isLoading } = trpc.access.isRequired.useQuery(undefined, {
    // Only query if not already unlocked
    enabled: !unlocked,
    retry: false,
  });

  // If server says no code is required, auto-unlock
  useEffect(() => {
    if (accessData && !accessData.required) {
      setUnlocked(true);
    }
  }, [accessData]);

  // While checking, show the dark background (avoids flash)
  if (!unlocked && isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "oklch(0.13 0.025 250)" }} />
    );
  }

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <ActiveMemberProvider>
      <CRMProvider>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <MemberGate>
            <Router />
          </MemberGate>
        </TooltipProvider>
      </CRMProvider>
    </ActiveMemberProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AppGate />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
