import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Mail, Copy } from "lucide-react";

export const HostInvitationDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Skriv en giltig e-postadress");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-host-invitation", {
        body: { refereeEmail: email },
      });

      if (error) throw error;

      setReferralCode(data.referralCode);
      toast.success("Inbjudan är skickad!");
      setEmail("");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Det gick inte att skicka inbjudan");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Inbjudningskoden är kopierad!");
  };

  const handleClose = () => {
    setOpen(false);
    setReferralCode("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Bjud in värd
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bjud in en ny värd</DialogTitle>
          <DialogDescription>
            Bjud in någon att bli värd. När personen har gått med får du en rabattkod på 20 % till butiken Nordic Collection!
          </DialogDescription>
        </DialogHeader>

        {!referralCode ? (
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">E-postadress</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="namn@exempel.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Skickar …" : "Skicka inbjudan"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Inbjudan är skickad! 🎉</p>
              <p className="text-sm text-muted-foreground">
                Din inbjudningskod har skickats till {email}. Koden kan också användas direkt:
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-background px-3 py-2 rounded border font-mono text-sm">
                  {referralCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyReferralCode}
                  aria-label="Kopiera inbjudningskoden"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Klar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};