// Distance calculation utilities using Haversine formula

export interface Coordinates {
  latitude: number;
  longitude: number;
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
