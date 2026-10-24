import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Shield, Tag } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import PropertyCalendarOptimized from "@/components/PropertyCalendarOptimized";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { usePricingRules } from "@/hooks/usePricingRules";
import CouponInput from "@/components/CouponInput";
import { CancellationPolicyDisplay } from "@/components/CancellationPolicyDisplay";
import { policyFor } from "../../supabase/functions/_shared/cancellation";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STAY_RULES, houseRuleLines, minGuestAge, stayRuleError, type StayRules } from "@/lib/stayRules";
import { PHONE_INPUT_MAX, SPECIAL_REQUESTS_MAX, isValidGuestName, isValidGuestPhone } from "@/lib/guestDetails";
import {
  applicableStayDiscount,
  extraGuestCount,
  extraServiceFee,
  extraServiceUnit,
  serviceFeeAmount,
  stayDiscountAmount,
} from "../../supabase/functions/_shared/booking-price";
import { format } from "date-fns";
import { type Copy, localizedPath, useCopy, useLang, useLocale } from "@/i18n";
import { DATE_FNS_LOCALES } from "@/i18n/dates";
import { translatedName, useListingTranslation } from "@/i18n/listingTexts";

const nightsEn = (n: number) => `${n} night${n !== 1 ? 's' : ''}`;
const nightsSv = (n: number) => `${n} ${n === 1 ? 'natt' : 'nätter'}`;
const nightsDe = (n: number) => `${n} ${n === 1 ? 'Nacht' : 'Nächte'}`;

const en = {
  // Checked before the form is sent (the payment function checks again, in English)
  nameMin: "Name must be at least 2 characters",
  nameMax: "Name must be less than 100 characters",
  nameLetters: "Please write your name in letters (spaces, hyphens, dots and apostrophes are fine)",
  emailInvalid: "Invalid email address",
  emailCharacters: "Please use an email address with only letters, digits and . _ % + -",
  emailMax: "Email must be less than 255 characters",
  phoneInvalid: "Please enter a phone number with 7 to 15 digits, e.g. +46 70 123 45 67",
  guestsMin: "At least 1 guest required",
  guestsMax: (max: number) => `Maximum ${max} guests allowed`,
  requestsMax: (max: number) => `Special requests can be at most ${max} characters`,
  acceptHouseRules: "You must accept the house rules to proceed",
  confirmToProceed: "Please confirm to proceed",
  checkInPast: "Check-in date cannot be in the past",
  checkOutBeforeCheckIn: "Check-out must be after check-in date",

  title: "Complete Your Booking",
  guestsLabel: (max: number) => `Number of guests (max ${max})`,
  /** fee: "400 SEK" */
  extraGuestNote: (covered: number, fee: string, perNight: boolean) =>
    `The nightly price covers ${covered} guest${covered !== 1 ? 's' : ''}; each extra guest adds ${fee}${perNight ? ' per night' : ''}.`,
  cleaningNote: (fee: string) => `A cleaning fee of ${fee} is added per stay.`,
  included: (names: string) => `Included: ${names}.`,
  extras: "Extras",
  checkIn: "Check-in:",
  checkOut: "Check-out:",
  numberOfNights: "Number of nights:",
  date: (d: Date) => d.toDateString(),
  /** price: "1 200 SEK" */
  nightsTimesPrice: (nights: number, price: string) => `${nightsEn(nights)} × ${price}`,
  cleaningFee: "Cleaning fee",
  /** nights: null when the fee is per stay */
  extraGuestFee: (guests: number, nights: number | null) =>
    `Extra guest fee (${guests} guest${guests !== 1 ? 's' : ''}${nights !== null ? ` × ${nightsEn(nights)}` : ''})`,
  stayDiscount: (type: "weekly" | "monthly", pct: number) =>
    `${type === 'monthly' ? 'Monthly' : 'Weekly'} discount (${pct}% off the nightly price)`,
  couponDiscount: (code: string) => `Coupon discount (${code})`,
  serviceFee: (rate: number) => `Service fee (${rate}%)`,
  total: "Total:",
  yourName: "Your name",
  email: "Email",
  phone: "Phone (optional)",
  specialRequests: "Special requests",
  houseRules: "House rules",
  agreeToHouseRules: (link: React.ReactNode): React.ReactNode => <>I have read and agree to the{" "}{link}</>,
  houseRulesLink: "House Rules",
  guidebookAfterBooking: "You'll receive a link to the full guest guidebook after booking",
  ageAndPresence: (age: number, eventsAllowed: boolean) =>
    `I am ${age} or older and will be staying at the property myself.${eventsAllowed ? "" : " There will be no parties or events."}`,
  quietStays: "This place is for quiet stays.",
  refundNote:
    "Refunds are a share of the price of the stay; the service fee is not refunded if you cancel. If the host or we cancel, you get everything back, including the service fee.",
  acceptTerms: (terms: React.ReactNode, privacy: React.ReactNode): React.ReactNode => (
    <>By booking you accept our{" "}{terms}{" "}and{" "}{privacy}.</>
  ),
  bookingTerms: "booking terms",
  privacyPolicy: "privacy policy",
  processing: "Processing...",
  submit: (total: string) => `Complete Your Booking • ${total}`,
  notCompleted:
    "Your booking was not completed and you have not been charged. Your details are still filled in, so you can change your dates or details and try again.",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    nameMin: "Namnet måste ha minst 2 tecken",
    nameMax: "Namnet måste vara kortare än 100 tecken",
    nameLetters: "Skriv ditt namn med bokstäver (mellanslag, bindestreck, punkter och apostrofer går bra)",
    emailInvalid: "Ogiltig e-postadress",
    emailCharacters: "Använd en e-postadress med bara bokstäver, siffror och . _ % + -",
    emailMax: "E-postadressen måste vara kortare än 255 tecken",
    phoneInvalid: "Ange ett telefonnummer med 7 till 15 siffror, t.ex. +46 70 123 45 67",
    guestsMin: "Minst 1 gäst",
    guestsMax: (max) => `Högst ${max} gäster`,
    requestsMax: (max) => `Önskemålen får vara högst ${max} tecken`,
    acceptHouseRules: "Du behöver godkänna husreglerna för att gå vidare",
    confirmToProceed: "Bekräfta för att gå vidare",
    checkInPast: "Incheckningsdatumet har redan passerat",
    checkOutBeforeCheckIn: "Utcheckningen måste vara efter incheckningen",

    title: "Slutför din bokning",
    guestsLabel: (max) => `Antal gäster (högst ${max})`,
    extraGuestNote: (covered, fee, perNight) =>
      `Priset per natt gäller för ${covered} ${covered === 1 ? 'gäst' : 'gäster'}. Varje extra gäst kostar ${fee}${perNight ? ' per natt' : ''}.`,
    cleaningNote: (fee) => `En städavgift på ${fee} tillkommer per vistelse.`,
    included: (names) => `Ingår: ${names}.`,
    extras: "Tillval",
    checkIn: "Incheckning:",
    checkOut: "Utcheckning:",
    numberOfNights: "Antal nätter:",
    date: (d) => format(d, "EEE d MMM yyyy", { locale: DATE_FNS_LOCALES.sv }),
    nightsTimesPrice: (nights, price) => `${nightsSv(nights)} × ${price}`,
    cleaningFee: "Städavgift",
    extraGuestFee: (guests, nights) =>
      `Avgift för extra gäst (${guests} ${guests === 1 ? 'gäst' : 'gäster'}${nights !== null ? ` × ${nightsSv(nights)}` : ''})`,
    stayDiscount: (type, pct) => `${type === 'monthly' ? 'Månadsrabatt' : 'Veckorabatt'} (${pct} % på priset per natt)`,
    couponDiscount: (code) => `Rabattkod (${code})`,
    serviceFee: (rate) => `Serviceavgift (${rate} %)`,
    total: "Totalt:",
    yourName: "Ditt namn",
    email: "E-post",
    phone: "Telefon (valfritt)",
    specialRequests: "Särskilda önskemål",
    houseRules: "Husregler",
    agreeToHouseRules: (link) => <>Jag har läst och godkänner{" "}{link}</>,
    houseRulesLink: "husreglerna",
    guidebookAfterBooking: "Du får en länk till hela gästguiden efter bokningen",
    ageAndPresence: (age, eventsAllowed) =>
      `Jag är ${age} år eller äldre och bor själv på boendet.${eventsAllowed ? "" : " Det blir inga fester eller evenemang."}`,
    quietStays: "Det här är ett boende för lugna vistelser.",
    refundNote:
      "Återbetalningen är en andel av priset för vistelsen, och serviceavgiften betalas inte tillbaka om du avbokar. Om värden eller vi avbokar får du tillbaka allt, även serviceavgiften.",
    acceptTerms: (terms, privacy) => <>Genom att boka godkänner du våra{" "}{terms}{" "}och vår{" "}{privacy}.</>,
    bookingTerms: "bokningsvillkor",
    privacyPolicy: "integritetspolicy",
    processing: "Bearbetar…",
    submit: (total) => `Slutför din bokning • ${total}`,
    notCompleted:
      "Bokningen blev inte klar och du har inte debiterats. Dina uppgifter finns kvar, så du kan ändra datum eller uppgifter och försöka igen.",
  },
  de: {
    nameMin: "Der Name muss mindestens 2 Zeichen lang sein",
    nameMax: "Der Name muss kürzer als 100 Zeichen sein",
    nameLetters: "Bitte schreib deinen Namen in Buchstaben (Leerzeichen, Bindestriche, Punkte und Apostrophe sind okay)",
    emailInvalid: "Ungültige E-Mail-Adresse",
    emailCharacters: "Bitte verwende eine E-Mail-Adresse nur mit Buchstaben, Ziffern und . _ % + -",
    emailMax: "Die E-Mail-Adresse muss kürzer als 255 Zeichen sein",
    phoneInvalid: "Bitte gib eine Telefonnummer mit 7 bis 15 Ziffern ein, z. B. +46 70 123 45 67",
    guestsMin: "Mindestens 1 Gast",
    guestsMax: (max) => `Höchstens ${max} Gäste`,
    requestsMax: (max) => `Besondere Wünsche dürfen höchstens ${max} Zeichen lang sein`,
    acceptHouseRules: "Bitte akzeptiere die Hausregeln, um fortzufahren",
    confirmToProceed: "Bitte bestätige, um fortzufahren",
    checkInPast: "Das Check-in-Datum liegt in der Vergangenheit",
    checkOutBeforeCheckIn: "Der Check-out muss nach dem Check-in liegen",

    title: "Buchung abschließen",
    guestsLabel: (max) => `Anzahl der Gäste (max. ${max})`,
    extraGuestNote: (covered, fee, perNight) =>
      `Der Preis pro Nacht gilt für ${covered} ${covered === 1 ? 'Gast' : 'Gäste'}. Jeder weitere Gast kostet ${fee}${perNight ? ' pro Nacht' : ''} zusätzlich.`,
    cleaningNote: (fee) => `Pro Aufenthalt kommt eine Endreinigung von ${fee} hinzu.`,
    included: (names) => `Inklusive: ${names}.`,
    extras: "Extras",
    checkIn: "Check-in:",
    checkOut: "Check-out:",
    numberOfNights: "Anzahl der Nächte:",
    date: (d) => format(d, "EEE, d. MMM yyyy", { locale: DATE_FNS_LOCALES.de }),
    nightsTimesPrice: (nights, price) => `${nightsDe(nights)} × ${price}`,
    cleaningFee: "Endreinigung",
    extraGuestFee: (guests, nights) =>
      `Aufpreis pro zusätzlichem Gast (${guests} ${guests === 1 ? 'Gast' : 'Gäste'}${nights !== null ? ` × ${nightsDe(nights)}` : ''})`,
    stayDiscount: (type, pct) => `${type === 'monthly' ? 'Monatsrabatt' : 'Wochenrabatt'} (${pct} % auf den Preis pro Nacht)`,
    couponDiscount: (code) => `Gutscheincode (${code})`,
    serviceFee: (rate) => `Servicegebühr (${rate} %)`,
    total: "Gesamt:",
    yourName: "Dein Name",
    email: "E-Mail",
    phone: "Telefon (optional)",
    specialRequests: "Besondere Wünsche",
    houseRules: "Hausregeln",
    agreeToHouseRules: (link) => <>Ich habe die{" "}{link}{" "}gelesen und akzeptiere sie</>,
    houseRulesLink: "Hausregeln",
    guidebookAfterBooking: "Nach der Buchung bekommst du einen Link zur vollständigen Gästeinfo",
    ageAndPresence: (age, eventsAllowed) =>
      `Ich bin ${age} Jahre oder älter und übernachte selbst in der Unterkunft.${eventsAllowed ? "" : " Es finden keine Partys oder Veranstaltungen statt."}`,
    quietStays: "Diese Unterkunft ist für ruhige Aufenthalte gedacht.",
    refundNote:
      "Erstattet wird ein Anteil am Preis des Aufenthalts; die Servicegebühr wird nicht erstattet, wenn du stornierst. Storniert der Gastgeber oder wir, bekommst du alles zurück, auch die Servicegebühr.",
    acceptTerms: (terms, privacy) => <>Mit der Buchung akzeptierst du unsere{" "}{terms}{" "}und unsere{" "}{privacy}.</>,
    bookingTerms: "Buchungsbedingungen",
    privacyPolicy: "Datenschutzerklärung",
    processing: "Wird verarbeitet…",
    submit: (total) => `Buchung abschließen • ${total}`,
    notCompleted:
      "Deine Buchung wurde nicht abgeschlossen und dir wurde nichts berechnet. Deine Angaben sind noch ausgefüllt, du kannst also Reisedaten oder Angaben ändern und es noch einmal versuchen.",
  },
};

