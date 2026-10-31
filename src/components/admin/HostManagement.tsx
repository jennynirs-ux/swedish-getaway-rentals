import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { HOST_TERMS_VERSION } from "@/content/hostTerms";

interface HostApplication {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  experience: string;
  contact_phone: string;
  property_count: number;
  status: string;
  admin_notes: string;
  submitted_at: string;
  profiles: {
    email: string;
    full_name: string;
  } | null;
}

interface Host {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  is_host: boolean;
  host_approved: boolean;
  commission_rate: number | null;
  fee_offer_rate?: number | null;
  fee_offer_until?: string | null;
  stripe_connect_ready?: boolean;
  stripe_connect_account_id: string;
  host_onboarding_completed: boolean;
  host_terms_version?: string | null;
  host_terms_accepted_at?: string | null;
}

// set_host_commission_rate enforces the same range
const MIN_GUEST_FEE = 4;
const MAX_GUEST_FEE = 10;

/**
 * The fee guests pay today, as service_fee_rate() computes it: the host's rate
 * (10 % when none is set), or the founding offer while it runs if that is
 * lower. The database compares with current_date, which is the UTC date.
 */
function guestFee(host: Host): { rate: number; offer: { rate: number; until: string } | null } {
  const base = host.commission_rate != null ? Number(host.commission_rate) : MAX_GUEST_FEE;
  const until = host.fee_offer_until;
  if (host.fee_offer_rate == null || !until || until < new Date().toISOString().slice(0, 10)) {
    return { rate: base, offer: null };
  }
  const offer = { rate: Number(host.fee_offer_rate), until };
  return { rate: Math.min(base, offer.rate), offer };
}

const sekFromOre = (ore: number) =>
  `${(ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} SEK`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Stockholm" });

