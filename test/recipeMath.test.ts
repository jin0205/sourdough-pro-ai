import { describe, it, expect } from 'vitest';
import { calculateTotalFlour, calculateIngredientWeight, calculateTotalBatchWeight } from '../utils/recipeMath';
import { Ingredient } from '../types';

describe('Recipe Calculations', () => {
  const ingredients: Ingredient[] = [
    { id: 1, name: 'Water', percentage: 75 },
    { id: 2, name: 'Levain', percentage: 20 },
    { id: 3, name: 'Salt', percentage: 2 },
  ];

  it('calculates total flour weight correctly', () => {
    // Total % = 100 (Flour) + 75 + 20 + 2 = 197% = 1.97
    // Target Weight = 2 * 900 = 1800g
    // Flour = 1800 / 1.97 ≈ 913.705
    const totalFlour = calculateTotalFlour(2, 900, ingredients);
    expect(totalFlour).toBeCloseTo(913.705, 2);
  });

  it('calculates ingredient weight correctly', () => {
    const flour = 1000;
    const waterPercentage = 75;
    expect(calculateIngredientWeight(flour, waterPercentage)).toBe(750);
  });

  it('calculates total batch weight correctly', () => {
    const totalFlour = 1000;
    const batchWeight = calculateTotalBatchWeight(totalFlour, ingredients);
    // 1000 + 750 + 200 + 20 = 1970
    expect(batchWeight).toBe(1970);
  });

  it('handles zero loaves', () => {
    expect(calculateTotalFlour(0, 900, ingredients)).toBe(0);
  });

  it('handles empty ingredients', () => {
    // Total % = 100% = 1
    // Target = 1000
    // Flour = 1000 / 1 = 1000
    expect(calculateTotalFlour(1, 1000, [])).toBe(1000);
  });
});
