/* ============================================================
   Law Firm CRM — App Entry
   Design: Dark Luxury Legal — Navy + Gold
   Layout: Fixed left sidebar + main content area
   ============================================================ */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CRMProvider } from "./contexts/CRMContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Payments from "./pages/Payments";
import Clients from "./pages/Clients";
import CloseDay from "./pages/CloseDay";
import AllData from "./pages/AllData";
import FollowUps from "./pages/FollowUps";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <CRMProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </CRMProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
