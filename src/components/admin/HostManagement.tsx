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
  commission_rate: number;
  stripe_connect_account_id: string;
  host_onboarding_completed: boolean;
}

const HostManagement = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch host applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('host_applications')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .order('submitted_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch approved hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_host', true)
        .order('host_application_date', { ascending: false });

      if (hostsError) throw hostsError;

      setApplications(applicationsData || []);
      setHosts(hostsData || []);
    } catch (error) {
      console.error('Error fetching host data:', error);
      toast.error('Failed to load host data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationReview = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.rpc('approve_host_application', {
        application_id: applicationId,
        admin_notes: adminNotes
      });

      if (error) throw error;

      toast.success(`Application ${action}d successfully`);
      fetchData();
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error(`Failed to ${action} application`);
    }
  };

  const updateHostCommission = async (hostId: string, commissionRate: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_rate: commissionRate })
        .eq('id', hostId);

      if (error) throw error;

      toast.success('Commission rate updated successfully');
      setEditingHost(null);
      fetchData();
    } catch (error) {
      console.error('Error updating commission rate:', error);
      toast.error('Failed to update commission rate');
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
                <TableHead>Commission Rate</TableHead>
                <TableHead>Stripe Connected</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell className="font-medium">{host.full_name}</TableCell>
                  <TableCell>{host.email}</TableCell>
                  <TableCell>{host.commission_rate}%</TableCell>
                  <TableCell>
                    <Badge variant={host.stripe_connect_account_id ? 'default' : 'secondary'}>
                      {host.stripe_connect_account_id ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingHost(host);
                            setNewCommissionRate(host.commission_rate.toString());
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
                            <Label htmlFor="commission-rate">Commission Rate (%)</Label>
                            <Input
                              id="commission-rate"
                              type="number"
                              value={newCommissionRate}
                              onChange={(e) => setNewCommissionRate(e.target.value)}
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </div>
                          <Button 
                            onClick={() => editingHost && updateHostCommission(editingHost.id, parseFloat(newCommissionRate))}
                          >
                            Update Commission Rate
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