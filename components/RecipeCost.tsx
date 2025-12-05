
import React, { useMemo, useState } from 'react';
import { Ingredient, InventoryItem } from '../types';
import { BoxIcon } from './icons/BoxIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import Spinner from './Spinner';
import { suggestIngredientCost } from '../services/geminiService';

interface RecipeCostProps {
  ingredients: Ingredient[];
  totalFlour: number;
  numberOfLoaves: number;
  baseFlourName: string;
  baseFlourCost: string;
  onUpdateBaseFlourCost: (value: string) => void;
  onUpdateIngredientCost: (id: number, value: string) => void;
  inventory: InventoryItem[];
}

const RecipeCost: React.FC<RecipeCostProps> = ({
  ingredients,
  totalFlour,
  numberOfLoaves,
  baseFlourName,
  baseFlourCost,
  onUpdateBaseFlourCost,
  onUpdateIngredientCost,
  inventory
}) => {
  // State for AI suggestions
  const [loadingSuggestion, setLoadingSuggestion] = useState<number | 'base' | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, number>>({});

  // Helper to find inventory cost
  const getInventoryCost = (name: string): number | undefined => {
      const match = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
      return match ? match.costPerKg : undefined;
  };

  const handleSuggestCost = async (name: string, id: number | 'base') => {
      setLoadingSuggestion(id);
      const suggestedPrice = await suggestIngredientCost(name);
      
      if (suggestedPrice !== null && suggestedPrice > 0) {
          setSuggestions(prev => ({ ...prev, [id.toString()]: suggestedPrice }));
      } else {
          alert(`Could not find a confident market price for ${name}.`);
      }
      setLoadingSuggestion(null);
  };

  const applySuggestion = (id: number | 'base', price: number) => {
      if (id === 'base') {
          onUpdateBaseFlourCost(price.toFixed(2));
      } else {
          onUpdateIngredientCost(id as number, price.toFixed(2));
      }
      // Clear suggestion after applying
      const newSuggestions = { ...suggestions };
      delete newSuggestions[id.toString()];
      setSuggestions(newSuggestions);
  };

  const calculation = useMemo(() => {
      // Base Flour Cost Strategy:
      // 1. Try to find cost in inventory matching baseFlourName
      // 2. Fallback to manual input (baseFlourCost)
      const invBaseCost = getInventoryCost(baseFlourName);
      const manualBaseCost = parseFloat(baseFlourCost);
      
      const effectiveBaseCost = invBaseCost !== undefined ? invBaseCost : (isNaN(manualBaseCost) ? 0 : manualBaseCost);
      const usingInvBase = invBaseCost !== undefined;

      // totalFlour is in grams, cost is per kg
      const baseTotal = (totalFlour / 1000) * effectiveBaseCost;
      
      let totalIngredientsCost = 0;
      const ingredientBreakdown = ingredients.map(ing => {
          const weight = (totalFlour * (ing.percentage || 0)) / 100;
          
          // Ingredient Cost Strategy:
          // 1. Try to find cost in inventory matching ing.name
          // 2. Fallback to manual input stored on ingredient
          const invCost = getInventoryCost(ing.name);
          const effectiveCostPerKg = invCost !== undefined ? invCost : (ing.costPerKg || 0);
          
          const cost = (weight / 1000) * effectiveCostPerKg;
          totalIngredientsCost += cost;
          
          return { 
              ...ing, 
              weight, 
              cost, 
              costPerKg: effectiveCostPerKg,
              usingInventory: invCost !== undefined
          };
      });

      const totalRecipeCost = baseTotal + totalIngredientsCost;
      const costPerLoaf = numberOfLoaves > 0 ? totalRecipeCost / numberOfLoaves : 0;

      return { baseTotal, ingredientBreakdown, totalRecipeCost, costPerLoaf, effectiveBaseCost, usingInvBase };
  }, [totalFlour, baseFlourName, baseFlourCost, ingredients, numberOfLoaves, inventory]);

  if (totalFlour <= 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            Recipe Cost Calculator
          </h3>
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded border border-stone-200">Prices per kg</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Weight</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Price ($/kg)</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {/* Base Flour */}
            <tr className="hover:bg-stone-50">
              <td className="px-4 py-2 text-sm font-medium text-stone-900">
                  {baseFlourName || 'Base Flour (Total)'}
                  {calculation.usingInvBase && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800" title="Using price from Inventory">
                          <BoxIcon className="w-3 h-3 mr-1" /> Inv
                      </span>
                  )}
              </td>
              <td className="px-4 py-2 text-sm text-stone-600 text-right">{totalFlour.toFixed(0)}g</td>
              <td className="px-4 py-2 text-right">
                <div className="flex flex-col items-end">
                    <div className="flex items-center justify-end gap-2">
                        {calculation.usingInvBase ? (
                             <span className="text-sm text-stone-800">${calculation.effectiveBaseCost.toFixed(2)}</span>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleSuggestCost(baseFlourName || 'Bread Flour', 'base')}
                                    disabled={loadingSuggestion === 'base'}
                                    className="p-1 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                                    title="Auto-suggest market price"
                                >
                                    {loadingSuggestion === 'base' ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                </button>
                                <div className="relative rounded-md shadow-sm w-24">
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                            <span className="text-stone-400 sm:text-xs">$</span>
                                        </div>
                                        <input
                                        type="number"
                                        step="0.01"
                                        value={baseFlourCost}
                                        onChange={(e) => onUpdateBaseFlourCost(e.target.value)}
                                        className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-xs border-stone-300 rounded-md pl-5 py-1 text-right"
                                        placeholder="0.00"
                                        />
                                </div>
                            </>
                        )}
                    </div>
                    {/* Suggestion Popunder */}
                    {suggestions['base'] !== undefined && !calculation.usingInvBase && (
                         <button 
                            onClick={() => applySuggestion('base', suggestions['base'])}
                            className="text-[10px] text-amber-600 font-medium hover:underline mt-1 flex items-center cursor-pointer animate-fade-in"
                         >
                             Est: ${suggestions['base'].toFixed(2)} &larr; Apply
                         </button>
                    )}
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-stone-800 text-right font-medium">
                ${calculation.baseTotal.toFixed(2)}
              </td>
            </tr>
            
            {/* Ingredients */}
            {calculation.ingredientBreakdown.map(item => (
                <tr key={item.id} className="hover:bg-stone-50">
                    <td className="px-4 py-2 text-sm text-stone-900">
                        {item.name || 'Unnamed Ingredient'}
                        {item.usingInventory && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800" title="Using price from Inventory">
                                <BoxIcon className="w-3 h-3 mr-1" /> Inv
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-600 text-right">{item.weight.toFixed(0)}g</td>
                    <td className="px-4 py-2 text-right">
                         <div className="flex flex-col items-end">
                             <div className="flex items-center justify-end gap-2">
                                {item.usingInventory ? (
                                    <span className="text-sm text-stone-800">${item.costPerKg?.toFixed(2)}</span>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleSuggestCost(item.name, item.id)}
                                            disabled={loadingSuggestion === item.id || !item.name}
                                            className="p-1 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-50"
                                            title="Auto-suggest market price"
                                        >
                                            {loadingSuggestion === item.id ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                        </button>
                                        <div className="relative rounded-md shadow-sm w-24">
                                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                <span className="text-stone-400 sm:text-xs">$</span>
                                            </div>
                                            <input
                                            type="number"
                                            step="0.01"
                                            value={item.costPerKg || ''}
                                            onChange={(e) => onUpdateIngredientCost(item.id, e.target.value)}
                                            className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-xs border-stone-300 rounded-md pl-5 py-1 text-right"
                                            placeholder="0.00"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Suggestion Popunder */}
                            {suggestions[item.id.toString()] !== undefined && !item.usingInventory && (
                                <button 
                                    onClick={() => applySuggestion(item.id, suggestions[item.id.toString()])}
                                    className="text-[10px] text-amber-600 font-medium hover:underline mt-1 flex items-center cursor-pointer animate-fade-in"
                                >
                                    Est: ${suggestions[item.id.toString()].toFixed(2)} &larr; Apply
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-800 text-right font-medium">
                        ${item.cost.toFixed(2)}
                    </td>
                </tr>
            ))}
            
            {/* Total */}
            <tr className="bg-amber-50 border-t-2 border-amber-100">
                <td className="px-4 py-3 text-stone-900 font-bold">Total Batch Cost</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-stone-500 text-xs font-normal">
                    <span className="block font-bold text-amber-800 text-sm">${calculation.costPerLoaf.toFixed(2)} / loaf</span>
                </td>
                <td className="px-4 py-3 text-right text-amber-700 font-bold text-lg">
                    ${calculation.totalRecipeCost.toFixed(2)}
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipeCost;
