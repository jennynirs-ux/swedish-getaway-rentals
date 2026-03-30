// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Trash2, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface YaleLock {
  id: string;
  property_id: string;
  lock_id: string;
  lock_name: string | null;
  access_duration_hours: number;
  is_active: boolean;
  last_sync: string | null;
  sync_status: string;
  error_message: string | null;
  created_at: string;
}

interface AccessLog {
  id: string;
  booking_id: string;
  access_code: string;
  valid_from: string;
  valid_to: string;
  status: string;
  error_message: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface YaleLockManagementProps {
  propertyId?: string;
}

export const YaleLockManagement = ({ propertyId }: YaleLockManagementProps) => {
  const [locks, setLocks] = useState<YaleLock[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lockToDelete, setLockToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLocks();
    if (propertyId) {
      fetchAccessLogs();
    }
  }, [propertyId]);

  const fetchLocks = async () => {
    try {
      setLoading(true);
      let query = supabase.from('yale_locks').select('id, property_id, lock_id, lock_name, access_duration_hours, is_active, last_sync, sync_status, error_message, created_at, updated_at');
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setLocks(data || []);
    } catch (error) {
      console.error('Error fetching locks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load smart locks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessLogs = async () => {
    if (!propertyId) return;
    
    try {
      const { data: lockIds } = await supabase
        .from('yale_locks')
        .select('id')
        .eq('property_id', propertyId);
      
      if (!lockIds || lockIds.length === 0) return;
      
      const { data, error } = await supabase
        .from('lock_access_log')
        .select('*')
        .in('yale_lock_id', lockIds.map(l => l.id))
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setAccessLogs(data || []);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    }
  };

  const handleRevokeCode = async (logId: string) => {
    try {
      // Call edge function which revokes on Seam (physical lock) + DB
      const { data, error } = await supabase.functions.invoke('revoke-access-code', {
        body: { logId },
      });

      if (error) throw error;

      toast({
        title: 'Code Revoked',
        description: 'Access code removed from lock and deactivated.',
      });

      fetchAccessLogs();
    } catch (error) {
      console.error('Error revoking code:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke access code',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLock = async () => {
    if (!lockToDelete) return;

    try {
      const { error } = await supabase
        .from('yale_locks')
        .delete()
        .eq('id', lockToDelete);

      if (error) throw error;

      toast({
        title: 'Lock Deleted',
        description: 'Smart lock has been removed',
      });

      fetchLocks();
    } catch (error) {
      console.error('Error deleting lock:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lock',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setLockToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      active: 'default',
      expired: 'secondary',
      revoked: 'destructive',
      failed: 'destructive',
    };
    
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading smart locks...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Connected Smart Locks
          </CardTitle>
          <CardDescription>
            Manage Yale Doorman smart locks for your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lock Name</TableHead>
                <TableHead>Lock ID</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No smart locks configured
                  </TableCell>
                </TableRow>
              ) : (
                locks.map((lock) => (
                  <TableRow key={lock.id}>
                    <TableCell>{lock.lock_name || 'Unnamed Lock'}</TableCell>
                    <TableCell className="font-mono text-sm">{lock.lock_id}</TableCell>
                    <TableCell>+{lock.access_duration_hours}h</TableCell>
                    <TableCell>
                      {lock.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {lock.last_sync
                        ? new Date(lock.last_sync).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchLocks()}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setLockToDelete(lock.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {propertyId && accessLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Access Code History</CardTitle>
            <CardDescription>
              Recent access codes generated for this property
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono">{log.access_code}</TableCell>
                    <TableCell>{new Date(log.valid_from).toLocaleString()}</TableCell>
                    <TableCell>{new Date(log.valid_to).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRevokeCode(log.id)}
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Smart Lock</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this smart lock? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLock} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
