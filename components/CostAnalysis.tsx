
import React, { useState, useEffect, useMemo } from 'react';
import { SavedRecipe, InventoryItem } from '../types';
import { BoxIcon } from './icons/BoxIcon';
import { storageService } from '../services/storageService';

const CostAnalysis: React.FC = () => {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const loadData = () => {
        setSavedRecipes(storageService.getRecipes());
        setInventory(storageService.getInventory());
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const getCostPerKg = (name: string, inventoryId?: string, snapshotCost?: number): number => {
      // 1. Try specific inventory link
      if (inventoryId) {
          const item = inventory.find(i => i.id === inventoryId);
          if (item && item.costPerKg) return item.costPerKg;
      }
      // 2. Try matching name in inventory
      const match = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (match && match.costPerKg) return match.costPerKg;

      // 3. Fallback to snapshot
      return snapshotCost || 0;
  };

  const analysis = useMemo(() => {
    return savedRecipes.map(recipe => {
        const targetDoughWeight = recipe.numberOfLoaves * recipe.weightPerLoaf;
        const totalPercentage = 1 + recipe.ingredients.reduce((sum, ing) => sum + (ing.percentage || 0) / 100, 0);
        const flourWeight = totalPercentage > 0 ? targetDoughWeight / totalPercentage : 0;

        // Base Flour Cost
        const baseCostPerKg = getCostPerKg(recipe.baseFlourName || 'Base Flour', recipe.baseFlourInventoryId, recipe.baseFlourCostPerKg);
        const baseCost = (flourWeight / 1000) * baseCostPerKg;

        // Ingredients Cost
        let ingredientsCost = 0;
        recipe.ingredients.forEach(ing => {
            const weight = (flourWeight * (ing.percentage || 0)) / 100;
            const costPerKg = getCostPerKg(ing.name, ing.inventoryId, ing.costPerKg);
            ingredientsCost += (weight / 1000) * costPerKg;
        });

        const totalBatchCost = baseCost + ingredientsCost;
        const costPerLoaf = recipe.numberOfLoaves > 0 ? totalBatchCost / recipe.numberOfLoaves : 0;

        return {
            ...recipe,
            totalBatchCost,
            costPerLoaf,
            baseCostPerKg // tracking to see if we have valid cost data
        };
    }).sort((a, b) => b.costPerLoaf - a.costPerLoaf);
  }, [savedRecipes, inventory]);

  return (
    <div className="animate-fade-in">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-800 mb-1">Cost Analysis</h2>
            <p className="text-stone-600">Profitability breakdown for all saved recipes based on real-time inventory prices.</p>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Recipe Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Batch Specs</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Total Batch Cost</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider text-amber-700">Cost Per Loaf</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                    {analysis.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                                No recipes found. Create recipes in the Recipe Management tab.
                            </td>
                        </tr>
                    ) : (
                        analysis.map(row => (
                            <tr key={row.id} className="hover:bg-stone-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900">{row.name}</div>
                                    <div className="text-xs text-stone-500">v{row.version} • {row.date}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-stone-600">
                                    {row.numberOfLoaves} loaves @ {row.weightPerLoaf}g
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-stone-800">
                                    ${row.totalBatchCost.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800">
                                        ${row.costPerLoaf.toFixed(2)}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="mt-6 bg-stone-50 border border-stone-200 rounded-lg p-4 flex items-start gap-3">
             <BoxIcon className="w-6 h-6 text-stone-400 mt-1" />
             <div>
                 <h4 className="font-medium text-stone-800 text-sm">How is this calculated?</h4>
                 <p className="text-xs text-stone-600 mt-1">
                     Costs are calculated dynamically using the current "Cost Per Kg" from your <strong>Inventory Management</strong>. 
                     If an ingredient isn't in inventory, the system falls back to the manual cost entered when the recipe was last saved.
                 </p>
             </div>
        </div>
    </div>
  );
};

export default CostAnalysis;
