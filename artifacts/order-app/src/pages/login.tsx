import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { Lock, User, LogIn } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Card className="bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600" />
          <CardHeader className="space-y-2 text-center pb-8 pt-8">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto bg-slate-50 p-3 rounded-2xl w-fit mb-2 border border-slate-100 shadow-sm"
            >
              <Lock className="w-8 h-8 text-purple-600" />
            </motion.div>
            <CardTitle className="text-4xl font-extrabold tracking-tight text-slate-900">
              Admin Hub
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Enter your credentials to access the management portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 text-sm font-semibold">Username</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 transition-all h-12 text-base"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-700 text-sm font-semibold">Password</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500/20 transition-all h-12 text-base"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg font-bold shadow-lg shadow-slate-200 transition-all duration-300 transform hover:translate-y-[-1px] active:translate-y-[0px] mt-2 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <LogIn className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <div className="flex justify-center pt-2">
                <ChangePasswordModal />
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-sm mt-8 font-medium">
          &copy; 2026 Kurryzo Order Form. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
