import { Ingredient } from '../types';

export const calculateTotalFlour = (
  numberOfLoaves: number,
  weightPerLoaf: number,
  ingredients: Ingredient[]
): number => {
  const targetDoughWeight = (numberOfLoaves || 0) * (weightPerLoaf || 0);
  const totalPercentage = 1 + ingredients.reduce((sum, ing) => sum + (ing.percentage || 0) / 100, 0);
  return totalPercentage > 0 ? targetDoughWeight / totalPercentage : 0;
};

export const calculateIngredientWeight = (
  totalFlour: number,
  percentage: number
): number => {
  return (totalFlour * (percentage || 0)) / 100;
};

export const calculateTotalBatchWeight = (
  totalFlour: number,
  ingredients: Ingredient[]
): number => {
  return (
    totalFlour +
    ingredients.reduce((sum, ing) => sum + calculateIngredientWeight(totalFlour, ing.percentage), 0)
  );
};
