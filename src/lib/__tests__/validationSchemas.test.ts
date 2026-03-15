import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  emailSchema,
  nameSchema,
  messageSchema,
  phoneSchema,
  subjectSchema,
  guestNameSchema,
  specialRequestsSchema,
  numberOfGuestsSchema,
  contactFormSchema,
  bookingFormSchema,
  guestbookFormSchema,
} from '../validationSchemas';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should accept valid email addresses', () => {
      expect(() => emailSchema.parse('user@example.com')).not.toThrow();
      expect(() => emailSchema.parse('test.user@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow();
      expect(() => emailSchema.parse('user@')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
    });

    it('should enforce max length of 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(() => emailSchema.parse(longEmail)).toThrow();
    });

    it('should trim whitespace from valid email', () => {
      const result = emailSchema.parse('user@example.com');
      expect(result).toBe('user@example.com');
    });

    it('should reject emails with HTML content', () => {
      expect(() => emailSchema.parse('user@example.com<script>')).toThrow();
    });
  });

  describe('nameSchema', () => {
    it('should accept valid names', () => {
      expect(() => nameSchema.parse('John Doe')).not.toThrow();
      expect(() => nameSchema.parse('Anna')).not.toThrow();
    });

    it('should enforce minimum length of 2 characters', () => {
      expect(() => nameSchema.parse('A')).toThrow();
      expect(() => nameSchema.parse('')).toThrow();
    });

    it('should enforce maximum length of 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => nameSchema.parse(longName)).toThrow();
    });

    it('should accept name with exactly 2 characters', () => {
      expect(() => nameSchema.parse('Jo')).not.toThrow();
    });

    it('should accept name with exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      expect(() => nameSchema.parse(name)).not.toThrow();
    });

    it('should sanitize HTML tags', () => {
      const result = nameSchema.parse('John<script>alert("xss")</script>');
      expect(result).toBe('John');
    });

    it('should trim whitespace', () => {
      const result = nameSchema.parse('  John Doe  ');
      expect(result).toBe('John Doe');
    });

    it('should handle special characters', () => {
      expect(() => nameSchema.parse("O'Brien")).not.toThrow();
      expect(() => nameSchema.parse('José María')).not.toThrow();
    });
  });

  describe('messageSchema', () => {
    it('should accept valid messages with default limits', () => {
      expect(() => messageSchema().parse('This is a valid message.')).not.toThrow();
      expect(() => messageSchema().parse('A'.repeat(100))).not.toThrow();
    });

    it('should enforce default minimum length of 10 characters', () => {
      expect(() => messageSchema().parse('Short')).toThrow();
      expect(() => messageSchema().parse('A'.repeat(9))).toThrow();
    });

    it('should enforce default maximum length of 2000 characters', () => {
      expect(() => messageSchema().parse('A'.repeat(2001))).toThrow();
    });

    it('should accept message with exactly 10 characters', () => {
      expect(() => messageSchema().parse('A'.repeat(10))).not.toThrow();
    });

    it('should accept message with exactly 2000 characters', () => {
      expect(() => messageSchema().parse('A'.repeat(2000))).not.toThrow();
    });

    it('should support custom minimum length', () => {
      expect(() => messageSchema(5).parse('Test')).toThrow();
      expect(() => messageSchema(5).parse('Test5')).not.toThrow();
    });

    it('should support custom maximum length', () => {
      expect(() => messageSchema(10, 50).parse('A'.repeat(51))).toThrow();
      expect(() => messageSchema(10, 50).parse('A'.repeat(50))).not.toThrow();
    });

    it('should sanitize HTML tags', () => {
      const result = messageSchema().parse('Hello<script>alert("xss")</script> World');
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const result = messageSchema().parse('  Hello World Test  ');
      expect(result).toBe('Hello World Test');
    });
  });

  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      expect(() => phoneSchema.parse('+46 70 123 45 67')).not.toThrow();
      expect(() => phoneSchema.parse('+46701234567')).not.toThrow();
      expect(() => phoneSchema.parse('0701234567')).not.toThrow();
    });

    it('should accept phone numbers with at least 7 characters', () => {
      expect(() => phoneSchema.parse('1234567')).not.toThrow();
    });

    it('should reject phone numbers with fewer than 7 characters', () => {
      expect(() => phoneSchema.parse('123456')).toThrow();
    });

    it('should be optional', () => {
      expect(() => phoneSchema.parse(undefined)).not.toThrow();
      expect(phoneSchema.parse(undefined)).toBeUndefined();
    });

    it('should accept empty string as optional', () => {
      expect(() => phoneSchema.parse('')).not.toThrow();
    });

    it('should handle hyphens in phone number', () => {
      expect(() => phoneSchema.parse('+46-70-123-45-67')).not.toThrow();
    });
  });

  describe('subjectSchema', () => {
    it('should accept valid subject lines', () => {
      expect(() => subjectSchema.parse('Booking Inquiry')).not.toThrow();
      expect(() => subjectSchema.parse('A')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => subjectSchema.parse('')).toThrow();
    });

    it('should enforce maximum length of 200 characters', () => {
      expect(() => subjectSchema.parse('A'.repeat(201))).toThrow();
    });

    it('should accept subject with exactly 200 characters', () => {
      expect(() => subjectSchema.parse('A'.repeat(200))).not.toThrow();
    });

    it('should sanitize HTML tags', () => {
      const result = subjectSchema.parse('Subject<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('guestNameSchema', () => {
    it('should accept valid guest names', () => {
      expect(() => guestNameSchema.parse('John Doe')).not.toThrow();
    });

    it('should enforce minimum length of 2 characters', () => {
      expect(() => guestNameSchema.parse('A')).toThrow();
    });

    it('should enforce maximum length of 100 characters', () => {
      expect(() => guestNameSchema.parse('A'.repeat(101))).toThrow();
    });

    it('should trim whitespace but not sanitize HTML', () => {
      const result = guestNameSchema.parse('  John Doe  ');
      expect(result).toBe('John Doe');
    });
  });

  describe('specialRequestsSchema', () => {
    it('should accept valid special requests', () => {
      expect(() => specialRequestsSchema.parse('Please provide extra pillows')).not.toThrow();
    });

    it('should be optional', () => {
      expect(() => specialRequestsSchema.parse(undefined)).not.toThrow();
      expect(specialRequestsSchema.parse(undefined)).toBeUndefined();
    });

    it('should enforce maximum length of 1000 characters', () => {
      expect(() => specialRequestsSchema.parse('A'.repeat(1001))).toThrow();
    });

    it('should accept exactly 1000 characters', () => {
      expect(() => specialRequestsSchema.parse('A'.repeat(1000))).not.toThrow();
    });

    it('should sanitize HTML tags', () => {
      const result = specialRequestsSchema.parse('Extra pillows<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('numberOfGuestsSchema', () => {
    it('should accept valid guest count', () => {
      expect(() => numberOfGuestsSchema(6).parse(2)).not.toThrow();
      expect(() => numberOfGuestsSchema(6).parse(1)).not.toThrow();
    });

    it('should enforce minimum of 1 guest', () => {
      expect(() => numberOfGuestsSchema(6).parse(0)).toThrow();
      expect(() => numberOfGuestsSchema(6).parse(-1)).toThrow();
    });

    it('should enforce maximum based on property capacity', () => {
      expect(() => numberOfGuestsSchema(6).parse(7)).toThrow();
      expect(() => numberOfGuestsSchema(6).parse(6)).not.toThrow();
    });

    it('should support different max guest counts', () => {
      expect(() => numberOfGuestsSchema(10).parse(10)).not.toThrow();
      expect(() => numberOfGuestsSchema(10).parse(11)).toThrow();
    });
  });

  describe('contactFormSchema', () => {
    it('should validate complete contact form', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+46701234567',
        subject: 'Booking Question',
        message: 'I would like to know more about this property.',
      };
      expect(() => contactFormSchema.parse(validData)).not.toThrow();
    });

    it('should accept contact form without phone', () => {
      const dataWithoutPhone = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: undefined,
        subject: 'Booking Question',
        message: 'I would like to know more about this property.',
      };
      expect(() => contactFormSchema.parse(dataWithoutPhone)).not.toThrow();
    });

    it('should reject contact form with invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '+46701234567',
        subject: 'Booking Question',
        message: 'I would like to know more about this property.',
      };
      expect(() => contactFormSchema.parse(invalidData)).toThrow();
    });

    it('should reject contact form with short message', () => {
      const shortMessageData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+46701234567',
        subject: 'Question',
        message: 'Short',
      };
      expect(() => contactFormSchema.parse(shortMessageData)).toThrow();
    });
  });

  describe('bookingFormSchema', () => {
    it('should validate complete booking form', () => {
      const bookingSchema = bookingFormSchema(6);
      const validData = {
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+46701234567',
        number_of_guests: 4,
        special_requests: 'Please provide extra pillows',
      };
      expect(() => bookingSchema.parse(validData)).not.toThrow();
    });

    it('should enforce max guests based on property capacity', () => {
      const bookingSchema = bookingFormSchema(4);
      const tooManyGuests = {
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: '+46701234567',
        number_of_guests: 5,
        special_requests: undefined,
      };
      expect(() => bookingSchema.parse(tooManyGuests)).toThrow();
    });

    it('should accept booking without phone or special requests', () => {
      const bookingSchema = bookingFormSchema(6);
      const minimalData = {
        guest_name: 'John Doe',
        guest_email: 'john@example.com',
        guest_phone: undefined,
        number_of_guests: 2,
        special_requests: undefined,
      };
      expect(() => bookingSchema.parse(minimalData)).not.toThrow();
    });
  });

  describe('guestbookFormSchema', () => {
    it('should validate complete guestbook form', () => {
      const validData = {
        guestName: 'John Doe',
        message: 'This was a wonderful stay!',
      };
      expect(() => guestbookFormSchema.parse(validData)).not.toThrow();
    });

    it('should enforce minimum name length', () => {
      const shortNameData = {
        guestName: 'J',
        message: 'This was a wonderful stay!',
      };
      expect(() => guestbookFormSchema.parse(shortNameData)).toThrow();
    });

    it('should enforce minimum message length of 10 characters', () => {
      const shortMessageData = {
        guestName: 'John Doe',
        message: 'Nice stay',
      };
      expect(() => guestbookFormSchema.parse(shortMessageData)).toThrow();
    });

    it('should enforce maximum message length of 2000 characters', () => {
      const longMessageData = {
        guestName: 'John Doe',
        message: 'A'.repeat(2001),
      };
      expect(() => guestbookFormSchema.parse(longMessageData)).toThrow();
    });
  });
});
