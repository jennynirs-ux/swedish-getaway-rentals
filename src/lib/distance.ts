// Distance calculation utilities using Haversine formula and OpenRouteService

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  geometry: [number, number][]; // array of [lng, lat] coordinates
}

export const MAJOR_CITIES: Record<string, Coordinates> = {
  Stockholm: { latitude: 59.3293, longitude: 18.0686 },
  Gothenburg: { latitude: 57.7089, longitude: 11.9746 },
  Malmö: { latitude: 55.605, longitude: 13.0038 }
};

// TODO: Extract city groups to database for international expansion
// These hardcoded city groups should be migrated to a database table
// to support multiple regions and languages dynamically
export const CITY_GROUPS: Record<string, string[]> = {
  Gothenburg: ['lerum', 'mölnlycke', 'partille', 'kungsbacka', 'göteborg'],
  Stockholm: ['nacka', 'täby', 'solna', 'sundbyberg'],
  Malmö: ['lund', 'lomma', 'vellinge', 'malmoe']
};

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  // Validate inputs
  if (!Number.isFinite(coord1.latitude) || !Number.isFinite(coord1.longitude) ||
      !Number.isFinite(coord2.latitude) || !Number.isFinite(coord2.longitude)) {
    return Infinity; // Return Infinity for invalid coordinates
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
    Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const roundToNearest = (value: number, nearest: number): number => {
  return Math.round(value / nearest) * nearest;
};

export const getClosestMajorCity = (coordinates: Coordinates): { city: string; distance: number } | null => {
  let closestCity: string | null = null;
  let minDistance = Infinity;

  for (const [cityName, cityCoords] of Object.entries(MAJOR_CITIES)) {
    const distance = calculateDistance(coordinates, cityCoords);
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = cityName;
    }
  }

  if (!closestCity) return null;

  return {
    city: closestCity,
    distance: roundToNearest(minDistance, 5) // Round to nearest 5 km
  };
};

export const calculateDriveTime = (distanceKm: number): number => {
  // Assume 1 km = 1.2 minutes by car
  const minutes = distanceKm * 1.2;
  return roundToNearest(minutes, 5); // Round to nearest 5 minutes
};

export const formatDistanceText = (distanceKm: number, driveTimeMin: number): string => {
  return `≈ ${driveTimeMin} min from major city (${distanceKm} km)`;
};

export const getDetailedDistanceText = (cityName: string, distanceKm: number, driveTimeMin: number): string => {
  return `This getaway is located about ${distanceKm} km (${driveTimeMin} min drive) from ${cityName}.`;
};

export const isInCityGroup = (propertyCity: string | null | undefined, searchCity: string): boolean => {
  if (!propertyCity) return false;
  
  const normalizedPropertyCity = propertyCity.toLowerCase();
  const normalizedSearchCity = searchCity.toLowerCase();
  
  // Exact match
  if (normalizedPropertyCity === normalizedSearchCity) return true;
  
  // Check city groups
  for (const [mainCity, cities] of Object.entries(CITY_GROUPS)) {
    if (mainCity.toLowerCase() === normalizedSearchCity) {
      if (cities.includes(normalizedPropertyCity)) return true;
    }
  }
  
  return false;
};

// OpenRouteService API integration for driving routes
const OPENROUTE_BASE_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
const CACHE_KEY_PREFIX_ROUTE = 'route_cache_';
const ROUTE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RouteCache {
  data: RouteInfo;
  timestamp: number;
}

export const getDrivingRoute = async (from: Coordinates, to: Coordinates): Promise<RouteInfo | null> => {
  const cacheKey = `${CACHE_KEY_PREFIX_ROUTE}${from.latitude}_${from.longitude}_${to.latitude}_${to.longitude}`;

  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp }: RouteCache = JSON.parse(cached);
      if (Date.now() - timestamp < ROUTE_CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Route cache read error:', error);
  }

  // Get API key from environment variables
  const API_KEY = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

  if (!API_KEY) {
    // BUG-010: SECURITY ISSUE - OpenRouteService API key is exposed in client-side code
    // TODO: This needs to be moved server-side through a backend proxy endpoint.
    // The current implementation exposes the API key in the browser bundle, which:
    // 1. Allows anyone to extract and abuse the API key
    // 2. Makes quota tracking per client impossible
    // 3. Violates principle of least privilege
    //
    // IMPLEMENTATION PLAN:
    // 1. Create a backend endpoint (e.g., /api/routing) that accepts from/to coordinates
    // 2. Move the API key to server-side environment variables only
    // 3. Have the client call the backend endpoint instead of calling OpenRouteService directly
    // 4. Remove VITE_OPENROUTESERVICE_API_KEY from environment
    //
    // For now, gracefully fall back to Haversine (straight-line) distance calculation
    console.warn('OpenRouteService API key not configured. Using Haversine fallback for route calculation.');
    return getFallbackRoute(from, to);
  }

  try {
    // BUG-051: Add 10-second timeout for fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `${OPENROUTE_BASE_URL}?api_key=${API_KEY}&start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`,
        {
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
          },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        console.error('OpenRouteService error:', response.status);
        // Fallback to simple calculation
        return getFallbackRoute(from, to);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return getFallbackRoute(from, to);
      }

      const feature = data.features[0];
      const properties = feature.properties;
      const geometry = feature.geometry.coordinates; // [lng, lat][] format

      const routeInfo: RouteInfo = {
        distance: Math.round((properties.summary.distance / 1000) * 10) / 10, // Convert m to km, round to 1 decimal
        duration: Math.round(properties.summary.duration / 60), // Convert seconds to minutes
        geometry: geometry.map(([lng, lat]: [number, number]) => [lng, lat])
      };

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: routeInfo,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Route cache write error:', error);
      }

      return routeInfo;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('Driving route error:', error);
    return getFallbackRoute(from, to);
  }
};

// Fallback route calculation using straight line
const getFallbackRoute = (from: Coordinates, to: Coordinates): RouteInfo => {
  const distance = calculateDistance(from, to);
  const duration = calculateDriveTime(distance);
  
  // Simple straight line geometry
  const geometry: [number, number][] = [
    [from.longitude, from.latitude],
    [to.longitude, to.latitude]
  ];

  return {
    distance: roundToNearest(distance, 5),
    duration: roundToNearest(duration, 5),
    geometry
  };
};

export const formatDrivingDirections = (cityName: string, distance: number, duration: number): string => {
  return `Driving distance from ${cityName}: ${distance} km (≈${duration} min)`;
};

// Transport hubs and points of interest in Sweden
const AIRPORTS: Record<string, Coordinates> = {
  'Stockholm Arlanda': { latitude: 59.6519, longitude: 17.9186 },
  'Göteborg Landvetter': { latitude: 57.6628, longitude: 12.2798 },
  'Malmö Airport': { latitude: 55.5364, longitude: 13.3762 },
  'Stockholm Bromma': { latitude: 59.3544, longitude: 17.9417 },
};

const TRAIN_STATIONS: Record<string, Coordinates> = {
  'Stockholm Central': { latitude: 59.3293, longitude: 18.0579 },
  'Göteborg Central': { latitude: 57.7089, longitude: 11.9746 },
  'Malmö Central': { latitude: 55.6092, longitude: 13.0009 },
  'Uppsala C': { latitude: 59.8586, longitude: 17.6389 },
  'Linköping C': { latitude: 58.4167, longitude: 15.6267 },
  'Örebro C': { latitude: 59.2753, longitude: 15.2134 },
  'Västerås C': { latitude: 59.6099, longitude: 16.5448 },
  'Norrköping C': { latitude: 58.5877, longitude: 16.1924 },
  'Helsingborg C': { latitude: 56.0465, longitude: 12.6945 },
  'Jönköping C': { latitude: 57.7826, longitude: 14.1618 },
  'Umeå C': { latitude: 63.7949, longitude: 20.2597 },
  'Lund C': { latitude: 55.7088, longitude: 13.1910 },
  'Borås C': { latitude: 57.7210, longitude: 12.9401 },
  'Sundsvall C': { latitude: 62.3908, longitude: 17.3069 },
  'Gävle C': { latitude: 60.6749, longitude: 17.1413 },
  'Eskilstuna C': { latitude: 59.3708, longitude: 16.5077 },
  'Karlstad C': { latitude: 59.3793, longitude: 13.5036 },
  'Växjö C': { latitude: 56.8777, longitude: 14.8091 },
  'Halmstad C': { latitude: 56.6745, longitude: 12.8577 },
  'Södertälje Syd': { latitude: 59.1617, longitude: 17.6253 },
  'Älvsjö': { latitude: 59.2728, longitude: 18.0128 },
  'Kungsbacka': { latitude: 57.4874, longitude: 12.0757 },
  'Varberg': { latitude: 57.1057, longitude: 12.2504 },
  'Skövde C': { latitude: 58.3916, longitude: 13.8454 },
};

const GROCERY_STORES: Record<string, Coordinates> = {
  'ICA Maxi Stockholm Barkarby': { latitude: 59.4141, longitude: 17.8847 },
  'ICA Maxi Göteborg Högsbo': { latitude: 57.6838, longitude: 11.9351 },
  'Coop Extra Malmö': { latitude: 55.6050, longitude: 13.0038 },
  'Willys Stockholm City': { latitude: 59.3345, longitude: 18.0632 },
  'Hemköp Göteborg': { latitude: 57.7089, longitude: 11.9746 },
  'ICA Kvantum Uppsala': { latitude: 59.8586, longitude: 17.6389 },
  'Coop Forum Linköping': { latitude: 58.4108, longitude: 15.6214 },
};

const THEME_PARKS: Record<string, Coordinates> = {
  'Liseberg (Göteborg)': { latitude: 57.6952, longitude: 11.9929 },
  'Gröna Lund (Stockholm)': { latitude: 59.3234, longitude: 18.0966 },
  'Kolmården Djurpark': { latitude: 58.6787, longitude: 16.3658 },
  'Skara Sommarland': { latitude: 58.3850, longitude: 13.4394 },
  'Furuvik': { latitude: 60.6363, longitude: 17.2549 },
  'Astrid Lindgrens Värld (Vimmerby)': { latitude: 57.6648, longitude: 15.8542 },
  'High Chaparral (Hillerstorp)': { latitude: 57.1167, longitude: 13.5500 },
};

interface TransportDistances {
  airport: { name: string; distance: number };
  trainStation: { name: string; distance: number };
  grocery: { name: string; distance: number };
  themePark: { name: string; distance: number };
}

// Calculate driving distance for nearby locations (simple estimation)
const estimateDrivingDistance = (straightDistance: number): number => {
  // Roads are typically 20-30% longer than straight line
  return Math.round(straightDistance * 1.25);
};

const findNearest = (
  coordinates: Coordinates,
  locations: Record<string, Coordinates>
): { name: string; distance: number } => {
  let nearest = { name: '', distance: Infinity };
  
  for (const [name, coords] of Object.entries(locations)) {
    const straightDistance = calculateDistance(coordinates, coords);
    const drivingDistance = estimateDrivingDistance(straightDistance);
    
    if (drivingDistance < nearest.distance) {
      nearest = { name, distance: drivingDistance };
    }
  }
  
  return nearest;
};

export const getNearestTransportInfo = (coordinates: Coordinates): {
  airport: string;
  trainStation: string;
  busStop: string;
  grocery: string;
  themePark: string;
} => {
  const nearest = {
    airport: findNearest(coordinates, AIRPORTS),
    trainStation: findNearest(coordinates, TRAIN_STATIONS),
    grocery: findNearest(coordinates, GROCERY_STORES),
    themePark: findNearest(coordinates, THEME_PARKS),
  };

  // For bus stops, estimate based on Swedish standards
  // Rural areas typically have bus stops within 5-15 km
  const estimatedBusDistance = Math.min(15, Math.round(nearest.trainStation.distance * 0.4));

  return {
    airport: `${nearest.airport.name}: ~${nearest.airport.distance} km`,
    trainStation: `${nearest.trainStation.name}: ~${nearest.trainStation.distance} km`,
    busStop: `Lokal busshållplats: ~${estimatedBusDistance} km`,
    grocery: `${nearest.grocery.name}: ~${nearest.grocery.distance} km`,
    themePark: `${nearest.themePark.name}: ~${nearest.themePark.distance} km`,
  };
};
