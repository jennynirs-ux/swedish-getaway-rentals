import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * Shared validation schemas for forms across the application.
 * All schemas include sanitization to prevent XSS attacks.
 */

const sanitize = (val: string) => DOMPurify.sanitize(val.trim());

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .transform(val => val.trim());

/**
 * Phone number validation schema (optional)
 * Accepts formats like: +46 XX XXX XX XX, +46701234567, etc.
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(val),
    'Invalid phone number'
  )
  .transform((val) => (val ? sanitize(val) : undefined));

/**
 * Name validation schema with sanitization
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .transform(sanitize);

/**
 * Message validation schema with configurable min/max length
 */
export const messageSchema = (min = 10, max = 2000) =>
  z
    .string()
    .min(min, `Message must be at least ${min} characters`)
    .max(max, `Message must be less than ${max} characters`)
    .transform(sanitize);

/**
 * Subject line validation schema
 */
export const subjectSchema = z
  .string()
  .min(1, 'Subject is required')
  .max(200, 'Subject must be less than 200 characters')
  .transform(sanitize);

/**
 * Guest name validation schema (for guestbook entries)
 * Similar to nameSchema with full sanitization
 */
export const guestNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .trim()
  .transform((val) => DOMPurify.sanitize(val));

/**
 * Special requests validation schema
 */
export const specialRequestsSchema = z
  .string()
  .max(1000, 'Special requests must be less than 1000 characters')
  .optional()
  .transform((val) => (val ? sanitize(val) : undefined));

/**
 * Number of guests validation schema
 */
export const numberOfGuestsSchema = (maxGuests: number) =>
  z
    .number()
    .min(1, 'At least 1 guest required')
    .max(maxGuests, `Maximum ${maxGuests} guests allowed`);

/**
 * Contact form schema - combines common contact fields
 */
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subject: subjectSchema,
  message: messageSchema(),
});

/**
 * Booking form schema - combines booking-specific fields
 */
export const bookingFormSchema = (maxGuests: number) =>
  z.object({
    guest_name: nameSchema,
    guest_email: emailSchema,
    guest_phone: phoneSchema,
    number_of_guests: numberOfGuestsSchema(maxGuests),
    special_requests: specialRequestsSchema,
  });

/**
 * Guestbook form schema - simplified for guest reviews
 */
export const guestbookFormSchema = z.object({
  guestName: guestNameSchema,
  message: messageSchema(10, 2000),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type BookingFormData = ReturnType<typeof bookingFormSchema>;
export type GuestbookFormData = z.infer<typeof guestbookFormSchema>;
