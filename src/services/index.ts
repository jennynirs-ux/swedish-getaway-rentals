/**
 * Service Layer - Centralized Supabase API calls
 *
 * This module exports all service functions for interacting with the database.
 * Each service handles a specific domain:
 * - propertyService: Property queries and filtering
 * - bookingService: Booking creation and management
 * - authService: User authentication and profiles
 * - reviewService: Property reviews and ratings
 * - favoritesService: User favorite properties
 */

export * from './propertyService';
export * from './bookingService';
export * from './authService';
export * from './reviewService';
export * from './favoritesService';
