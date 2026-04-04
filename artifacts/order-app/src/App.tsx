import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "./pages/login";
import { AuthProvider, useAuth } from "./lib/auth-context";

import Dashboard from "./pages/admin/dashboard";
import FormBuilder from "./pages/admin/form-builder";
import Submissions from "./pages/admin/submissions";
import PublicOrderForm from "./pages/public/order-form";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/form/:slug" component={PublicOrderForm} />
      
      {/* Admin Routes */}
      <Route path="/">
        {() => {
          const { user } = useAuth();
          useEffect(() => {
            if (user) {
              window.location.replace(`${import.meta.env.BASE_URL}admin`);
            } else {
              window.location.replace(`${import.meta.env.BASE_URL}login`);
            }
          }, [user]);
          return null;
        }}
      </Route>

      <Route path="/admin">
        {(params) => <ProtectedRoute component={Dashboard} path="/admin" {...params} />}
      </Route>
      <Route path="/admin/forms/new">
        {(params) => <ProtectedRoute component={FormBuilder} path="/admin/forms/new" {...params} />}
      </Route>
      <Route path="/admin/forms/:id/edit">
        {(params) => <ProtectedRoute component={FormBuilder} path="/admin/forms/:id/edit" {...params} />}
      </Route>
      <Route path="/admin/forms/:id/submissions">
        {(params) => <ProtectedRoute component={Submissions} path="/admin/forms/:id/submissions" {...params} />}
      </Route>
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