interface BookingFormProps {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  onOpenGuidebook?: () => void;
}

interface PropertyDiscounts {
  weekly_discount_percentage: number;
  monthly_discount_percentage: number;
}

const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  propertyTitle,
  pricePerNight,
  currency,
  maxGuests,
  onOpenGuidebook
}) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const locale = useLocale();
  // Amounts in öre, as "1 200 SEK" in the page's number style
  const money = (ore: number) => `${(ore / 100).toLocaleString(locale)} ${currency}`;
  // Extras' names are the host's: shown translated, sent by id
  const translation = useListingTranslation(propertyId);
  const extraName = (extra: { id: string; name: string }) => translatedName(translation, "extra:" + extra.id, extra.name);
  const { createBooking, loading } = useBooking();
  const { calculatePrice, rules, getAvailableServices, getIncludedExtras } = usePricingRules(propertyId);
  // Extras the host offers: included in the price, or added by the guest
  const includedExtras = getIncludedExtras();
  const optionalExtras = getAvailableServices();
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  // Special prices hosts set per night (availability.seasonal_price, in SEK)
  const [seasonalPrices, setSeasonalPrices] = useState<Record<string, number>>({});
  // The guest service fee for this property in percent (10, or 5 during the
  // founding-host offer); the payment function charges the same
  const [feeRate, setFeeRate] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc('property_service_fee_rate', { _property_id: propertyId }).then(({ data, error }) => {
      setFeeRate(error || data == null ? 10 : Number(data));
    });
  }, [propertyId]);

  useEffect(() => {
    supabase
      .from('availability')
      .select('date, seasonal_price')
      .eq('property_id', propertyId)
      .not('seasonal_price', 'is', null)
      .gte('date', new Date().toISOString().slice(0, 10))
      .then(({ data }) => {
        setSeasonalPrices(Object.fromEntries((data || []).map((d) => [d.date, Number(d.seasonal_price) * 100])));
      });
  }, [propertyId]);
  const [propertyDiscounts, setPropertyDiscounts] = useState<PropertyDiscounts>({
    weekly_discount_percentage: 0,
    monthly_discount_percentage: 0
  });
  // The host's house rules and cancellation policy (checked again by the payment function)
  const [stayRules, setStayRules] = useState<StayRules>(DEFAULT_STAY_RULES);
  const [policyKey, setPolicyKey] = useState<string | null>(null);
  // Nothing can be booked before the listing's own rules and policy are shown
  const [rulesLoaded, setRulesLoaded] = useState(false);
  
  // Fetch property discounts, house rules and cancellation policy
  useEffect(() => {
    const fetchDiscounts = async () => {
      const { data } = await supabase
        .from('properties')
        .select('weekly_discount_percentage, monthly_discount_percentage, cancellation_policy, min_nights, holiday_min_nights, pets_allowed, smoking_allowed, events_allowed, min_guest_age')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        setPropertyDiscounts({
          weekly_discount_percentage: data.weekly_discount_percentage || 0,
          monthly_discount_percentage: data.monthly_discount_percentage || 0
        });
        setStayRules(data);
        setPolicyKey(data.cancellation_policy);
        setRulesLoaded(true);
      }
    };
    fetchDiscounts();
  }, [propertyId]);
  
  // Enable real-time calendar updates when bookings are made
  useBookingRealtime({
    onBookingUpdate: (booking) => {
      if (booking.property_id === propertyId && booking.status === 'confirmed') {
        // Calendar will automatically refresh due to real-time subscription
      }
    }
  });

  // Input validation schema
  const bookingSchema = z.object({
    guest_name: z.string()
      .min(2, t.nameMin)
      .max(100, t.nameMax)
      .refine(isValidGuestName, t.nameLetters),
    guest_email: z.string()
      .email(t.emailInvalid)
      // Same rule as the bookings table and the payment function
      .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, t.emailCharacters)
      .max(255, t.emailMax),
    guest_phone: z.string()
      .optional()
      .refine((val) => !val || isValidGuestPhone(val), t.phoneInvalid),
    number_of_guests: z.number()
      .min(1, t.guestsMin)
      .max(maxGuests, t.guestsMax(maxGuests)),
    special_requests: z.string()
      .max(SPECIAL_REQUESTS_MAX, t.requestsMax(SPECIAL_REQUESTS_MAX))
      .optional()
  });

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    number_of_guests: 2,
    special_requests: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // Shown under the button when the payment page could not be opened, until the
  // guest changes something. It doesn't rely on useBooking's toast, which
  // closes after a few seconds.
  const [submitFailed, setSubmitFailed] = useState(false);

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [houseRulesAccepted, setHouseRulesAccepted] = useState(false);
  const [partyRulesAccepted, setPartyRulesAccepted] = useState(false);
  
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | undefined>();

  const calculateTotalAmount = () => {
    if (!checkIn || !checkOut) return null;
    // pricePerNight is in SEK, convert to cents for calculation
    const calculation = calculatePrice(
      pricePerNight * 100,
      checkIn,
      checkOut,
      formData.number_of_guests,
      seasonalPrices,
      selectedExtras
    );
    return calculation;
  };

  const nights = checkIn && checkOut
    ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) // round, not ceil: DST days are 23h/25h
    : 0;

  const toDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Minimum stay (checked again by the payment function)
  const stayError = checkIn && checkOut ? stayRuleError(toDateString(checkIn), toDateString(checkOut), stayRules, lang) : null;

  const priceCalculation = calculateTotalAmount();
  const subtotalBeforeDiscount = priceCalculation?.total || 0;
  // Weekly/monthly discount on the nightly price only (same as the payment function)
  const applicableDiscount = applicableStayDiscount(
    nights,
    propertyDiscounts.weekly_discount_percentage,
    propertyDiscounts.monthly_discount_percentage
  );
  const stayDiscount = stayDiscountAmount(priceCalculation?.breakdown.accommodation || 0, applicableDiscount);
  const subtotal = subtotalBeforeDiscount - stayDiscount;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const hostTotal = Math.max(0, subtotal - couponDiscount);
  // Fee model A: service fee on top of the host's price (mirrors the payment function)
  const serviceFee = serviceFeeAmount(hostTotal, feeRate ?? 10);
  const totalAmount = hostTotal + serviceFee;
  const extraGuestRule = rules.find((r) => r.rule_type === 'extra_guest');
  const extraGuests = extraGuestRule ? extraGuestCount(formData.number_of_guests, extraGuestRule.guests_included) : 0;

  const validateForm = () => {
    try {
      // Plain text, trimmed only: React escapes it wherever it is shown, and an
      // HTML sanitiser would turn "&" into "&amp;" (longer, and saved that way)
      const trimmedData = {
        ...formData,
        guest_name: formData.guest_name.trim(),
        guest_email: formData.guest_email.trim(),
        guest_phone: formData.guest_phone.trim(),
        special_requests: formData.special_requests.trim()
      };
      
      bookingSchema.parse(trimmedData);
      setValidationErrors({});
      return trimmedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;

    if (stayError) return;

    if (!houseRulesAccepted) {
      setValidationErrors({ houseRules: t.acceptHouseRules });
      return;
    }

    if (!partyRulesAccepted) {
      setValidationErrors({ partyRules: t.confirmToProceed });
      return;
    }

    const validatedData = validateForm();
    if (!validatedData || !checkIn || !checkOut) return;

    // Additional date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      setValidationErrors({ checkIn: t.checkInPast });
      return;
    }
    if (checkOut <= checkIn) {
      setValidationErrors({ checkOut: t.checkOutBeforeCheckIn });
      return;
    }
  
    setSubmitFailed(false);
    try {
      const res = await createBooking({
        property_id: propertyId,
        total_amount: totalAmount,
        currency,
        check_in_date: toDateString(checkIn),
        check_out_date: toDateString(checkOut),
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        number_of_guests: validatedData.number_of_guests,
        special_requests: validatedData.special_requests,
        coupon_id: appliedCoupon?.id,
        // Only extras still offered (a host may have removed one meanwhile)
        extras: selectedExtras.filter((id) => optionalExtras.some((extra) => extra.id === id)),
        rules_confirmed: partyRulesAccepted,
        shown_policy: policyFor(policyKey).key,
        shown_min_age: minGuestAge(stayRules)
      });
      // No reset either way: on success the page is already going to Stripe,
      // and after an error (dates taken, price changed) the guest fixes one
      // thing and tries again instead of retyping everything
      if (!res.success) setSubmitFailed(true);
    } catch (err) {
      console.error("Booking failed:", err);
      setSubmitFailed(true);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSubmitFailed(false);

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number_of_guests' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <Card className="shadow-soft-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Kalendern */}
        <PropertyCalendarOptimized
          propertyId={propertyId}
          basePrice={pricePerNight}
          currency={currency}
          mode="guest"
          onDateSelect={({ checkIn, checkOut }) => {
            setCheckIn(checkIn);
            setCheckOut(checkOut);
            setSubmitFailed(false);
          }}
        />

        {/* Gästinfo */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="number_of_guests">{t.guestsLabel(maxGuests)}</Label>
            {/* Fees are shown before the guest count is chosen, not only in the total */}
            {rules.filter((r) => r.rule_type === 'extra_guest' || r.rule_type === 'cleaning_fee').map((r) => (
              <p key={r.id} className="text-sm text-muted-foreground">
                {r.rule_type === 'extra_guest'
                  ? t.extraGuestNote(Math.max(1, r.guests_included ?? 1), money(r.price), r.is_per_night)
                  : t.cleaningNote(money(r.price))}
              </p>
            ))}
            <Input
              id="number_of_guests"
              name="number_of_guests"
              type="number"
              min="1"
              max={maxGuests}
              value={formData.number_of_guests}
              onChange={handleChange}
              required
            />
            {/* The Terms promise linen and the like only when the listing says so: the host's included extras */}
            {includedExtras.length > 0 && (
              <p className="text-sm text-muted-foreground">{t.included(includedExtras.map(extraName).join(', '))}</p>
            )}
          </div>

          {optionalExtras.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t.extras}</legend>
              {optionalExtras.map((extra) => (
                <div key={extra.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`extra-${extra.id}`}
                    checked={selectedExtras.includes(extra.id)}
                    onCheckedChange={(on) => {
                      setSubmitFailed(false);
                      setSelectedExtras((list) => (on ? [...list, extra.id] : list.filter((id) => id !== extra.id)));
                    }}
                  />
                  <Label htmlFor={`extra-${extra.id}`} className="text-sm font-normal leading-snug">
                    {extraName(extra)}: {money(extra.price)} {extraServiceUnit(extra, lang)}
                  </Label>
                </div>
              ))}
            </fieldset>
          )}

          {/* Sammanställning */}
          {checkIn && checkOut && priceCalculation && (
            <div className="p-4 bg-accent rounded-lg space-y-3">
              <div className="flex justify-between">
                <span>{t.checkIn}</span>
                <span className="font-medium">{t.date(checkIn)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.checkOut}</span>
                <span className="font-medium">{t.date(checkOut)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.numberOfNights}</span>
                <span className="font-medium">{nights}</span>
              </div>
              {stayError && (
                <p className="text-destructive text-sm">{stayError}</p>
              )}
              
              {/* Price Breakdown */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.nightsTimesPrice(nights, `${pricePerNight.toLocaleString(locale)} ${currency}`)}</span>
                  <span>{money(priceCalculation.breakdown.accommodation)}</span>
                </div>
                
                {priceCalculation.cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t.cleaningFee}</span>
                    <span>{money(priceCalculation.cleaningFee)}</span>
                  </div>
                )}
                
                {priceCalculation.extraGuestFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t.extraGuestFee(extraGuests, extraGuestRule?.is_per_night !== false ? nights : null)}</span>
                    <span>{money(priceCalculation.extraGuestFee)}</span>
                  </div>
                )}
                
                {optionalExtras
                  .filter((extra) => selectedExtras.includes(extra.id))
                  .map((extra) => (
                    <div key={extra.id} className="flex justify-between text-sm">
                      <span>{extraName(extra)}</span>
                      <span>{money(extraServiceFee(extra, formData.number_of_guests, nights))}</span>
                    </div>
                  ))}
                
                {/* Weekly/Monthly Discount */}
                {applicableDiscount && stayDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {t.stayDiscount(applicableDiscount.type, applicableDiscount.percentage)}
                    </span>
                    <span>-{money(stayDiscount)}</span>
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t.couponDiscount(appliedCoupon.code)}</span>
                    <span>-{money(couponDiscount)}</span>
                  </div>
                )}

                {serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t.serviceFee(feeRate ?? 10)}</span>
                    <span>{money(serviceFee)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>{t.total}</span>
                <span>{money(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Coupon Input */}
          {checkIn && checkOut && subtotal > 0 && (
            <CouponInput
              propertyId={propertyId}
              totalAmount={subtotal}
              onCouponApplied={(couponId, discountAmount, code) => {
                setAppliedCoupon({
                  id: couponId,
                  code: code,
                  discountAmount
                });
              }}
              onCouponRemoved={() => setAppliedCoupon(undefined)}
              appliedCoupon={appliedCoupon}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="guest_name">{t.yourName}</Label>
            <Input
              id="guest_name"
              name="guest_name"
              value={formData.guest_name}
              onChange={handleChange}
              autoComplete="name"
              maxLength={100}
              required
              className={validationErrors.guest_name ? "border-destructive" : ""}
            />
            {validationErrors.guest_name && (
              <p className="text-destructive text-sm">{validationErrors.guest_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_email">{t.email}</Label>
            <Input
              id="guest_email"
              name="guest_email"
              type="email"
              value={formData.guest_email}
              onChange={handleChange}
              autoComplete="email"
              maxLength={255}
              required
              className={validationErrors.guest_email ? "border-destructive" : ""}
            />
            {validationErrors.guest_email && (
              <p className="text-destructive text-sm">{validationErrors.guest_email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_phone">{t.phone}</Label>
            {/* Not capped at 15: "+46 70 123 45 67" is 16 characters, and the cut-off number still passed */}
            <Input
              id="guest_phone"
              name="guest_phone"
              type="tel"
              value={formData.guest_phone}
              onChange={handleChange}
              autoComplete="tel"
              maxLength={PHONE_INPUT_MAX}
              className={validationErrors.guest_phone ? "border-destructive" : ""}
            />
            {validationErrors.guest_phone && (
              <p className="text-destructive text-sm">{validationErrors.guest_phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">{t.specialRequests}</Label>
            <Textarea
              id="special_requests"
              name="special_requests"
              value={formData.special_requests}
              onChange={handleChange}
              maxLength={SPECIAL_REQUESTS_MAX}
              rows={3}
              aria-describedby="special_requests_count"
              className={validationErrors.special_requests ? "border-destructive" : ""}
            />
            <p id="special_requests_count" className="text-xs text-muted-foreground text-right">
              {formData.special_requests.length}/{SPECIAL_REQUESTS_MAX}
            </p>
            {validationErrors.special_requests && (
              <p className="text-destructive text-sm">{validationErrors.special_requests}</p>
            )}
          </div>

          {/* The host's house rules, as the payment function checks them */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{t.houseRules}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {houseRuleLines(stayRules, lang).map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>

          {/* House Rules Acceptance */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="houseRules"
                checked={houseRulesAccepted}
                onCheckedChange={(checked) => {
                  setHouseRulesAccepted(checked as boolean);
                  if (validationErrors.houseRules) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.houseRules;
                      return newErrors;
                    });
                  }
                }}
                className={validationErrors.houseRules ? "border-destructive" : ""}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="houseRules"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-primary" />
                  {t.agreeToHouseRules(
                    onOpenGuidebook ? (
                      <button
                        type="button"
                        onClick={onOpenGuidebook}
                        className="text-primary underline hover:text-primary/80"
                      >
                        {t.houseRulesLink}
                      </button>
                    ) : (
                      t.houseRulesLink
                    )
                  )}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.guidebookAfterBooking}
                </p>
                {validationErrors.houseRules && (
                  <p className="text-destructive text-sm">{validationErrors.houseRules}</p>
                )}
              </div>
            </div>
          </div>

          {/* No parties: the lead guest confirms age and presence */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="partyRules"
                checked={partyRulesAccepted}
                onCheckedChange={(checked) => {
                  setPartyRulesAccepted(checked as boolean);
                  if (validationErrors.partyRules) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.partyRules;
                      return newErrors;
                    });
                  }
                }}
                className={validationErrors.partyRules ? "border-destructive" : ""}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="partyRules" className="text-sm font-medium leading-snug cursor-pointer">
                  {t.ageAndPresence(minGuestAge(stayRules), !!stayRules.events_allowed)}
                </label>
                {!stayRules.events_allowed && (
                  <p className="text-sm text-muted-foreground">{t.quietStays}</p>
                )}
                {validationErrors.partyRules && (
                  <p className="text-destructive text-sm">{validationErrors.partyRules}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <CancellationPolicyDisplay policyKey={policyKey} />
          {/* The policy's percentages are of the stay price: the service fee is
              kept when the guest cancels, and refunded when the host or we do (/terms) */}
          <p className="text-xs text-muted-foreground">
            {t.refundNote}
          </p>

          {/* New tab, so the filled-in form stays */}
          <p className="text-xs text-muted-foreground text-center">
            {t.acceptTerms(
              <a href={localizedPath("/terms", lang)} target="_blank" rel="noopener" className="underline hover:text-foreground">{t.bookingTerms}</a>,
              <a href={localizedPath("/privacy", lang)} target="_blank" rel="noopener" className="underline hover:text-foreground">{t.privacyPolicy}</a>
            )}
          </p>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || feeRate === null || !rulesLoaded || totalAmount <= 0 || !!stayError || !houseRulesAccepted || !partyRulesAccepted}
          >
            {loading ? t.processing : t.submit(money(totalAmount))}
          </Button>
          {submitFailed && !loading && (
            <p role="alert" className="text-destructive text-sm text-center">
              {t.notCompleted}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
