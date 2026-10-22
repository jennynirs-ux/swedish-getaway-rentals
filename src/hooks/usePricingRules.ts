import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extraGuestFee, extraServiceFee } from '../../supabase/functions/_shared/booking-price';

export interface PricingRule {
  id: string;
  property_id: string;
  rule_type: 'extra_guest' | 'cleaning_fee' | 'extra_service';
  name: string;
  price: number; // in cents
  currency: string;
  is_per_night: boolean;
  is_active: boolean;
  /** extra_guest only: guests the nightly price covers */
  guests_included?: number | null;
  /** extra_service only: part of the price (shown, never charged) */
  included?: boolean | null;
  /** extra_service only: charged for every guest */
  per_guest?: boolean | null;
}

export interface PricingCalculation {
  basePrice: number;
  nights: number;
  guests: number;
  extraGuestFee: number;
  cleaningFee: number;
  extraServices: number;
  total: number;
  breakdown: {
    accommodation: number;
    extraGuests: number;
    cleaning: number;
    services: number;
  };
}

export const usePricingRules = (propertyId: string) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propertyId) {
      loadRules();
    }
  }, [propertyId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties_pricing_rules')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('rule_type');

      if (error) throw error;
      setRules((data || []) as PricingRule[]);
    } catch (error) {
      console.error('Error loading pricing rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (
    basePrice: number, // per night in cents
    checkInDate: Date,
    checkOutDate: Date,
    numberOfGuests: number,
    availabilityPrices: Record<string, number> = {}, // seasonal prices in cents, keyed "YYYY-MM-DD"
    selectedServices: string[] = []
  ): PricingCalculation => {
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)); // round, not ceil: DST days are 23h/25h
    
    // Calculate base accommodation cost with seasonal pricing
    let totalAccommodation = 0;
    const currentDate = new Date(checkInDate);
    
    for (let i = 0; i < nights; i++) {
      // Local date: toISOString() would give the previous day for Swedish midnight
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const dayPrice = availabilityPrices[dateStr] || basePrice;
      totalAccommodation += dayPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Find applicable rules
    const extraGuestRules = rules.filter(r => r.rule_type === 'extra_guest');
    const cleaningRules = rules.filter(r => r.rule_type === 'cleaning_fee');
    const serviceRules = rules.filter(r => r.rule_type === 'extra_service' && !r.included && selectedServices.includes(r.id));

    // Guests beyond those the nightly price covers (shared with the payment function)
    let extraGuestTotal = 0;
    extraGuestRules.forEach(rule => {
      extraGuestTotal += extraGuestFee(rule, numberOfGuests, nights);
    });

    // Calculate cleaning fees
    let cleaningTotal = 0;
    cleaningRules.forEach(rule => {
      cleaningTotal += rule.price; // Cleaning fees are typically one-time
    });

    // Calculate extra services
    let servicesTotal = 0;
    serviceRules.forEach(rule => {
      servicesTotal += extraServiceFee(rule, numberOfGuests, nights);
    });

    const total = totalAccommodation + extraGuestTotal + cleaningTotal + servicesTotal;

    return {
      basePrice,
      nights,
      guests: numberOfGuests,
      extraGuestFee: extraGuestTotal,
      cleaningFee: cleaningTotal,
      extraServices: servicesTotal,
      total,
      breakdown: {
        accommodation: totalAccommodation,
        extraGuests: extraGuestTotal,
        cleaning: cleaningTotal,
        services: servicesTotal
      }
    };
  };

  const getAvailableServices = () => {
    // Extras guests can add; included ones are listed with getIncludedExtras
    return rules.filter(r => r.rule_type === 'extra_service' && !r.included);
  };

  const getIncludedExtras = () => rules.filter(r => r.rule_type === 'extra_service' && r.included);

  return {
    rules,
    loading,
    calculatePrice,
    getAvailableServices,
    getIncludedExtras,
    reload: loadRules
  };
};