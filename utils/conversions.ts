import { UnitOfMeasure } from '../types';

export const convertToGrams = (weight: number, unit: UnitOfMeasure): number => {
  switch (unit) {
    case 'lb':
      return weight * 453.592;
    case 'oz':
      return weight * 28.3495;
    case 'kg':
      return weight * 1000;
    case 'g':
      return weight;
    default:
      return weight;
  }
};
