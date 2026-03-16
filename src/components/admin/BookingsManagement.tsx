// IMP-005: TODO - Add bulk actions (select multiple bookings)
// IMP-006: TODO - Add email notification templates for status changes
// IMP-008: TODO - Add export functionality (CSV/PDF)
// IMP-010: TODO - Add audit log for booking status changes

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Edit, Search, Calendar, User, MapPin, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { logBookingStatusChange } from '@/lib/auditLog';

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  total_amount: number;
  status: string;
  special_requests: string;
  created_at: string;
  properties: {
    title: string;
    location: string;
  };
}

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ bookingId: string; newStatus: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings(0);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    filterBookings();
  }, [bookings, debouncedSearch, statusFilter]);

  const fetchBookings = async (page: number) => {
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('bookings')
        .select(`
          *,
          properties!inner(title, location)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setBookings(data || []);
      setCurrentPage(page);
      // IMP-005: Store total count for pagination display
      if (count !== null) {
        setTotalCount(count);
      }
      // Disable load more if we got fewer items than requested (meaning no more data)
      setHasMore((data?.length ?? 0) >= ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda bokningar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (debouncedSearch) {
      filtered = filtered.filter(booking =>
        booking.guest_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        booking.guest_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        booking.properties.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    // Optimistic update: update local state immediately
    const originalBookings = bookings;
    const oldBooking = bookings.find(b => b.id === bookingId);
    const oldStatus = oldBooking?.status || 'unknown';

    setBookings(bookings.map(b =>
      b.id === bookingId ? { ...b, status: newStatus } : b
    ));

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // IMP-007: Log the booking status change
      await logBookingStatusChange(bookingId, oldStatus, newStatus);

      toast({
        title: "Framgång",
        description: `Bokning ${newStatus === 'confirmed' ? 'bekräftad' : 'avbokad'}`
      });

      setConfirmDialog(null);
      // Refetch to ensure consistency with server
      fetchBookings(currentPage);
    } catch (error) {
      // Rollback on error
      setBookings(originalBookings);
      console.error('Error updating booking status:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera bokningsstatus",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    setConfirmDialog({ bookingId, newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Bekräftad</Badge>;
      case 'pending':
        return <Badge variant="secondary">Väntande</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Avbokad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bokningshantering</h2>
          <p className="text-muted-foreground">Hantera alla bokningar och reservationer</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök bokningar..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrera status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="pending">Väntande</SelectItem>
              <SelectItem value="confirmed">Bekräftad</SelectItem>
              <SelectItem value="cancelled">Avbokad</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gäst</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Gäster</TableHead>
                <TableHead>Nätter</TableHead>
                <TableHead>Belopp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.guest_name}</span>
                      <span className="text-sm text-muted-foreground">{booking.guest_email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.properties.title}</span>
                      <span className="text-sm text-muted-foreground">{booking.properties.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(booking.check_in_date), 'dd MMM', { locale: sv })}</span>
                      <span className="text-sm text-muted-foreground">
                        - {format(new Date(booking.check_out_date), 'dd MMM', { locale: sv })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{booking.number_of_guests}</TableCell>
                  <TableCell>{calculateNights(booking.check_in_date, booking.check_out_date)}</TableCell>
                  <TableCell className="font-medium">{(booking.total_amount / 100).toLocaleString()} SEK</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedBooking(booking)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Bokningsdetaljer</DialogTitle>
                            <DialogDescription>Detaljerad information om bokningen</DialogDescription>
                          </DialogHeader>
                          {selectedBooking && (
                            <div className="grid gap-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Gäst information</Label>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span>{selectedBooking.guest_name}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{selectedBooking.guest_email}</div>
                                    {selectedBooking.guest_phone && (
                                      <div className="text-sm text-muted-foreground">{selectedBooking.guest_phone}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Property</Label>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{selectedBooking.properties.title}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{selectedBooking.properties.location}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Bokningsperiod</Label>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {format(new Date(selectedBooking.check_in_date), 'dd MMMM yyyy', { locale: sv })} - 
                                      {format(new Date(selectedBooking.check_out_date), 'dd MMMM yyyy', { locale: sv })}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {calculateNights(selectedBooking.check_in_date, selectedBooking.check_out_date)} nätter
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Betalning</Label>
                                   <div className="flex items-center gap-2">
                                     <CreditCard className="h-4 w-4 text-muted-foreground" />
                                     <span className="font-medium">{(selectedBooking.total_amount / 100).toLocaleString()} SEK</span>
                                   </div>
                                  <div>{getStatusBadge(selectedBooking.status)}</div>
                                </div>
                              </div>
                              
                              {selectedBooking.special_requests && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Speciella önskemål</Label>
                                  <p className="text-sm bg-muted p-3 rounded">{selectedBooking.special_requests}</p>
                                </div>
                              )}
                            </div>
                          )}
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

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekräfta statusändring</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ändra bokningens status till {confirmDialog?.newStatus === 'confirmed' ? 'bekräftad' : 'avbokad'}? Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog) {
                  updateBookingStatus(confirmDialog.bookingId, confirmDialog.newStatus);
                }
              }}
              className={confirmDialog?.newStatus === 'cancelled' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Bekräfta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BUG-019: Pagination controls with IMP-005 total count display */}
      {filteredBookings.length > 0 && (
        <div className="flex justify-between items-center pt-4 gap-4">
          <Button
            variant="outline"
            onClick={() => fetchBookings(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Föregående
          </Button>
          <span className="text-sm text-muted-foreground">
            {/* IMP-005: Show items being displayed and total count */}
            Visar {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} av {totalCount} bokningar
          </span>
          <Button
            variant="outline"
            onClick={() => fetchBookings(currentPage + 1)}
            disabled={!hasMore}
          >
            Ladda Mer
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookingsManagement;