import React, { useState, useEffect, useMemo } from 'react';
import { SavedRecipe, PlannerItem, InventoryItem } from '../types';

const BatchPlanner: React.FC = () => {
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Load saved recipes, persisted plan, and inventory
  useEffect(() => {
    const recipesStr = localStorage.getItem('sourdough_recipes');
    if (recipesStr) {
      try {
        setSavedRecipes(JSON.parse(recipesStr));
      } catch (e) {
        console.error('Failed to load recipes', e);
      }
    }

    const planStr = localStorage.getItem('sourdough_planner_items');
    if (planStr) {
      try {
        setPlannerItems(JSON.parse(planStr));
      } catch (e) {
        console.error('Failed to load plan', e);
      }
    }

    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) {
        try {
            setInventory(JSON.parse(invStr));
        } catch (e) {
            console.error('Failed to load inventory', e);
        }
    }
  }, []);

  // Persist plan changes
  useEffect(() => {
    localStorage.setItem('sourdough_planner_items', JSON.stringify(plannerItems));
  }, [plannerItems]);

  const addToPlan = (recipe: SavedRecipe) => {
    const newItem: PlannerItem = {
      uniqueId: Date.now().toString() + Math.random().toString().slice(2, 5),
      recipe: recipe,
      count: recipe.numberOfLoaves
    };
    setPlannerItems([...plannerItems, newItem]);
  };

  const removeFromPlan = (uniqueId: string) => {
    setPlannerItems(plannerItems.filter(i => i.uniqueId !== uniqueId));
  };

  const updatePlanCount = (uniqueId: string, countStr: string) => {
    const count = parseFloat(countStr);
    setPlannerItems(plannerItems.map(i =>
      i.uniqueId === uniqueId ? { ...i, count: isNaN(count) ? 0 : count } : i
    ));
  };

  const plannerSummary = useMemo<{ summary: Record<string, { weight: number, cost: number }>; totalDough: number; totalCost: number }>(() => {
    const summary: Record<string, { weight: number, cost: number }> = {};
    let totalDough: number = 0;
    let totalCost: number = 0;

    // Helper to resolve cost
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

    plannerItems.forEach(item => {
      const { recipe, count } = item;
      const targetBatchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
      totalDough += targetBatchWeight;

      const totalPercentage = 1 + recipe.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0) / 100, 0);
      const flourWeight = totalPercentage > 0 ? targetBatchWeight / totalPercentage : 0;

      // Base Flour
      const baseName = recipe.baseFlourName || "Base Flour";
      // Try to unify base flours if named same
      if (!summary[baseName]) summary[baseName] = { weight: 0, cost: 0 };
      
      const baseCostPerKg = getCostPerKg(baseName, recipe.baseFlourInventoryId, recipe.baseFlourCostPerKg);
      const baseCost = (flourWeight / 1000) * baseCostPerKg;
      
      summary[baseName].weight += flourWeight;
      summary[baseName].cost += baseCost;
      totalCost += baseCost;

      // Ingredients
      recipe.ingredients.forEach(ing => {
        if (!ing.name) return;
        const weight = (flourWeight * (Number(ing.percentage) || 0)) / 100;
        const name = ing.name.trim();
        
        if (!summary[name]) summary[name] = { weight: 0, cost: 0 };
        
        const ingCostPerKg = getCostPerKg(name, ing.inventoryId, ing.costPerKg);
        const ingCost = (weight / 1000) * ingCostPerKg;

        summary[name].weight += weight;
        summary[name].cost += ingCost;
        totalCost += ingCost;
      });
    });

    return { summary, totalDough, totalCost };
  }, [plannerItems, inventory]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 mb-1">Batch Production Planner</h2>
        <p className="text-stone-600">Combine multiple recipes into a master production list with cost estimation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Recipe Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-3">Add Recipes</h3>
            {savedRecipes.length === 0 ? (
              <p className="text-sm text-stone-500">No saved recipes. Go to the Calculator to create and save recipes.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {savedRecipes.map(recipe => (
                  <li key={recipe.id} className="flex items-center justify-between p-2 bg-stone-50 rounded hover:bg-stone-100">
                    <div className="truncate mr-2">
                      <p className="text-sm font-medium text-stone-700 truncate">{recipe.name}</p>
                      <p className="text-xs text-stone-500">v{recipe.version} • {recipe.numberOfLoaves} @ {recipe.weightPerLoaf}g</p>
                    </div>
                    <button
                      onClick={() => addToPlan(recipe)}
                      className="text-xs bg-white border border-stone-300 px-2 py-1 rounded text-stone-600 hover:text-amber-600 hover:border-amber-400 transition-colors"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
               <h3 className="font-semibold text-stone-800">Current Plan</h3>
               {plannerItems.length > 0 && (
                   <button onClick={() => setPlannerItems([])} className="text-xs text-red-500 hover:text-red-700">Clear All</button>
               )}
            </div>
            
            {plannerItems.length === 0 ? (
              <p className="text-sm text-stone-500 italic">Plan is empty.</p>
            ) : (
              <ul className="space-y-3">
                {plannerItems.map((item) => (
                  <li key={item.uniqueId} className="border-b border-stone-100 pb-2 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-stone-800">{item.recipe.name}</span>
                      <button onClick={() => removeFromPlan(item.uniqueId)} className="text-red-400 hover:text-red-600 text-xs px-1">&times;</button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <label className="text-stone-500 text-xs">Loaves:</label>
                      <input
                        type="number"
                        value={item.count}
                        onChange={(e) => updatePlanCount(item.uniqueId, e.target.value)}
                        className="w-16 p-1 text-xs border border-stone-300 rounded focus:border-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-stone-400 text-xs">x {item.recipe.weightPerLoaf}g</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Aggregation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
            <div className="bg-stone-800 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Master Production List</h3>
              <div className="text-right">
                  <div className="text-sm opacity-80">Total Dough: {(plannerSummary.totalDough / 1000).toFixed(2)} kg</div>
                  <div className="text-xl font-bold text-amber-400">Est. Cost: ${plannerSummary.totalCost.toFixed(2)}</div>
              </div>
            </div>

            {Object.keys(plannerSummary.summary).length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                Add recipes to the plan to view ingredient requirements and costs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Total Weight</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-200">
                    {(Object.entries(plannerSummary.summary) as [string, { weight: number, cost: number }][])
                        .sort((a, b) => b[1].weight - a[1].weight)
                        .map(([name, data]) => (
                      <tr key={name}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 text-right">
                          {data.weight >= 1000 ? `${(data.weight / 1000).toFixed(2)} kg` : `${data.weight.toFixed(0)} g`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-800 text-right font-medium">
                            ${data.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchPlanner;