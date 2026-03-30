import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "./pages/admin/dashboard";
import FormBuilder from "./pages/admin/form-builder";
import Submissions from "./pages/admin/submissions";
import PublicOrderForm from "./pages/public/order-form";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/" component={() => {
        window.location.replace(`${import.meta.env.BASE_URL}admin`);
        return null;
      }} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/forms/new" component={FormBuilder} />
      <Route path="/admin/forms/:id/edit" component={FormBuilder} />
      <Route path="/admin/forms/:id/submissions" component={Submissions} />
      
      {/* Public Route */}
      <Route path="/form/:slug" component={PublicOrderForm} />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
