// @ts-nocheck
export type Locale = 'en' | 'sv' | 'no' | 'da' | 'de';

export interface TranslationMessages {
  common: {
    search: string;
    bookNow: string;
    perNight: string;
    guests: string;
    bedrooms: string;
    bathrooms: string;
    amenities: string;
    reviews: string;
    location: string;
    showMore: string;
    showLess: string;
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    submit: string;
    close: string;
  };
  nav: {
    explore: string;
    wishlists: string;
    trips: string;
    messages: string;
    profile: string;
    becomeHost: string;
    login: string;
    logout: string;
  };
  property: {
    pricePerNight: string;
    cleaningFee: string;
    serviceFee: string;
    total: string;
    checkIn: string;
    checkOut: string;
    maxGuests: string;
    description: string;
    houseRules: string;
    cancellationPolicy: string;
    hostSince: string;
    responseTime: string;
    verifiedHost: string;
  };
  booking: {
    selectDates: string;
    numberOfGuests: string;
    specialRequests: string;
    confirmBooking: string;
    bookingConfirmed: string;
    bookingPending: string;
    totalPrice: string;
    nights: string;
  };
  reviews: {
    guestReviews: string;
    writeReview: string;
    verifiedStay: string;
    helpful: string;
    report: string;
    noReviews: string;
    overallRating: string;
    cleanliness: string;
    accuracy: string;
    communication: string;
    locationRating: string;
    checkInRating: string;
    value: string;
  };
  host: {
    dashboard: string;
    properties: string;
    bookings: string;
    earnings: string;
    addProperty: string;
    editProperty: string;
  };
}
