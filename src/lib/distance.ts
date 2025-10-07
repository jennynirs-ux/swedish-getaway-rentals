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

export const CITY_GROUPS: Record<string, string[]> = {
  Gothenburg: ['lerum', 'mölnlycke', 'partille', 'kungsbacka', 'göteborg'],
  Stockholm: ['nacka', 'täby', 'solna', 'sundbyberg'],
  Malmö: ['lund', 'lomma', 'vellinge', 'malmoe']
};

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
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

  // Use public demo API key (rate limited) - in production, use environment variable
  const API_KEY = '5b3ce3597851110001cf6248d7f1d8d1e77a4c6ca8c6b1e4c3d4e5f6'; // Demo key for testing
  
  try {
    const response = await fetch(
      `${OPENROUTE_BASE_URL}?api_key=${API_KEY}&start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`,
      {
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
        }
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
