import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
}

const App = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("talknest_token"));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem("talknest_user");
    return u ? JSON.parse(u) : null;
  });

  useEffect(() => {
    if (token && !user) {
      setToken(null);
      localStorage.removeItem("talknest_token");
    }
  }, [token, user]);

  const handleAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("talknest_token", newToken);
    localStorage.setItem("talknest_user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("talknest_token");
    localStorage.removeItem("talknest_user");
  };

  if (!token || !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Auth onAuth={handleAuth} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index user={user} token={token} onLogout={handleLogout} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
