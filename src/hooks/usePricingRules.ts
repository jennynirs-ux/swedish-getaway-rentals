import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PricingRule {
  id: string;
  property_id: string;
  rule_type: 'extra_guest' | 'cleaning_fee' | 'extra_service';
  name: string;
  price: number; // in cents
  currency: string;
  is_per_night: boolean;
  is_active: boolean;
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
    availabilityPrices: Record<string, number> = {}, // seasonal prices
    selectedServices: string[] = []
  ): PricingCalculation => {
    // BUG-046: Use UTC-based calculation to avoid DST issues
    const nights = Math.ceil(
      (Date.UTC(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate()) -
        Date.UTC(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) /
      (1000 * 60 * 60 * 24)
    );
    
    // Calculate base accommodation cost with seasonal pricing
    let totalAccommodation = 0;
    const currentDate = new Date(checkInDate);
    
    for (let i = 0; i < nights; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayPrice = availabilityPrices[dateStr] || basePrice;
      totalAccommodation += dayPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Find applicable rules
    const extraGuestRules = rules.filter(r => r.rule_type === 'extra_guest');
    const cleaningRules = rules.filter(r => r.rule_type === 'cleaning_fee');
    const serviceRules = rules.filter(r => r.rule_type === 'extra_service' && selectedServices.includes(r.id));

    // Calculate extra guest fees
    let extraGuestTotal = 0;
    extraGuestRules.forEach(rule => {
      const extraGuests = Math.max(0, numberOfGuests - 1); // Assuming base price includes 1 guest
      if (extraGuests > 0) {
        if (rule.is_per_night) {
          extraGuestTotal += rule.price * extraGuests * nights;
        } else {
          extraGuestTotal += rule.price * extraGuests;
        }
      }
    });

    // Calculate cleaning fees
    let cleaningTotal = 0;
    cleaningRules.forEach(rule => {
      cleaningTotal += rule.price; // Cleaning fees are typically one-time
    });

    // Calculate extra services
    let servicesTotal = 0;
    serviceRules.forEach(rule => {
      if (rule.is_per_night) {
        servicesTotal += rule.price * nights;
      } else {
        servicesTotal += rule.price;
      }
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
    return rules.filter(r => r.rule_type === 'extra_service');
  };

  return {
    rules,
    loading,
    calculatePrice,
    getAvailableServices,
    reload: loadRules
  };
};