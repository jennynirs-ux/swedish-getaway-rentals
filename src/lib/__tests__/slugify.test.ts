import { describe, it, expect } from 'vitest';
import { generateSlug, parseSlug } from '../slugify';

describe('Slug generation and parsing', () => {
  describe('generateSlug', () => {
    it('should convert basic strings to lowercase slugs', () => {
      expect(generateSlug('Mountain Cabin')).toBe('mountain-cabin');
    });

    it('should handle Swedish characters correctly', () => {
      expect(generateSlug('Söta Åkerbär Lägenhet')).toBe('sota-akerbar-lagenhet');
    });

    it('should convert Å to a', () => {
      expect(generateSlug('Åre Mountain Retreat')).toBe('are-mountain-retreat');
    });

    it('should convert Ä to a', () => {
      expect(generateSlug('Värmland Villa')).toBe('varmland-villa');
    });

    it('should convert Ö to o', () => {
      expect(generateSlug('Östersund Cottage')).toBe('ostersund-cottage');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Beautiful! Villa & Cabin')).toBe('beautiful-villa-cabin');
    });

    it('should remove multiple consecutive special characters', () => {
      expect(generateSlug('Villa...Cabin!!!')).toBe('villa-cabin');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Lake   House   Retreat')).toBe('lake-house-retreat');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('---Villa---')).toBe('villa');
    });

    it('should handle numbers in the string', () => {
      expect(generateSlug('Cabin 123 with 4 rooms')).toBe('cabin-123-with-4-rooms');
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(generateSlug('!!!')).toBe('');
    });

    it('should handle mixed case with special characters', () => {
      expect(generateSlug('Beautiful-Lake-House')).toBe('beautiful-lake-house');
    });

    it('should convert uppercase Swedish characters correctly', () => {
      expect(generateSlug('ÅMÅL SÄTER SÖTE')).toBe('amal-sater-sote');
    });
  });

  describe('parseSlug', () => {
    it('should convert slug to title case with spaces', () => {
      expect(parseSlug('mountain-cabin')).toBe('Mountain Cabin');
    });

    it('should capitalize first letter of each word', () => {
      expect(parseSlug('lake-house-retreat')).toBe('Lake House Retreat');
    });

    it('should handle single word slugs', () => {
      expect(parseSlug('villa')).toBe('Villa');
    });

    it('should handle slugs with numbers', () => {
      expect(parseSlug('cabin-with-4-rooms')).toBe('Cabin With 4 Rooms');
    });

    it('should handle empty string', () => {
      expect(parseSlug('')).toBe('');
    });

    it('should handle single hyphen', () => {
      expect(parseSlug('-')).toBe(' ');
    });

    it('should handle multiple hyphens', () => {
      expect(parseSlug('villa---cabin')).toBe('Villa   Cabin');
    });
  });

  describe('slug roundtrip', () => {
    it('should be able to convert title to slug and back to readable title', () => {
      const original = 'Beautiful Mountain Cabin';
      const slug = generateSlug(original);
      const parsed = parseSlug(slug);
      expect(parsed).toBe('Beautiful Mountain Cabin');
    });

    it('should handle Swedish characters in roundtrip', () => {
      const original = 'Värmland Stuga';
      const slug = generateSlug(original);
      const parsed = parseSlug(slug);
      // After conversion, ä becomes a, so we get 'Varmland Stuga'
      expect(parsed).toBe('Varmland Stuga');
    });
  });
});
