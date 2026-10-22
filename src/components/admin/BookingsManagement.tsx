import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Edit, Search, Calendar, User, MapPin, CreditCard, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import CancelBookingDialog from './CancelBookingDialog';
import { sv } from 'date-fns/locale';
import { dayAfterCheckIn, daysPastDue, payoutDueOn, remainingHostShare } from '../../../supabase/functions/_shared/payout';
import { stockholmToday } from '../../../supabase/functions/_shared/format';

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
  /** Extras the guest added, as charged (öre) */
  extras?: { id: string; name: string; amount: number }[] | null;
  created_at: string;
  // Money split and the host's payout (amounts in öre)
  host_amount: number | null;
  service_fee: number | null;
  refunded_amount: number | null;
  host_reversed_amount: number | null;
  host_payout_status: string | null;
  host_payout_due_on: string | null;
  host_paid_out_at: string | null;
  cancelled_by: string | null;
  cancel_requested_on: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  properties: {
    title: string;
    location: string;
    host_id: string | null;
  };
}

/** An unsettled host_charges row (e.g. the card fee of a booking the host cancelled) */
interface HostCharge {
  id: string;
  host_profile_id: string;
  booking_id: string | null;
  amount: number;
  reason: string;
  created_at: string;
}

// Filter values for the payout states that need a person
const MANUAL_PAYOUT_FILTER = 'payout-manual';
const ATTENTION_PAYOUT_FILTER = 'payout-attention';

// release-host-payouts alerts after waiting this long for the host's funds
const LATE_PAYOUT_ATTENTION_DAYS = 3;

const sek = (ore: number) =>
  `${(ore / 100).toLocaleString('sv-SE', { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} SEK`;
const dayMonth = (date: string) => format(new Date(date), 'd MMM', { locale: sv });
const sum = (charges: HostCharge[]) => charges.reduce((total, charge) => total + charge.amount, 0);

const CANCELLED_BY: Record<string, string> = {
  guest: 'av gästen',
  host: 'av värden',
  platform: 'av oss',
};

/** The host's price; bookings from before host_amount was stored: total less the fee */
const hostAmountOf = (b: Booking) => b.host_amount ?? Math.max(0, b.total_amount - (b.service_fee ?? 0));

/**
 * The host's share once refunds are taken into account: every refund reduces
 * it (up to the whole share), whether or not it was reversed in Stripe yet.
 * Same rule as cancel-booking: reduction = min(host_amount, refunded).
 */
const hostShareLeft = (b: Booking) =>
  remainingHostShare(hostAmountOf(b), Math.max(b.refunded_amount ?? 0, b.host_reversed_amount ?? 0));

type PayoutView =
  | { kind: 'held'; dueOn: string; late: boolean }
  | { kind: 'payByHand'; dueOn: string; amount: number; due: boolean }
  | { kind: 'nothingToPay' }
  | { kind: 'attention'; dueOn: string; reason: string }
  | { kind: 'paidOut'; byHand: boolean }
  | { kind: 'reversed' }
  | { kind: 'platform' }
  | { kind: 'none' };

/**
 * Where the host's share is. 'manual' only means the guest's money is in our
 * account (no transfer to the host): we pay the host by hand. A 'held' share
 * is in the host's own Stripe balance, so it must never be paid by hand; when
 * its refunds and reversals disagree, or the payout job hasn't paid it long
 * after the due date, it needs a look in Stripe instead.
 */
function payoutView(b: Booking, today: string): PayoutView {
  // A held share is paid the day after check-in, or 85 days after payment if
  // that comes first (older rows may still carry the later date; the payout
  // job moves it); a host paid by hand is paid the day after check-in
  const ruleDue = payoutDueOn(b.check_in_date, b.created_at);
  const dueOn =
    b.host_payout_status === 'held'
      ? b.host_payout_due_on && b.host_payout_due_on < ruleDue
        ? b.host_payout_due_on
        : ruleDue
      : b.host_payout_due_on ?? dayAfterCheckIn(b.check_in_date);
  switch (b.host_payout_status) {
    case 'held': {
      const hostAmount = hostAmountOf(b);
      const refunded = b.refunded_amount ?? 0;
      const reversed = b.host_reversed_amount ?? 0;
      const notTakenBack = remainingHostShare(hostAmount, reversed) - remainingHostShare(hostAmount, refunded);
      if (notTakenBack > 0) {
        return {
          kind: 'attention',
          dueOn,
          reason: `Gästen har fått ${sek(refunded)} tillbaka men bara ${sek(reversed)} är taget från värdens andel. Stäm av i Stripe: ${sek(notTakenBack)} ska återföras från värdens överföring innan utbetalningen. Betala inte för hand: pengarna ligger i värdens Stripe-saldo.`,
        };
      }
      const late = daysPastDue(dueOn, today);
      if (late >= LATE_PAYOUT_ATTENTION_DAYS) {
        return {
          kind: 'attention',
          dueOn,
          reason: `Skulle ha betalats ut ${dayMonth(dueOn)} men utbetalningsjobbet har inte lyckats (se larmmejlen). Kontrollera värdens saldo och bankkonto i Stripe. Betala inte för hand: pengarna ligger i värdens Stripe-saldo.`,
        };
      }
      return { kind: 'held', dueOn, late: late >= 1 };
    }
    case 'manual': {
      if (b.stripe_transfer_id) {
        return {
          kind: 'attention',
          dueOn,
          reason: `Markerad "betala för hand", men det finns en överföring till värdens Stripe-konto (${b.stripe_transfer_id}), så värdens andel ligger i värdens Stripe-saldo. Stäm av överföringen och dess återföringar i Stripe och sätt sedan statusen till held. Betala inte för hand.`,
        };
      }
      const amount = hostShareLeft(b);
      return amount > 0 ? { kind: 'payByHand', dueOn, amount, due: daysPastDue(dueOn, today) >= 0 } : { kind: 'nothingToPay' };
    }
    case 'paid_out':
      return { kind: 'paidOut', byHand: !b.stripe_transfer_id };
    case 'reversed':
      return { kind: 'reversed' };
    case 'platform':
      return { kind: 'platform' };
    default:
      return { kind: 'none' };
  }
}

/**
 * The host's open charges that fit in this payment, oldest first and whole
 * charges only (a row is marked settled as a whole when paying by hand;
 * release-host-payouts can also settle a charge in part from a transfer)
 */
function chargesThatFit(charges: HostCharge[], amount: number): HostCharge[] {
  let left = amount;
  return charges.filter((charge) => {
    if (charge.amount > left) return false;
    left -= charge.amount;
    return true;
  });
}

function payoutBadge(booking: Booking, view: PayoutView) {
  switch (view.kind) {
    case 'held':
      return (
        <Badge variant="secondary" title="Ligger i värdens Stripe-saldo och betalas ut till banken dagen efter incheckning, eller 85 dagar efter betalningen om det kommer först">
          Hålls till {dayMonth(view.dueOn)}{view.late ? ' (försenad)' : ''}
        </Badge>
      );
    case 'payByHand':
      return (
        <Badge
          variant="outline"
          className="border-amber-500 bg-amber-100 text-amber-900"
          title="Gästens betalning ligger på vårt konto (värden kunde inte ta emot överföringar). Betala värden för hand dagen efter incheckning."
        >
          Betala för hand: {sek(view.amount)}
        </Badge>
      );
    case 'nothingToPay':
      return (
        <Badge variant="outline" title="Betalningen ligger på vårt konto, men allt är återbetalat till gästen">
          Inget att betala
        </Badge>
      );
    case 'attention':
      return (
        <Badge variant="destructive" title={view.reason}>
          Behöver åtgärd
        </Badge>
      );
    case 'paidOut':
      return (
        <Badge variant="default" title={view.byHand ? 'Betald till värden för hand' : 'Utbetald till värdens bank'}>
          {view.byHand ? 'Betald för hand' : 'Utbetald'}
          {booking.host_paid_out_at ? ` ${dayMonth(booking.host_paid_out_at)}` : ''}
        </Badge>
      );
    case 'reversed':
      return <Badge variant="outline" title="Värdens andel är helt återförd efter avbokningen">Återförd</Badge>;
    case 'platform':
      return <Badge variant="outline" title="Betald till vårt konto (bokning från före 21 okt 2026)">Plattformen</Badge>;
    default:
      return <span className="text-muted-foreground">–</span>;
  }
}

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [openCharges, setOpenCharges] = useState<HostCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  // "Markera som betald": the booking, and whether the host's open charges are deducted
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [deductCharges, setDeductCharges] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const { toast } = useToast();
  const today = stockholmToday();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  const openChargesQuery = () =>
    supabase
      .from('host_charges')
      .select('id, host_profile_id, booking_id, amount, reason, created_at')
      .is('settled_at', null)
      .order('created_at');

  // Just before paying by hand: the payout job may have settled some since the list loaded
  const refreshOpenCharges = async () => {
    const { data, error } = await openChargesQuery();
    if (error) console.error('Error fetching host charges:', error);
    else setOpenCharges(data || []);
  };

  const fetchBookings = async () => {
    try {
      const [{ data, error }, { data: charges, error: chargesError }] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            properties!inner(title, location, host_id)
          `)
          .order('created_at', { ascending: false }),
        openChargesQuery(),
      ]);

      if (error) throw error;
      // extras is jsonb (Json in the generated types); it holds the shape above
      setBookings((data || []) as unknown as Booking[]);
      if (chargesError) {
        // The bookings still work; only the deduction hint is missing
        console.error('Error fetching host charges:', chargesError);
      } else {
        setOpenCharges(charges || []);
      }
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

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.guest_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.properties.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === MANUAL_PAYOUT_FILTER) {
      filtered = filtered.filter(booking => payoutView(booking, stockholmToday()).kind === 'payByHand');
    } else if (statusFilter === ATTENTION_PAYOUT_FILTER) {
      filtered = filtered.filter(booking => payoutView(booking, stockholmToday()).kind === 'attention');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Framgång",
        description: `Bokning ${newStatus === 'confirmed' ? 'bekräftad' : 'avbokad'}`
      });

      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera bokningsstatus",
        variant: "destructive"
      });
    }
  };

  const chargesFor = (booking: Booking) =>
    booking.properties.host_id ? openCharges.filter(charge => charge.host_profile_id === booking.properties.host_id) : [];

  // Only a 'manual' booking without a transfer: the money is in our account.
  // release-host-payouts only touches 'held' rows, and cancel-booking treats a
  // paid_out booking without a transfer as paid by hand.
  const markPaidByHand = async () => {
    const booking = payingBooking;
    if (!booking) return;
    const view = payoutView(booking, today);
    if (view.kind !== 'payByHand') return;
    const deducted = deductCharges ? chargesThatFit(chargesFor(booking), view.amount) : [];
    setMarkingPaid(true);
    try {
      const paidAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .update({ host_payout_status: 'paid_out', host_paid_out_at: paidAt })
        .eq('id', booking.id)
        .eq('host_payout_status', 'manual')
        .is('stripe_transfer_id', null)
        .select('id');
      if (error) throw error;
      if (!data?.length) {
        toast({
          title: "Inget ändrat",
          description: "Utbetalningens status har ändrats under tiden. Listan laddas om; kontrollera den innan du betalar.",
          variant: "destructive",
        });
        return;
      }

      let chargeWarning = '';
      if (deducted.length) {
        const { data: settledRows, error: chargeError } = await supabase
          .from('host_charges')
          .update({ settled_at: paidAt, settled_by: `Deducted by hand from the payout for booking ${booking.id}` })
          .in('id', deducted.map(charge => charge.id))
          .is('settled_at', null)
          .select('id');
        if (chargeError) {
          console.error('Error settling host charges:', chargeError);
          chargeWarning = ` Avgifterna (${sek(sum(deducted))}) kunde inte markeras som reglerade: ${chargeError.message}. Markera dem i host_charges för hand.`;
        } else {
          // Settled meanwhile by the payout job: the host must not pay them twice
          const settledIds = new Set((settledRows ?? []).map(row => row.id));
          const alreadySettled = deducted.filter(charge => !settledIds.has(charge.id));
          if (alreadySettled.length) {
            chargeWarning = ` ${sek(sum(alreadySettled))} av avgifterna hade redan dragits från en annan utbetalning. Betala värden ${sek(sum(alreadySettled))} till.`;
          }
        }
      }
      toast({
        title: chargeWarning ? "Markerad som betald, men något behöver åtgärdas" : "Markerad som betald",
        description: `Utbetalningen till värden är markerad som betald för hand (${sek(view.amount - sum(deducted))}).${chargeWarning}`,
        variant: chargeWarning ? "destructive" : "default",
      });
      setPayingBooking(null);
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      toast({
        title: "Fel",
        description: (error as { message?: string })?.message || "Kunde inte markera utbetalningen som betald",
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(false);
      fetchBookings();
    }
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

  const views = new Map(bookings.map(b => [b.id, payoutView(b, today)]));
  const payByHand = bookings.filter(b => views.get(b.id)?.kind === 'payByHand');
  const payByHandTotal = payByHand.reduce((total, b) => {
    const view = views.get(b.id);
    return total + (view?.kind === 'payByHand' ? view.amount : 0);
  }, 0);
  const payByHandDue = payByHand.filter(b => {
    const view = views.get(b.id);
    return view?.kind === 'payByHand' && view.due;
  }).length;
  const needsAttention = bookings.filter(b => views.get(b.id)?.kind === 'attention').length;

  // The "Markera som betald" dialog
  const payingView = payingBooking ? payoutView(payingBooking, today) : null;
  const payingAmount = payingView?.kind === 'payByHand' ? payingView.amount : 0;
  const payingHostAmount = payingBooking ? hostAmountOf(payingBooking) : 0;
  const payingCharges = payingBooking ? chargesFor(payingBooking) : [];
  const fittingCharges = chargesThatFit(payingCharges, payingAmount);
  const waitingCharges = payingCharges.filter(charge => !fittingCharges.includes(charge));
  const payingNet = payingAmount - (deductCharges ? sum(fittingCharges) : 0);

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <SelectItem value={MANUAL_PAYOUT_FILTER}>Betala värden för hand</SelectItem>
              <SelectItem value={ATTENTION_PAYOUT_FILTER}>Utbetalning behöver åtgärd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {needsAttention > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {needsAttention === 1 ? '1 utbetalning behöver' : `${needsAttention} utbetalningar behöver`} åtgärd: återbetalningar
            och återföringar stämmer inte, eller utbetalningen är försenad. Värdens andel ligger i värdens Stripe-saldo, så
            stäm av i Stripe. Betala inte för hand.
          </span>
          <Button size="sm" variant="outline" onClick={() => setStatusFilter(ATTENTION_PAYOUT_FILTER)}>
            Visa
          </Button>
        </div>
      )}

      {payByHand.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Betala värden för hand: {payByHand.length === 1 ? '1 bokning' : `${payByHand.length} bokningar`}, totalt{' '}
            {sek(payByHandTotal)}
            {payByHandDue < payByHand.length ? ` (${payByHandDue} förfallna nu, resten dagen efter incheckning)` : ''}.
            Pengarna ligger på vårt konto eftersom värden inte kunde ta emot överföringar. Markera varje bokning som betald
            när du har betalat.
          </span>
          <Button size="sm" variant="outline" onClick={() => setStatusFilter(MANUAL_PAYOUT_FILTER)}>
            Visa
          </Button>
        </div>
      )}

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
                <TableHead>Utbetalning</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => {
                const view = views.get(booking.id) ?? payoutView(booking, today);
                const hostCharges = view.kind === 'payByHand' ? chargesFor(booking) : [];
                return (
                <TableRow
                  key={booking.id}
                  className={
                    view.kind === 'attention'
                      ? 'bg-red-50 hover:bg-red-100'
                      : view.kind === 'payByHand'
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : undefined
                  }
                >
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
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{(booking.total_amount / 100).toLocaleString()} SEK</span>
                      {booking.host_amount != null && (
                        <span className="text-xs text-muted-foreground">Värdens pris: {sek(booking.host_amount)}</span>
                      )}
                      {(booking.refunded_amount ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">Återbetalt: {sek(booking.refunded_amount ?? 0)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      {payoutBadge(booking, view)}
                      {view.kind === 'payByHand' && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {view.due ? `Förföll ${dayMonth(view.dueOn)}` : `Betalas ${dayMonth(view.dueOn)}`}
                          </span>
                          {hostCharges.length > 0 && (
                            <span className="text-xs text-amber-800">
                              Värden har obetalda avgifter: {sek(sum(hostCharges))}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setDeductCharges(true);
                              setPayingBooking(booking);
                              void refreshOpenCharges();
                            }}
                          >
                            Markera som betald
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(booking.status)}
                      {booking.status === 'cancelled' && booking.cancelled_by && (
                        <span className="text-xs text-muted-foreground">{CANCELLED_BY[booking.cancelled_by] ?? booking.cancelled_by}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <CancelBookingDialog booking={booking} onCancelled={fetchBookings} />
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

                              {(() => {
                                const selectedView = payoutView(selectedBooking, today);
                                // Without a transfer nothing moves in Stripe: the amount is only deducted from what we owe the host
                                const reversedLabel = selectedBooking.stripe_transfer_id
                                  ? 'Återfört från värdens överföring'
                                  : 'Avdraget från värdens andel';
                                return (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Fördelning</Label>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                      {selectedBooking.host_amount != null && (
                                        <>
                                          <span className="text-muted-foreground">Värdens pris</span>
                                          <span>{sek(selectedBooking.host_amount)}</span>
                                        </>
                                      )}
                                      <span className="text-muted-foreground">Serviceavgift</span>
                                      <span>{sek(selectedBooking.service_fee ?? 0)}</span>
                                      {(selectedBooking.refunded_amount ?? 0) > 0 && (
                                        <>
                                          <span className="text-muted-foreground">Återbetalt till gästen</span>
                                          <span>{sek(selectedBooking.refunded_amount ?? 0)}</span>
                                        </>
                                      )}
                                      {(selectedBooking.host_reversed_amount ?? 0) > 0 && (
                                        <>
                                          <span className="text-muted-foreground">{reversedLabel}</span>
                                          <span>{sek(selectedBooking.host_reversed_amount ?? 0)}</span>
                                        </>
                                      )}
                                      <span className="text-muted-foreground">Utbetalning till värden</span>
                                      <span>{payoutBadge(selectedBooking, selectedView)}</span>
                                      {selectedView.kind === 'payByHand' && (
                                        <>
                                          <span className="text-muted-foreground">Att betala för hand</span>
                                          <span>
                                            {sek(selectedView.amount)}, {selectedView.due ? 'förföll' : 'betalas'}{' '}
                                            {format(new Date(selectedView.dueOn), 'd MMM yyyy', { locale: sv })}
                                          </span>
                                        </>
                                      )}
                                      {selectedView.kind === 'attention' && (
                                        <span className="col-span-2 text-destructive">{selectedView.reason}</span>
                                      )}
                                      {selectedBooking.status === 'cancelled' && (
                                        <>
                                          <span className="text-muted-foreground">Avbokad</span>
                                          <span>
                                            {[
                                              selectedBooking.cancelled_by && CANCELLED_BY[selectedBooking.cancelled_by],
                                              selectedBooking.cancel_requested_on &&
                                                `begärd ${format(new Date(selectedBooking.cancel_requested_on), 'd MMM yyyy', { locale: sv })}`,
                                            ]
                                              .filter(Boolean)
                                              .join(', ') || '–'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {selectedBooking.extras?.length ? (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Tillval</Label>
                                  <p className="text-sm">
                                    {selectedBooking.extras.map((e) => `${e.name} (${sek(e.amount)})`).join(", ")}
                                  </p>
                                </div>
                              ) : null}

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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay the host by hand, then record it */}
      <Dialog open={!!payingBooking} onOpenChange={(next) => !next && !markingPaid && setPayingBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Markera som betald för hand</DialogTitle>
            <DialogDescription>
              {payingBooking &&
                `${payingBooking.properties.title}, ${dayMonth(payingBooking.check_in_date)}–${dayMonth(payingBooking.check_out_date)}, gäst ${payingBooking.guest_name}.`}
            </DialogDescription>
          </DialogHeader>
          {payingView?.kind === 'payByHand' ? (
            <div className="space-y-3 text-sm">
              <p>
                Gästens betalning ligger på vårt konto. Betala värden{' '}
                <strong>{sek(payingNet)}</strong> och markera sedan utbetalningen som betald.
              </p>
              {!payingView.due && (
                <p className="text-amber-700">
                  Utbetalningen förfaller först {format(new Date(payingView.dueOn), 'd MMM yyyy', { locale: sv })} (dagen
                  efter incheckning).
                </p>
              )}
              {fittingCharges.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer rounded border p-2">
                  <Checkbox
                    checked={deductCharges}
                    onCheckedChange={(checked) => setDeductCharges(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Dra av värdens obetalda avgifter ({sek(sum(fittingCharges))}) och markera dem som reglerade
                    <span className="block text-xs text-muted-foreground">
                      {fittingCharges.map(charge => `${charge.reason}: ${sek(charge.amount)}`).join('; ')}
                    </span>
                  </span>
                </label>
              )}
              {waitingCharges.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {sek(sum(waitingCharges))} i avgifter ryms inte i den här betalningen och väntar till nästa.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Värdens andel {sek(payingHostAmount)}
                {payingAmount < payingHostAmount ? `, minus ${sek(payingHostAmount - payingAmount)} som gästen fått tillbaka` : ''}
                {deductCharges && fittingCharges.length > 0 ? `, minus avgifter ${sek(sum(fittingCharges))}` : ''}.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Den här bokningen ska inte betalas för hand längre.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingBooking(null)} disabled={markingPaid}>
              Avbryt
            </Button>
            <Button onClick={markPaidByHand} disabled={markingPaid || payingView?.kind !== 'payByHand'}>
              {markingPaid ? 'Sparar…' : 'Markera som betald'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsManagement;
