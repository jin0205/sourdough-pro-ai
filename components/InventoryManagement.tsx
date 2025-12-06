
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, PlannerItem, UnitOfMeasure } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { storageService } from '../services/storageService';
import { convertToGrams } from '../utils/conversions';

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
        setInventory(storageService.getInventory());
        // syncPlannerItems handles the logic of removing invalid items and updating versions
        setPlannerItems(storageService.syncPlannerItems());
    };

    loadData();
    
    // Listen for storage events (e.g. recipe deleted in another tab)
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

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
        const totalPercentage = 1 + recipe.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0) / 100, 0);
        const flourWeight = totalPercentage > 0 ? targetBatchWeight / totalPercentage : 0;

        const baseName = recipe.baseFlourName || "Base Flour";
        reqs[baseName] = (reqs[baseName] || 0) + flourWeight;

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
      storageService.saveInventory(updatedInventory);
      
      setNewItemName('');
      setPackageWeight('');
      setCostPerPackage('');
      setItemsPerPackage('1');
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Delete this inventory item?")) {
          const updated = inventory.filter(i => i.id !== id);
          setInventory(updated);
          storageService.saveInventory(updated);
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
