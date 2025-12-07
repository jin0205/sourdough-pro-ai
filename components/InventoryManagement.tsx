
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem, UnitOfMeasure, SavedRecipe } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';
// Import the common lists for consistency. 
// Ideally these would be in a shared constant file, but we will define the combined list here for the datalist.
const COMMON_INGREDIENTS_LIST = [
  // Flours
  'Bread Flour', 'Strong White Flour', 'All-Purpose Flour', 'Whole Wheat Flour', 
  'Whole Grain Flour', 'High Gluten Flour', 'Pastry Flour', 'Cake Flour',
  'Rye Flour', 'Whole Rye Flour', 'Medium Rye', 'Dark Rye', 'Pumpernickel',
  'Spelt Flour', 'White Spelt', 'Semolina', 'Durum Flour', 
  'Einkorn', 'Emmer', 'Kamut (Khorasan)', 'Barley Flour', 'Buckwheat Flour',
  'Type 00', 'Type 0', 'Type 1', 'Type 2', 'Integrale',
  'T45', 'T55', 'T65', 'T80', 'T110', 'T150', 'T170',
  'Manitoba', 'Rice Flour', 'Cornmeal',
  // Liquids & Starters
  'Water', 'Levain', 'Stiff Levain', 'Poolish', 'Biga', 'Milk', 'Buttermilk', 'Beer', 'Coffee',
  // Salts & Yeasts
  'Salt', 'Sea Salt', 'Kosher Salt', 'Instant Yeast', 'Active Dry Yeast', 'Fresh Yeast',
  // Fats
  'Olive Oil', 'Butter', 'Lard', 'Vegetable Oil', 'Coconut Oil',
  // Sweeteners
  'Sugar', 'Brown Sugar', 'Honey', 'Molasses', 'Maple Syrup', 'Malt Syrup', 'Diastatic Malt Powder', 'Non-Diastatic Malt',
  // Inclusions
  'Raisins', 'Cranberries', 'Walnuts', 'Pecans', 'Sunflower Seeds', 'Sesame Seeds', 'Pumpkin Seeds', 
  'Flax Seeds', 'Chia Seeds', 'Poppy Seeds', 'Oats', 'Rolled Oats',
  'Chocolate Chips', 'Cocoa Powder', 'Cinnamon', 'Cardamom', 'Cheese', 'Olives', 'Garlic'
];

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  
  // Package Input State
  const [packageWeight, setPackageWeight] = useState('');
  const [packageUnit, setPackageUnit] = useState<UnitOfMeasure>('lb');
  const [costPerPackage, setCostPerPackage] = useState('');
  const [itemsPerPackage, setItemsPerPackage] = useState('1');

  // Load Data & Sync Planner
  useEffect(() => {
    const loadData = () => {
        const invStr = localStorage.getItem('sourdough_inventory');
        if (invStr) {
            try {
                setInventory(JSON.parse(invStr));
            } catch (e) {
                console.error("Error parsing inventory", e);
            }
        }

        // We need both recipes and planner items to sync them
        const recipesStr = localStorage.getItem('sourdough_recipes');
        const planStr = localStorage.getItem('sourdough_planner_items');
        
        let currentRecipes: SavedRecipe[] = [];
        let currentPlan: PlannerItem[] = [];

        if (recipesStr) {
            try {
                currentRecipes = JSON.parse(recipesStr);
            } catch (e) { console.error(e); }
        }

        if (planStr) {
             try {
                currentPlan = JSON.parse(planStr);
            } catch (e) { console.error(e); }
        }

        // SYNC LOGIC:
        // Filter out planner items where the recipe no longer exists in savedRecipes (Deleted)
        // Update planner items if the recipe version in storage is different (Reverted/Updated)
        const validPlannerItems: PlannerItem[] = [];
        let hasChanges = false;
        
        // Create a map for faster lookup
        const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));

        currentPlan.forEach(item => {
            const freshRecipe = recipeMap.get(item.recipe.id);
            
            if (!freshRecipe) {
                // Recipe was deleted from library, so we drop this planner item
                // This reduces the 'Allocated' amount in inventory
                hasChanges = true;
                return; 
            }

            if (freshRecipe.version !== item.recipe.version) {
                // Recipe was updated or reverted in library.
                // We must update the planner item to use the fresh ingredients/weights.
                validPlannerItems.push({
                    ...item,
                    recipe: freshRecipe
                });
                hasChanges = true;
            } else {
                // No changes, keep existing item
                validPlannerItems.push(item);
            }
        });

        setPlannerItems(validPlannerItems);

        // If we cleaned up the plan, persist it back to storage immediately
        // so other tabs/components see the correct allocation.
        if (hasChanges) {
            localStorage.setItem('sourdough_planner_items', JSON.stringify(validPlannerItems));
        }
    };

    loadData();
    
    // Listen for storage events (e.g. recipe deleted in another tab)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  useEffect(() => {
      if (inventory.length > 0) {
          localStorage.setItem('sourdough_inventory', JSON.stringify(inventory));
      }
  }, [inventory]);

  // Unit Conversion Helpers
  const convertToGrams = (weight: number, unit: UnitOfMeasure): number => {
      switch (unit) {
          case 'lb': return weight * 453.592;
          case 'oz': return weight * 28.3495;
          case 'kg': return weight * 1000;
          case 'g': return weight;
          default: return weight;
      }
  };

  // Calculated Preview
  const previewCalculation = useMemo(() => {
      const weight = parseFloat(packageWeight) || 0;
      const cost = parseFloat(costPerPackage) || 0;
      const count = parseFloat(itemsPerPackage) || 1;

      if (weight <= 0) return null;

      const singleItemGrams = convertToGrams(weight, packageUnit);
      const totalGrams = singleItemGrams * count;
      const costPerKg = totalGrams > 0 ? (cost / totalGrams) * 1000 : 0;

      return {
          totalWeightDisplay: totalGrams >= 1000 ? `${(totalGrams/1000).toFixed(2)} kg` : `${totalGrams.toFixed(0)} g`,
          totalGrams,
          costPerKg
      };
  }, [packageWeight, packageUnit, costPerPackage, itemsPerPackage]);


  const requirements = useMemo(() => {
    const reqs: Record<string, number> = {};
    plannerItems.forEach(item => {
        const { recipe, count } = item;
        const targetBatchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
        
        // --- NEW MULTI-FLOUR LOGIC for Requirements ---
        // We must correctly iterate through all flours + ingredients
        let flours = recipe.flours || [];
        if (flours.length === 0 && recipe.baseFlourName) {
            flours = [{ id: 1, name: recipe.baseFlourName, percentage: 100 }];
        }

        const totalFlourPct = flours.reduce((sum, f) => sum + (Number(f.percentage) || 0), 0);
        const totalIngPct = recipe.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0), 0);
        const totalFormulaPct = totalFlourPct + totalIngPct;

        // Total Flour Weight for this batch
        const totalFlourWeight = totalFormulaPct > 0 ? targetBatchWeight / (totalFormulaPct / 100) : 0;

        const processList = (list: any[]) => {
            list.forEach(ing => {
                if (!ing.name) return;
                const weight = (totalFlourWeight * (Number(ing.percentage) || 0)) / 100;
                const name = ing.name.trim();
                reqs[name] = (reqs[name] || 0) + weight;
            });
        };

        processList(flours);
        processList(recipe.ingredients);
    });
    return reqs;
  }, [plannerItems]);

  const addInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !previewCalculation) return;

      const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: newItemName.trim(),
          quantity: previewCalculation.totalGrams,
          costPerKg: previewCalculation.costPerKg,
          lastUpdated: new Date().toISOString(),
          
          // Save package details for future editing
          packageWeight: parseFloat(packageWeight),
          packageUnit,
          itemsPerPackage: parseFloat(itemsPerPackage),
          costPerPackage: parseFloat(costPerPackage)
      };

      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      localStorage.setItem('sourdough_inventory', JSON.stringify(updatedInventory));
      
      setNewItemName('');
      setPackageWeight('');
      setCostPerPackage('');
      setItemsPerPackage('1');
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Delete this inventory item?")) {
          const updated = inventory.filter(i => i.id !== id);
          setInventory(updated);
          localStorage.setItem('sourdough_inventory', JSON.stringify(updated));
      }
  };

  const tableRows = useMemo(() => {
      const rows: {
          id?: string;
          name: string;
          inStock: number;
          allocated: number;
          balance: number;
          cost?: number;
          packageDetails?: string;
      }[] = [];

      inventory.forEach(item => {
          const reqKey = Object.keys(requirements).find(k => k.toLowerCase() === item.name.toLowerCase());
          const allocated = reqKey ? (requirements[reqKey] as number) : 0;
          
          let pkgDetails = '';
          if (item.packageWeight) {
             pkgDetails = `${item.itemsPerPackage} x ${item.packageWeight}${item.packageUnit} @ $${item.costPerPackage}`;
          }

          rows.push({
              id: item.id,
              name: item.name,
              inStock: item.quantity,
              allocated: allocated,
              balance: item.quantity - allocated,
              cost: item.costPerKg,
              packageDetails: pkgDetails
          });
      });

      Object.entries(requirements).forEach(([reqName, value]) => {
          const reqAmount = value as number;
          const exists = rows.some(r => r.name.toLowerCase() === reqName.toLowerCase());
          if (!exists) {
              rows.push({
                  name: reqName,
                  inStock: 0,
                  allocated: reqAmount,
                  balance: -reqAmount,
                  cost: undefined
              });
          }
      });

      return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, requirements]);

  return (
    <div className="animate-fade-in">
       {/* DATALIST FOR AUTOCOMPLETE */}
       <datalist id="common-ingredients">
            {COMMON_INGREDIENTS_LIST.map((name, idx) => (
                <option key={idx} value={name} />
            ))}
       </datalist>

       <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-1">Inventory Management</h2>
            <p className="text-stone-600">Track stock with smart unit conversions.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center text-amber-800 text-sm">
            <CalculatorIcon className="w-5 h-5 mr-2" />
            <span>
                Allocated stock updates automatically from the <strong>Batch Planner</strong>.
            </span>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm mb-8">
          <h3 className="font-semibold text-stone-800 mb-4 border-b border-stone-100 pb-2">Receive New Stock</h3>
          <form onSubmit={addInventoryItem}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-stone-500 mb-1">Ingredient Name</label>
                      <input
                        type="text"
                        list="common-ingredients" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="e.g., King Arthur Bread Flour"
                        className="block w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                  </div>
                  
                  <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Weight / Package</label>
                      <div className="flex">
                        <input
                            type="number"
                            step="0.01"
                            value={packageWeight}
                            onChange={(e) => setPackageWeight(e.target.value)}
                            placeholder="5"
                            className="block w-full px-3 py-2 bg-stone-50 border border-r-0 border-stone-300 rounded-l-md focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        />
                        <select
                            value={packageUnit}
                            onChange={(e) => setPackageUnit(e.target.value as UnitOfMeasure)}
                            className="inline-flex items-center px-2 py-2 border border-l-0 border-stone-300 bg-stone-100 text-stone-600 sm:text-sm rounded-r-md focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="lb">lb</option>
                            <option value="oz">oz</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                        </select>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Cost / Package</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-stone-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={costPerPackage}
                            onChange={(e) => setCostPerPackage(e.target.value)}
                            placeholder="0.00"
                            className="block w-full pl-7 px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        />
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1">Items / Package</label>
                      <input
                        type="number"
                        step="1"
                        value={itemsPerPackage}
                        onChange={(e) => setItemsPerPackage(e.target.value)}
                        placeholder="1"
                        className="block w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                      <span className="text-[10px] text-stone-400">e.g., Case of 12</span>
                  </div>
              </div>

              <div className="flex items-center justify-between bg-stone-50 p-3 rounded-md border border-stone-200">
                  <div className="flex gap-6 text-sm">
                      <div>
                          <span className="text-stone-500 block text-xs">Total Weight</span>
                          <span className="font-semibold text-stone-800">{previewCalculation ? previewCalculation.totalWeightDisplay : '-'}</span>
                      </div>
                      <div>
                           <span className="text-stone-500 block text-xs">Calculated Cost</span>
                           <span className="font-semibold text-stone-800">{previewCalculation ? `$${previewCalculation.costPerKg.toFixed(2)} / kg` : '-'}</span>
                      </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newItemName || !previewCalculation}
                    className="px-6 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-900 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                      Add to Inventory
                  </button>
              </div>
          </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Last Purchase</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">In Stock</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider text-amber-600">Allocated</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                    {tableRows.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-stone-500">
                                Inventory empty. Add items above.
                            </td>
                        </tr>
                    ) : (
                        tableRows.map((row, idx) => (
                            <tr key={row.id || `missing-${idx}`} className="hover:bg-stone-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-stone-900">{row.name}</div>
                                    {!row.id && <span className="text-xs text-red-500 bg-red-50 px-1.5 rounded">Not tracked</span>}
                                </td>
                                <td className="px-6 py-4 text-xs text-stone-500">
                                    {row.packageDetails || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600">
                                    {row.id ? (row.inStock / 1000).toFixed(2) : '-'} kg
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-amber-700 font-medium text-sm">
                                    {row.allocated > 0 ? (row.allocated / 1000).toFixed(2) : '-'} kg
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${row.balance < 0 ? 'text-red-600' : 'text-stone-700'}`}>
                                    {(row.balance / 1000).toFixed(2)} kg
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600">
                                   {row.cost ? `$${row.cost.toFixed(2)}/kg` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {row.id && (
                                        <button onClick={() => deleteItem(row.id!)} className="text-stone-400 hover:text-red-600 transition-colors">
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
