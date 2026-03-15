import { describe, it, expect } from 'vitest';
import { getAmenityIcon, amenityIconMap } from '../amenityIcons';
import {
  Wifi,
  Car,
  Coffee,
  Utensils,
  Waves,
  TreePine,
  Mountain,
  Home,
  Bed,
  Bath,
  Users,
  Flame,
  UtensilsCrossed,
  Thermometer,
  Shield,
  Tv,
  Dumbbell,
  PawPrint,
  Snowflake,
  Anchor,
  Sparkles,
  Droplets,
  HeartHandshake,
  Cigarette,
  Sun,
  Wind,
} from 'lucide-react';

describe('Amenity Icons', () => {
  describe('getAmenityIcon', () => {
    describe('exact match lookups', () => {
      it('should return Wifi icon for wifi', () => {
        expect(getAmenityIcon('wifi')).toBe(Wifi);
      });

      it('should return Waves icon for beach access', () => {
        expect(getAmenityIcon('beach access')).toBe(Waves);
      });

      it('should return Car icon for parking', () => {
        expect(getAmenityIcon('parking')).toBe(Car);
      });

      it('should return UtensilsCrossed icon for kitchen', () => {
        expect(getAmenityIcon('kitchen')).toBe(UtensilsCrossed);
      });

      it('should return Coffee icon for coffee', () => {
        expect(getAmenityIcon('coffee')).toBe(Coffee);
      });

      it('should return Bed icon for bed', () => {
        expect(getAmenityIcon('bed')).toBe(Bed);
      });

      it('should return Bath icon for bathroom', () => {
        expect(getAmenityIcon('bathroom')).toBe(Bath);
      });

      it('should return Flame icon for fireplace', () => {
        expect(getAmenityIcon('fireplace')).toBe(Flame);
      });

      it('should return Sparkles icon for hot tub', () => {
        expect(getAmenityIcon('hot tub')).toBe(Sparkles);
      });

      it('should return Dumbbell icon for gym', () => {
        expect(getAmenityIcon('gym')).toBe(Dumbbell);
      });

      it('should return PawPrint icon for pet', () => {
        expect(getAmenityIcon('pet')).toBe(PawPrint);
      });

      it('should return Shield icon for security', () => {
        expect(getAmenityIcon('security')).toBe(Shield);
      });
    });

    describe('case handling', () => {
      it('should handle uppercase amenities', () => {
        expect(getAmenityIcon('WIFI')).toBe(Wifi);
      });

      it('should handle mixed case amenities', () => {
        expect(getAmenityIcon('WiFi')).toBe(Wifi);
      });

      it('should handle title case amenities', () => {
        expect(getAmenityIcon('Kitchen')).toBe(UtensilsCrossed);
      });

      it('should handle amenities with extra whitespace', () => {
        expect(getAmenityIcon('  wifi  ')).toBe(Wifi);
      });
    });

    describe('partial match fallback', () => {
      it('should match partial strings that include amenity key', () => {
        expect(getAmenityIcon('wifi available')).toBe(Wifi);
      });

      it('should match when amenity key is part of the input', () => {
        expect(getAmenityIcon('beautiful kitchen area')).toBe(UtensilsCrossed);
      });

      it('should match when input is part of amenity key', () => {
        expect(getAmenityIcon('hot')).toBe(Sparkles); // matches 'hot tub'
      });

      it('should match beach in input with partial match', () => {
        expect(getAmenityIcon('lakehouse with beach access')).toBe(Waves);
      });

      it('should return icon for amenity substring match', () => {
        expect(getAmenityIcon('swimming pool')).toBe(Droplets);
      });
    });

    describe('unknown amenities return default', () => {
      it('should return Home icon for unknown amenity', () => {
        expect(getAmenityIcon('unknown-amenity')).toBe(Home);
      });

      it('should return Home icon for empty string', () => {
        expect(getAmenityIcon('')).toBe(Home);
      });

      it('should return Home icon for random characters', () => {
        expect(getAmenityIcon('xyzabc123')).toBe(Home);
      });

      it('should return Home icon for null', () => {
        expect(getAmenityIcon(null)).toBe(Home);
      });

      it('should return Home icon for undefined', () => {
        expect(getAmenityIcon(undefined)).toBe(Home);
      });

      it('should return Home icon for non-string types', () => {
        expect(getAmenityIcon(123)).toBe(Home);
      });

      it('should return Home icon for boolean', () => {
        expect(getAmenityIcon(true)).toBe(Home);
      });

      it('should return Home icon for object', () => {
        expect(getAmenityIcon({ amenity: 'wifi' })).toBe(Home);
      });
    });

    describe('all mapped amenities', () => {
      it('should return correct icon for all directly mapped amenities', () => {
        Object.entries(amenityIconMap).forEach(([amenity, icon]) => {
          expect(getAmenityIcon(amenity)).toBe(icon);
        });
      });
    });

    describe('amenity variations', () => {
      it('should match internet as wifi alternative', () => {
        expect(getAmenityIcon('internet')).toBe(Wifi);
      });

      it('should match garage as parking alternative', () => {
        expect(getAmenityIcon('garage')).toBe(Car);
      });

      it('should match ocean access as waves', () => {
        expect(getAmenityIcon('ocean access')).toBe(Waves);
      });

      it('should match lake access as waves', () => {
        expect(getAmenityIcon('lake access')).toBe(Waves);
      });

      it('should match jacuzzi as sparkles', () => {
        expect(getAmenityIcon('jacuzzi')).toBe(Sparkles);
      });

      it('should match sauna as flame', () => {
        expect(getAmenityIcon('sauna')).toBe(Flame);
      });

      it('should match pool as droplets', () => {
        expect(getAmenityIcon('pool')).toBe(Droplets);
      });

      it('should match dog as paw print', () => {
        expect(getAmenityIcon('dog')).toBe(PawPrint);
      });

      it('should match air conditioning as snowflake', () => {
        expect(getAmenityIcon('air conditioning')).toBe(Snowflake);
      });

      it('should match tv as television', () => {
        expect(getAmenityIcon('television')).toBe(Tv);
      });
    });
  });
});