const HostManagement = () => {
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<HostApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState("");
  // What each host owes us and is not settled yet (host_charges, öre by host profile)
  const [openCharges, setOpenCharges] = useState<Map<string, number>>(new Map());
  // DAC7 tax details given (save-host-tax-profile); payouts wait for them
  const [taxDone, setTaxDone] = useState<Map<string, string>>(new Map());

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch host applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('host_applications')
        // Two FKs point at profiles (user_id, reviewed_by): name the applicant's
        .select(`
          *,
          profiles!host_applications_user_id_fkey(email, full_name)
        `)
        .order('submitted_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch approved hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_host', true)
        .order('created_at', { ascending: false });

      if (hostsError) throw hostsError;

      // E.g. the card fee of a booking the host cancelled. The payout job
      // deducts it from the host's next Stripe payout; for hosts paid by hand
      // it has to be deducted by hand.
      const { data: chargesData, error: chargesError } = await supabase
        .from('host_charges')
        .select('host_profile_id, amount')
        .is('settled_at', null);
      if (chargesError) console.error('Error fetching host charges:', chargesError);
      const owed = new Map<string, number>();
      for (const charge of chargesData ?? []) {
        owed.set(charge.host_profile_id, (owed.get(charge.host_profile_id) ?? 0) + charge.amount);
      }

      const { data: taxData, error: taxError } = await supabase
        .from('host_tax_profiles')
        .select('profile_id, seller_type, dac7_complete')
        .eq('dac7_complete', true);
      if (taxError) console.error('Error fetching tax details:', taxError);

      setApplications(applicationsData || []);
      setHosts(hostsData || []);
      setOpenCharges(owed);
      setTaxDone(new Map((taxData ?? []).map((t) => [t.profile_id, t.seller_type === 'entity' ? 'Company' : 'Private person'])));
    } catch (error) {
      console.error('Error fetching host data:', error);
      toast.error('Failed to load host data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationReview = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.rpc('review_host_application', {
        _application_id: applicationId,
        _approve: action === 'approve',
        _admin_notes: adminNotes.trim() || null,
      });

      if (error) throw error;

      const status = action === 'approve' ? 'approved' : 'rejected';
      toast.success(`Application ${status}`);
      setSelectedApplication((current) => current && { ...current, status });
      fetchData();
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error(`Failed to ${action} application`);
    }
  };

  const updateHostCommission = async (host: Host, commissionRate: number) => {
    if (!Number.isFinite(commissionRate) || commissionRate < MIN_GUEST_FEE || commissionRate > MAX_GUEST_FEE) {
      toast.error(`The guest service fee must be between ${MIN_GUEST_FEE}% and ${MAX_GUEST_FEE}%`);
      return;
    }
    try {
      // RLS has no admin UPDATE on other profiles; the function checks the role
      const { error } = await supabase.rpc('set_host_commission_rate', {
        _profile_id: host.id,
        _rate: commissionRate,
      });

      if (error) throw error;

      const { offer } = guestFee(host);
      toast.success(
        offer && offer.rate < commissionRate
          ? `Guest service fee set to ${commissionRate}%. Guests pay the ${offer.rate}% founding offer until ${offer.until}, then ${commissionRate}%.`
          : 'Guest service fee updated',
      );
      setEditingHost(null);
      fetchData();
    } catch (error) {
      console.error('Error updating guest service fee:', error);
      toast.error((error as { message?: string })?.message || 'Failed to update the guest service fee');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading host management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Host Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Host Applications ({applications.filter(app => app.status === 'pending').length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.business_name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{application.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{application.profiles?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={application.status === 'pending' ? 'secondary' : 
                                 application.status === 'approved' ? 'default' : 'destructive'}>
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(application.submitted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setAdminNotes(application.admin_notes || "");
                            }}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Host Application</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Business Name</h4>
                              <p>{selectedApplication?.business_name}</p>
                            </div>
                            <div>
                              <h4 className="font-medium">Description</h4>
                              <p>{selectedApplication?.description}</p>
                            </div>
                            <div>
                              <h4 className="font-medium">Experience</h4>
                              <p>{selectedApplication?.experience}</p>
                            </div>
                            <div>
                              <Label htmlFor="admin-notes">Admin Notes</Label>
                              <Textarea
                                id="admin-notes"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Add notes about this application..."
                              />
                            </div>
                            {selectedApplication?.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => selectedApplication && handleApplicationReview(selectedApplication.id, 'approve')}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => selectedApplication && handleApplicationReview(selectedApplication.id, 'reject')}
                                  className="flex items-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approved Hosts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Approved Hosts ({hosts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Guest fee</TableHead>
                <TableHead>Payouts</TableHead>
                <TableHead>Host terms</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell className="font-medium">{host.full_name}</TableCell>
                  <TableCell>{host.email}</TableCell>
                  <TableCell>
                    {(() => {
                      // What guests pay today, as service_fee_rate() computes it
                      const fee = guestFee(host);
                      const base = host.commission_rate != null ? Number(host.commission_rate) : MAX_GUEST_FEE;
                      return fee.offer && fee.offer.rate < base ? (
                        <span title={`Founding-host offer of ${fee.offer.rate}% until ${fee.offer.until}, then ${base}%`}>
                          {fee.rate}% until {fee.offer.until}
                        </span>
                      ) : (
                        <span title={host.commission_rate == null ? 'No rate set: the default 10% applies' : undefined}>
                          {fee.rate}%
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={host.stripe_connect_ready ? 'default' : 'secondary'}>
                      {host.stripe_connect_ready ? 'Ready' : host.stripe_connect_account_id ? 'Setup unfinished' : 'Not connected'}
                    </Badge>
                    {/* Without a ready account the guest's payment lands on the
                        platform account and the booking is flagged "pay by hand" */}
                    {!host.stripe_connect_ready && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Payments land in our account: pay this host by hand
                      </div>
                    )}
                    {(openCharges.get(host.id) ?? 0) > 0 && (
                      <div
                        className="text-xs text-amber-700 mt-1"
                        title={
                          host.stripe_connect_ready
                            ? 'Deducted from the host\'s next Stripe payout'
                            : 'Deduct it the next time you pay this host by hand (Bookings → Markera som betald)'
                        }
                      >
                        Owes us {sekFromOre(openCharges.get(host.id) ?? 0)}
                        {host.stripe_connect_ready ? ' (from next payout)' : ' (deduct by hand)'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {host.host_terms_accepted_at ? (
                      <div>
                        <Badge variant={host.host_terms_version === HOST_TERMS_VERSION ? 'default' : 'secondary'}>
                          {host.host_terms_version === HOST_TERMS_VERSION ? 'Accepted' : 'Older version'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {host.host_terms_version ?? '?'}, {shortDate(host.host_terms_accepted_at)}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline">Not accepted</Badge>
                    )}
                    <div className="mt-1">
                      {taxDone.has(host.id) ? (
                        <Badge variant="secondary">Tax details: {taxDone.get(host.id)}</Badge>
                      ) : (
                        <Badge variant="outline">No tax details</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingHost(host);
                            setNewCommissionRate(String(host.commission_rate ?? MAX_GUEST_FEE));
                          }}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Host Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="commission-rate">Guest service fee (%)</Label>
                            <Input
                              id="commission-rate"
                              type="number"
                              value={newCommissionRate}
                              onChange={(e) => setNewCommissionRate(e.target.value)}
                              min={MIN_GUEST_FEE}
                              max={MAX_GUEST_FEE}
                              step="0.5"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              The guest pays this on top of the host's price. 4–10%. 4% covers card fees; the site tells
                              guests the fee is 10% or less.
                            </p>
                            {editingHost && guestFee(editingHost).offer && (
                              <p className="text-xs text-amber-700 mt-1">
                                A founding-host offer of {guestFee(editingHost).offer?.rate}% runs until{' '}
                                {guestFee(editingHost).offer?.until}. Until then guests pay the lower of the offer and
                                this rate.
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={() => editingHost && updateHostCommission(editingHost, parseFloat(newCommissionRate))}
                          >
                            Update guest fee
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostManagement;