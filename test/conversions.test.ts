import { describe, it, expect } from 'vitest';
import { convertToGrams } from '../utils/conversions';

describe('convertToGrams', () => {
  it('converts pounds to grams correctly', () => {
    expect(convertToGrams(1, 'lb')).toBeCloseTo(453.592);
  });

  it('converts ounces to grams correctly', () => {
    expect(convertToGrams(1, 'oz')).toBeCloseTo(28.3495);
  });

  it('converts kilograms to grams correctly', () => {
    expect(convertToGrams(1, 'kg')).toBe(1000);
  });

  it('returns grams as is', () => {
    expect(convertToGrams(500, 'g')).toBe(500);
  });

  it('handles zero correctly', () => {
    expect(convertToGrams(0, 'lb')).toBe(0);
  });
});
