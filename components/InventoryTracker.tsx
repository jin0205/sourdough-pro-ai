
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';

const InventoryTracker: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>([]);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemCost, setNewItemCost] = useState('');

  // Load Data
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

        const planStr = localStorage.getItem('sourdough_planner_items');
        if (planStr) {
            try {
                setPlannerItems(JSON.parse(planStr));
            } catch (e) {
                console.error("Error parsing plan", e);
            }
        }
    };

    loadData();
    
    // Add event listener to handle updates from other tabs if they modify local storage (optional robustness)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Save Inventory Effect
  useEffect(() => {
      if (inventory.length > 0) { // Avoid overwriting on initial empty load if check fails
          localStorage.setItem('sourdough_inventory', JSON.stringify(inventory));
      }
  }, [inventory]);

  // Calculate Requirements from Planner
  // This logic mirrors BatchPlanner to ensure we know exactly what is needed
  const requirements = useMemo(() => {
    const reqs: Record<string, number> = {};

    plannerItems.forEach(item => {
        const { recipe, count } = item;
        const targetBatchWeight = (Number(count) || 0) * (Number(recipe.weightPerLoaf) || 0);
        const totalPercentage = 1 + recipe.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0) / 100, 0);
        const flourWeight = totalPercentage > 0 ? targetBatchWeight / totalPercentage : 0;

        // Base Flour
        // Note: In the calculator, "Base Flour" is implicit. 
        // We track it as "Base Flour" here. Users should name an inventory item "Base Flour" 
        // or the specific flour type if they name their base flour in the recipe.
        const baseName = "Base Flour";
        reqs[baseName] = (reqs[baseName] || 0) + flourWeight;

        // Other Ingredients
        recipe.ingredients.forEach(ing => {
            if (!ing.name) return;
            const weight = (flourWeight * (Number(ing.percentage) || 0)) / 100;
            const name = ing.name.trim();
            reqs[name] = (reqs[name] || 0) + weight;
        });
    });
    return reqs;
  }, [plannerItems]);

  const addInventoryItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim()) return;

      const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: newItemName.trim(),
          quantity: parseFloat(newItemQuantity) * 1000 || 0, // Convert kg input to g
          costPerKg: parseFloat(newItemCost) || 0,
          lastUpdated: new Date().toISOString()
      };

      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      localStorage.setItem('sourdough_inventory', JSON.stringify(updatedInventory));
      
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemCost('');
  };

  const updateStock = (id: string, newQuantityKg: number) => {
      setInventory(inventory.map(item => 
          item.id === id 
            ? { ...item, quantity: newQuantityKg * 1000, lastUpdated: new Date().toISOString() }
            : item
      ));
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Delete this inventory item?")) {
          const updated = inventory.filter(i => i.id !== id);
          setInventory(updated);
          localStorage.setItem('sourdough_inventory', JSON.stringify(updated));
      }
  };

  // Merge Inventory with Requirements for display
  // We also want to show requirements for items that might NOT be in inventory yet
  const tableRows = useMemo(() => {
      const rows: {
          id?: string;
          name: string;
          inStock: number;
          allocated: number;
          balance: number;
          cost?: number;
      }[] = [];

      // 1. Process existing inventory
      inventory.forEach(item => {
          // Case-insensitive matching
          const reqKey = Object.keys(requirements).find(k => k.toLowerCase() === item.name.toLowerCase());
          const allocated = reqKey ? (requirements[reqKey] as number) : 0;
          
          rows.push({
              id: item.id,
              name: item.name,
              inStock: item.quantity,
              allocated: allocated,
              balance: item.quantity - allocated,
              cost: item.costPerKg
          });
      });

      // 2. Process requirements that don't exist in inventory
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
       <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-1">Inventory & Stock</h2>
            <p className="text-stone-600">Track ingredients and see real-time demand from the Batch Planner.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center text-amber-800 text-sm">
            <CalculatorIcon className="w-5 h-5 mr-2" />
            <span>
                Allocated stock updates automatically when you modify the <strong>Batch Planner</strong>.
            </span>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm mb-8">
          <h3 className="font-semibold text-stone-800 mb-3">Add New Ingredient</h3>
          <form onSubmit={addInventoryItem} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-grow w-full">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Ingredient Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Bread Flour"
                    className="block w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  />
              </div>
              <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Stock (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="0"
                    className="block w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  />
              </div>
               <div className="w-full md:w-32">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Cost ($/kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    placeholder="0.00"
                    className="block w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  />
              </div>
              <button
                type="submit"
                disabled={!newItemName}
                className="w-full md:w-auto px-4 py-2 bg-stone-800 text-white rounded-md hover:bg-stone-900 disabled:bg-stone-400 transition-colors font-medium text-sm h-[38px]"
              >
                  Add Item
              </button>
          </form>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ingredient</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">In Stock</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider text-amber-600">Allocated</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                    {tableRows.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-stone-500">
                                No inventory items tracked yet. Add items above or create a plan to see missing ingredients.
                            </td>
                        </tr>
                    ) : (
                        tableRows.map((row, idx) => (
                            <tr key={row.id || `missing-${idx}`} className="hover:bg-stone-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-stone-900">{row.name}</div>
                                    {!row.id && <span className="text-xs text-red-500 bg-red-50 px-1.5 rounded">Not tracked</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    {row.id ? (
                                        <div className="flex justify-end items-center">
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                className="w-20 text-right text-sm border-stone-200 focus:ring-amber-500 focus:border-amber-500 rounded-md py-1 px-2"
                                                defaultValue={(row.inStock / 1000).toFixed(2)}
                                                onBlur={(e) => updateStock(row.id!, parseFloat(e.target.value))}
                                            />
                                            <span className="ml-1 text-stone-500 text-xs">kg</span>
                                        </div>
                                    ) : (
                                        <span className="text-stone-400 text-sm">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-amber-700 font-medium text-sm">
                                    {row.allocated > 0 ? (row.allocated / 1000).toFixed(2) + ' kg' : '-'}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${row.balance < 0 ? 'text-red-600' : 'text-stone-700'}`}>
                                    {(row.balance / 1000).toFixed(2)} kg
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    {row.balance < 0 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Restock Needed
                                        </span>
                                    ) : row.balance < 1000 && row.id ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            Low Stock
                                        </span>
                                    ) : row.id ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            OK
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                                            Untracked
                                        </span>
                                    )}
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

export default InventoryTracker;
    