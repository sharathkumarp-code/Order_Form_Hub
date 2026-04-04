import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

type User = {
  username: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("admin_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        sessionStorage.setItem("admin_user", JSON.stringify(data.user));
        toast({
          title: "Logged in",
          description: `Welcome back, ${data.user.username}`,
        });
        setLocation("/admin");
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: data.message || "Invalid credentials",
        });
        return false;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Failed to connect to the server",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("admin_user");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    setLocation("/login");
  };

  const changePassword = async (newPassword: string) => {
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Password updated successfully",
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to update password",
        });
        return false;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Failed to connect to the server",
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
