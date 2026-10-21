// Geocoding utilities using Nominatim API

import { REGIONS, type CountyCode } from '@/content/regions';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
// "_se_" since lookups were limited to Sweden: older cached results can be a namesake abroad
const CACHE_KEY_PREFIX = 'geocode_cache_se_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_rank?: number;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    'ISO3166-2-lvl4'?: string;
    country?: string;
  };
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  displayName: string;
  /** The county (län) the place lies in */
  countyCode?: CountyCode;
  /** The place is a whole county, e.g. "Västra Götaland" or "Skåne län" */
  isRegion?: boolean;
  /** The whole country ("Schweden", "Suède"): no place filter */
  isCountry?: boolean;
  /** A settlement (city, town, village, municipality) rather than an area */
  isSettlement?: boolean;
}

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Searches that name the whole country, so no place filter applies
const COUNTRY_WIDE_QUERIES = new Set(['sweden', 'sverige', 'anywhere', 'anywhere in sweden']);

export const isCountryWideQuery = (query: string): boolean => COUNTRY_WIDE_QUERIES.has(normalise(query));

/**
 * The county a name refers to: "Västra Götaland", "Västra Götalands län"
 * (Nominatim's name), "Skåne County" or the code "SE-M".
 */
export const regionCodeFromName = (name: string | null | undefined): CountyCode | undefined => {
  if (!name) return undefined;
  const n = normalise(name).replace(/\s+(län|county)$/, '');
  return REGIONS.find((r) => {
    const regionName = r.name.toLowerCase();
    // Genitive s: "Stockholms län", "Västra Götalands län"
    return n === r.code.toLowerCase() || n === regionName || n === `${regionName}s`;
  })?.code;
};

const countyOf = (result: NominatimResult): CountyCode | undefined => {
  const iso = result.address?.['ISO3166-2-lvl4'];
  return (
    REGIONS.find((r) => r.code === iso)?.code ??
    regionCodeFromName(result.address?.county) ??
    regionCodeFromName(result.address?.state)
  );
};

// A Swedish län comes back as addresstype "county" at place_rank 12; a
// municipality is 14-16 and a town 16+
const isRegionResult = (result: NominatimResult) =>
  result.addresstype === 'county' ||
  result.addresstype === 'state' ||
  (result.addresstype === undefined && result.place_rank !== undefined && result.place_rank <= 12);

const SETTLEMENT_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'municipality', 'neighbourhood', 'quarter']);

interface CachedResult {
  data: GeocodingResult;
  timestamp: number;
}

// Get from cache or fetch
const getCachedOrFetch = async (cacheKey: string, fetchFn: () => Promise<GeocodingResult>): Promise<GeocodingResult> => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp }: CachedResult = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }

  const result = await fetchFn();
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Cache write error:', error);
  }

  return result;
};

export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  const cacheKey = `${CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  
  try {
    return await getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(
        // Every cabin is in Sweden; without the limit a town name can match a namesake abroad.
        // addressdetails fills in result.address, which city/country below read
        `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=se&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NordicGetaways/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data: NominatimResult[] = await response.json();
      
      if (data.length === 0) {
        throw new Error('No results found');
      }

      const result = data[0];
      const city = result.address?.city || result.address?.town || result.address?.village;

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city,
        country: result.address?.country,
        displayName: result.display_name,
        countyCode: countyOf(result),
        isRegion: isRegionResult(result),
        isCountry: result.addresstype === 'country' || (result.place_rank !== undefined && result.place_rank <= 4),
        isSettlement: SETTLEMENT_TYPES.has(result.addresstype ?? '')
      };
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<GeocodingResult | null> => {
  const cacheKey = `${CACHE_KEY_PREFIX}reverse_${latitude}_${longitude}`;
  
  try {
    return await getCachedOrFetch(cacheKey, async () => {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'NordicGetaways/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const result: NominatimResult = await response.json();
      const city = result.address?.city || result.address?.town || result.address?.village;

      return {
        latitude,
        longitude,
        city,
        country: result.address?.country,
        displayName: result.display_name
      };
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};
