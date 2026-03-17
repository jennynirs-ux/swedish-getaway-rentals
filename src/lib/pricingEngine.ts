/**
 * Dynamic Pricing Engine
 * ---
 * Integrates with PriceLabs API for market-driven pricing recommendations.
 * Falls back to rule-based pricing when PriceLabs is unavailable.
 *
 * PriceLabs docs: https://docs.pricelabs.co/
 * Env: VITE_PRICELABS_API_KEY (optional — feature degrades gracefully)
 */

import { supabase } from '@/integrations/supabase/client';

export interface PricingRecommendation {
  date: string;
  recommended_price: number;
  min_price: number;
  max_price: number;
  occupancy_rate: number;
  demand_level: 'low' | 'medium' | 'high' | 'peak';
  source: 'pricelabs' | 'rules' | 'base';
}

export interface SeasonalRule {
  name: string;
  start_month: number;
  end_month: number;
  multiplier: number;
}

// Nordic seasonality defaults
const NORDIC_SEASONAL_RULES: SeasonalRule[] = [
  { name: 'Midsommar Peak', start_month: 6, end_month: 7, multiplier: 1.4 },
  { name: 'Northern Lights', start_month: 2, end_month: 3, multiplier: 1.25 },
  { name: 'Christmas/New Year', start_month: 12, end_month: 12, multiplier: 1.5 },
  { name: 'Autumn Low', start_month: 10, end_month: 11, multiplier: 0.85 },
  { name: 'Spring Shoulder', start_month: 4, end_month: 5, multiplier: 0.95 },
];

// Weekend premium
const WEEKEND_MULTIPLIER = 1.15;

/**
 * Get pricing recommendations for a date range.
 * Tries PriceLabs first, falls back to rule-based.
 */
export async function getPricingRecommendations(
  propertyId: string,
  startDate: string,
  endDate: string,
  basePrice: number
): Promise<PricingRecommendation[]> {
  // Try PriceLabs API first
  const priceLabsKey = import.meta.env.VITE_PRICELABS_API_KEY;
  if (priceLabsKey) {
    try {
      const plPrices = await fetchPriceLabsPrices(priceLabsKey, propertyId, startDate, endDate);
      if (plPrices.length > 0) return plPrices;
    } catch (err) {
      console.warn('PriceLabs unavailable, using rule-based pricing:', err);
    }
  }

  // Fall back to rule-based pricing
  return calculateRuleBasedPricing(propertyId, startDate, endDate, basePrice);
}

/**
 * Fetch prices from PriceLabs API
 */
async function fetchPriceLabsPrices(
  apiKey: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PricingRecommendation[]> {
  const res = await fetch(
    `https://api.pricelabs.co/v1/pricing?listing_id=${propertyId}&start_date=${startDate}&end_date=${endDate}`,
    {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) throw new Error(`PriceLabs API error: ${res.status}`);

  const data = await res.json();

  return (data.prices || []).map((p: any) => ({
    date: p.date,
    recommended_price: Math.round(p.price),
    min_price: Math.round(p.min_price || p.price * 0.7),
    max_price: Math.round(p.max_price || p.price * 1.5),
    occupancy_rate: p.occupancy || 0,
    demand_level: mapDemandLevel(p.demand || p.occupancy || 0),
    source: 'pricelabs' as const,
  }));
}

/**
 * Rule-based pricing with Nordic seasonality
 */
function calculateRuleBasedPricing(
  propertyId: string,
  startDate: string,
  endDate: string,
  basePrice: number
): PricingRecommendation[] {
  const recommendations: PricingRecommendation[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const month = d.getMonth() + 1;
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat

    // Find matching seasonal rule
    let seasonalMultiplier = 1.0;
    let demandLevel: PricingRecommendation['demand_level'] = 'medium';

    for (const rule of NORDIC_SEASONAL_RULES) {
      if (rule.start_month <= rule.end_month) {
        if (month >= rule.start_month && month <= rule.end_month) {
          seasonalMultiplier = rule.multiplier;
          break;
        }
      } else {
        // Wrapping (e.g., Nov-Feb)
        if (month >= rule.start_month || month <= rule.end_month) {
          seasonalMultiplier = rule.multiplier;
          break;
        }
      }
    }

    const weekendMultiplier = isWeekend ? WEEKEND_MULTIPLIER : 1.0;
    const totalMultiplier = seasonalMultiplier * weekendMultiplier;
    const recommendedPrice = Math.round(basePrice * totalMultiplier);

    if (totalMultiplier >= 1.35) demandLevel = 'peak';
    else if (totalMultiplier >= 1.1) demandLevel = 'high';
    else if (totalMultiplier >= 0.9) demandLevel = 'medium';
    else demandLevel = 'low';

    recommendations.push({
      date: d.toISOString().split('T')[0],
      recommended_price: recommendedPrice,
      min_price: Math.round(recommendedPrice * 0.75),
      max_price: Math.round(recommendedPrice * 1.3),
      occupancy_rate: demandLevel === 'peak' ? 0.9 : demandLevel === 'high' ? 0.7 : 0.5,
      demand_level: demandLevel,
      source: 'rules',
    });
  }

  return recommendations;
}

function mapDemandLevel(value: number): PricingRecommendation['demand_level'] {
  if (value >= 0.85) return 'peak';
  if (value >= 0.65) return 'high';
  if (value >= 0.4) return 'medium';
  return 'low';
}

/**
 * Apply pricing recommendations to the availability table.
 */
export async function applyRecommendedPricing(
  propertyId: string,
  recommendations: PricingRecommendation[]
): Promise<void> {
  const upserts = recommendations.map((r) => ({
    property_id: propertyId,
    date: r.date,
    price_override: r.recommended_price,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('availability').upsert(upserts, {
    onConflict: 'property_id,date',
  });

  if (error) {
    console.error('Error applying pricing:', error);
    throw error;
  }
}
