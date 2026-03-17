import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SignedOut>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#2b2a27",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                color: "#da7756",
                fontSize: "2rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              Stella
            </h1>
            <p
              style={{
                color: "#6b6a65",
                fontSize: "0.875rem",
                marginBottom: "2rem",
              }}
            >
              Sign in to continue
            </p>
            <SignIn routing="hash" />
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SignedIn>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
