import { describe, it, expect, vi } from 'vitest';
import { AppError, handleSupabaseError, safeAsync } from '../errorHandling';

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should create error with context', () => {
      const context = { propertyId: '123', reason: 'invalid' };
      const error = new AppError('Property error', 'PROP_ERROR', 422, context);
      expect(error.context).toEqual(context);
    });

    it('should create error without status code', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBeUndefined();
    });

    it('should be an instanceof Error', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      expect(error instanceof Error).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new AppError('Test error', 'TEST_CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('handleSupabaseError', () => {
    it('should return data when result is successful', () => {
      const data = { id: '1', name: 'Test Property' };
      const result = { data, error: null };
      const output = handleSupabaseError(result, 'fetch property');
      expect(output).toEqual(data);
    });

    it('should throw AppError when result has error', () => {
      const error = {
        message: 'Failed to fetch',
        code: 'FETCH_ERROR',
        status: 500,
      };
      const result = { data: null, error };
      expect(() => handleSupabaseError(result, 'fetch property')).toThrow(AppError);
    });

    it('should include error message in thrown error', () => {
      const error = {
        message: 'Database connection failed',
        code: 'DB_ERROR',
        status: 500,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'fetch property');
      } catch (e) {
        expect((e as AppError).message).toBe('Database connection failed');
      }
    });

    it('should use fallback message when error.message is missing', () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        status: 500,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'update record');
      } catch (e) {
        expect((e as AppError).message).toBe('Failed to update record');
      }
    });

    it('should include error code in thrown error', () => {
      const error = {
        message: 'Invalid request',
        code: 'INVALID_REQUEST',
        status: 400,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'validate data');
      } catch (e) {
        expect((e as AppError).code).toBe('INVALID_REQUEST');
      }
    });

    it('should use fallback code when error.code is missing', () => {
      const error = {
        message: 'Unknown error',
        status: 500,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'unknown operation');
      } catch (e) {
        expect((e as AppError).code).toBe('UNKNOWN');
      }
    });

    it('should include status code in thrown error', () => {
      const error = {
        message: 'Not found',
        code: 'NOT_FOUND',
        status: 404,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'find resource');
      } catch (e) {
        expect((e as AppError).statusCode).toBe(404);
      }
    });

    it('should throw when data is null even without error object', () => {
      const result = { data: null, error: null };
      expect(() => handleSupabaseError(result, 'fetch data')).toThrow(AppError);
    });

    it('should throw with NO_DATA code when data is null', () => {
      const result = { data: null, error: null };
      try {
        handleSupabaseError(result, 'fetch data');
      } catch (e) {
        expect((e as AppError).code).toBe('NO_DATA');
      }
    });

    it('should include context in error message', () => {
      const error = {
        message: 'Connection failed',
        code: 'CONN_ERROR',
        status: 503,
      };
      const result = { data: null, error };
      try {
        handleSupabaseError(result, 'connect to database');
      } catch (e) {
        expect((e as AppError).message).toBe('Connection failed');
      }
    });

    it('should handle complex data structures', () => {
      const data = {
        id: '1',
        properties: [
          { id: '1', name: 'Property 1' },
          { id: '2', name: 'Property 2' },
        ],
        meta: { total: 2 },
      };
      const result = { data, error: null };
      const output = handleSupabaseError(result, 'fetch properties');
      expect(output).toEqual(data);
      expect(Array.isArray(output.properties)).toBe(true);
    });
  });

  describe('safeAsync', () => {
    it('should return [data, null] on success', async () => {
      const fn = async () => 'success';
      const [data, error] = await safeAsync(fn);
      expect(data).toBe('success');
      expect(error).toBe(null);
    });

    it('should return [null, error] on failure', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe(null);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Test error');
    });

    it('should handle promise rejection', async () => {
      const fn = async () => {
        return Promise.reject(new Error('Rejection error'));
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe(null);
      expect(error?.message).toBe('Rejection error');
    });

    it('should handle non-Error thrown values', async () => {
      const fn = async () => {
        throw 'String error';
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe(null);
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('String error');
    });

    it('should handle number thrown values', async () => {
      const fn = async () => {
        throw 42;
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe(null);
      expect(error?.message).toBe('42');
    });

    it('should return complex data on success', async () => {
      const expectedData = {
        id: '1',
        name: 'Test',
        nested: { value: 'data' },
      };
      const fn = async () => expectedData;
      const [data, error] = await safeAsync(fn);
      expect(data).toEqual(expectedData);
      expect(error).toBe(null);
    });

    it('should handle async function with delay', async () => {
      const fn = async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('delayed'), 10);
        });
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe('delayed');
      expect(error).toBe(null);
    });

    it('should preserve error stack trace', async () => {
      const fn = async () => {
        throw new Error('Stack trace test');
      };
      const [data, error] = await safeAsync(fn);
      expect(error?.stack).toBeDefined();
      expect(error?.stack).toContain('safeAsync');
    });

    it('should handle AppError instances', async () => {
      const fn = async () => {
        throw new AppError('App error test', 'APP_TEST_ERROR', 400);
      };
      const [data, error] = await safeAsync(fn);
      expect(data).toBe(null);
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('APP_TEST_ERROR');
    });
  });
});
