// Geocoding utilities using Nominatim API

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const CACHE_KEY_PREFIX = 'geocode_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  displayName: string;
}

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
      // BUG-051: Add 10-second timeout for fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'NordicGetaways/1.0'
            },
            signal: controller.signal
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

        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        // Validate parsed coordinates
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Invalid coordinates from geocoding API');
        }

        return {
          latitude,
          longitude,
          city,
          country: result.address?.country,
          displayName: result.display_name
        };
      } finally {
        clearTimeout(timeout);
      }
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
      // BUG-051: Add 10-second timeout for fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'User-Agent': 'NordicGetaways/1.0'
            },
            signal: controller.signal
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
      } finally {
        clearTimeout(timeout);
      }
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};
