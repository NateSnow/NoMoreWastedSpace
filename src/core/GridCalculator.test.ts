import { describe, it, expect } from 'vitest';
import { validateDimensions, calculateGrid } from './GridCalculator';

describe('GridCalculator', () => {
  describe('validateDimensions', () => {
    it('accepts valid dimensions', () => {
      const result = validateDimensions({ width: '100', depth: '200', height: '50' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts boundary minimum values (42mm width/depth)', () => {
      const result = validateDimensions({ width: '42', depth: '42', height: '1' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts boundary maximum values (2000mm)', () => {
      const result = validateDimensions({ width: '2000', depth: '2000', height: '2000' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects non-numeric width', () => {
      const result = validateDimensions({ width: 'abc', depth: '100', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width must be a valid number');
    });

    it('rejects non-numeric depth', () => {
      const result = validateDimensions({ width: '100', depth: 'xyz', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Depth must be a valid number');
    });

    it('rejects non-numeric height', () => {
      const result = validateDimensions({ width: '100', depth: '100', height: 'tall' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Height must be a valid number');
    });

    it('rejects empty string inputs', () => {
      const result = validateDimensions({ width: '', depth: '', height: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('rejects zero values', () => {
      const result = validateDimensions({ width: '0', depth: '0', height: '0' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width must be a positive number');
      expect(result.errors).toContain('Depth must be a positive number');
      expect(result.errors).toContain('Height must be a positive number');
    });

    it('rejects negative values', () => {
      const result = validateDimensions({ width: '-10', depth: '-5', height: '-1' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Width must be a positive number');
      expect(result.errors).toContain('Depth must be a positive number');
      expect(result.errors).toContain('Height must be a positive number');
    });

    it('rejects width less than 42mm with "too small" error', () => {
      const result = validateDimensions({ width: '41', depth: '100', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too small');
    });

    it('rejects depth less than 42mm with "too small" error', () => {
      const result = validateDimensions({ width: '100', depth: '30', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too small');
    });

    it('rejects width greater than 2000mm with "exceeds maximum" error', () => {
      const result = validateDimensions({ width: '2001', depth: '100', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('rejects depth greater than 2000mm with "exceeds maximum" error', () => {
      const result = validateDimensions({ width: '100', depth: '2001', height: '50' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('rejects height greater than 2000mm with "exceeds maximum" error', () => {
      const result = validateDimensions({ width: '100', depth: '100', height: '2001' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('allows height less than 42mm (height has no minimum grid constraint)', () => {
      const result = validateDimensions({ width: '100', depth: '100', height: '5' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('collects multiple errors from all fields', () => {
      const result = validateDimensions({ width: 'bad', depth: '-1', height: '0' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('handles whitespace-padded inputs', () => {
      const result = validateDimensions({ width: ' 100 ', depth: ' 200 ', height: ' 50 ' });
      expect(result.valid).toBe(true);
    });

    it('accepts decimal values within valid range', () => {
      const result = validateDimensions({ width: '100.5', depth: '200.7', height: '50.3' });
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateGrid', () => {
    it('calculates grid for exact multiples of 42', () => {
      const result = calculateGrid({ width: 84, depth: 126, height: 50 });
      expect(result.columnsX).toBe(2);
      expect(result.rowsY).toBe(3);
    });

    it('floors non-exact divisions', () => {
      const result = calculateGrid({ width: 100, depth: 100, height: 50 });
      expect(result.columnsX).toBe(2); // floor(100/42) = 2
      expect(result.rowsY).toBe(2);    // floor(100/42) = 2
    });

    it('returns 1x1 for minimum valid dimensions (42mm)', () => {
      const result = calculateGrid({ width: 42, depth: 42, height: 10 });
      expect(result.columnsX).toBe(1);
      expect(result.rowsY).toBe(1);
    });

    it('calculates maximum grid for 2000mm dimensions', () => {
      const result = calculateGrid({ width: 2000, depth: 2000, height: 100 });
      expect(result.columnsX).toBe(47); // floor(2000/42) = 47
      expect(result.rowsY).toBe(47);
    });

    it('handles asymmetric dimensions', () => {
      const result = calculateGrid({ width: 500, depth: 200, height: 80 });
      expect(result.columnsX).toBe(11); // floor(500/42) = 11
      expect(result.rowsY).toBe(4);     // floor(200/42) = 4
    });

    it('handles dimensions just above a grid unit boundary', () => {
      const result = calculateGrid({ width: 43, depth: 83, height: 50 });
      expect(result.columnsX).toBe(1); // floor(43/42) = 1
      expect(result.rowsY).toBe(1);    // floor(83/42) = 1
    });

    it('handles dimensions just below a grid unit boundary', () => {
      const result = calculateGrid({ width: 83, depth: 125, height: 50 });
      expect(result.columnsX).toBe(1); // floor(83/42) = 1
      expect(result.rowsY).toBe(2);    // floor(125/42) = 2
    });
  });
});
