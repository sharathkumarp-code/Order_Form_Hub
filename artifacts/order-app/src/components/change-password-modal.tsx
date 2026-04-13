import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export function ChangePasswordModal() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [open, setOpen] = useState(false);
  const { changePassword } = useAuth();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    const success = await changePassword(newPassword);
    if (success) {
      setOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal text-primary/80 hover:text-primary transition-colors">
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900">
            Update Credentials
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password text-slate-700">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-purple-500/20"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password text-slate-700">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-purple-500/20"
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-200 text-white font-bold"
            >
              Update Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
