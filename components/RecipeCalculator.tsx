
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ingredient, RecipeSnapshot, SavedRecipe, InventoryItem } from '../types';
import RecipeCost from './RecipeCost';
import { SparklesIcon } from './icons/SparklesIcon';
import { BoxIcon } from './icons/BoxIcon';
import Spinner from './Spinner';
import { getRecipeSuggestions } from '../services/geminiService';

// EXPANDED COMMON INGREDIENTS LISTS
export const COMMON_FLOURS = [
  'Bread Flour', 'Strong White Flour', 'All-Purpose Flour', 'Whole Wheat Flour', 
  'Whole Grain Flour', 'High Gluten Flour', 'Pastry Flour', 'Cake Flour',
  'Rye Flour', 'Whole Rye Flour', 'Medium Rye', 'Dark Rye', 'Pumpernickel',
  'Spelt Flour', 'White Spelt', 'Semolina', 'Durum Flour', 
  'Einkorn', 'Emmer', 'Kamut (Khorasan)', 'Barley Flour', 'Buckwheat Flour',
  'Type 00', 'Type 0', 'Type 1', 'Type 2', 'Integrale', // Italian
  'T45', 'T55', 'T65', 'T80', 'T110', 'T150', 'T170', // French
  'Manitoba', 'Rice Flour', 'Cornmeal'
];

export const COMMON_ADDINS = [
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

type RoundingMode = 'exact' | '1g' | '5g';

// Initial defaults
const initialFlours: Ingredient[] = [
    { id: 1, name: 'Bread Flour', percentage: 100 }
];

const initialIngredients: Ingredient[] = [
  { id: 101, name: 'Water', percentage: 75 },
  { id: 102, name: 'Levain', percentage: 20 },
  { id: 103, name: 'Salt', percentage: 2 },
];

interface RecipeCalculatorProps {
    initialRecipe?: SavedRecipe | null;
    onBack: () => void;
}

const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ initialRecipe, onBack }) => {
  // --- STATE ---
  
  // Batch Config
  const [numberOfLoaves, setNumberOfLoaves] = useState<number>(2);
  const [weightPerLoaf, setWeightPerLoaf] = useState<number>(900);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('exact');

  // Recipe Composition
  const [flours, setFlours] = useState<Ingredient[]>(initialFlours);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  
  // Saving/Loading State
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [recipeName, setRecipeName] = useState<string>('');
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // AI Suggestion State
  const [aiGoal, setAiGoal] = useState<string>('');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // --- INITIALIZATION ---

  useEffect(() => {
      if (initialRecipe) {
          setCurrentRecipeId(initialRecipe.id);
          setRecipeName(initialRecipe.name);
          setCurrentVersion(initialRecipe.version);
          setNumberOfLoaves(initialRecipe.numberOfLoaves);
          setWeightPerLoaf(initialRecipe.weightPerLoaf);
          
          // MIGRATION LOGIC: Check if it's an old recipe (no 'flours' array)
          if (initialRecipe.flours && initialRecipe.flours.length > 0) {
              setFlours(initialRecipe.flours);
          } else {
              // Convert legacy single-base flour to array
              setFlours([{
                  id: 1, 
                  name: initialRecipe.baseFlourName || 'Bread Flour', 
                  percentage: 100, 
                  inventoryId: initialRecipe.baseFlourInventoryId,
                  costPerKg: initialRecipe.baseFlourCostPerKg
              }]);
          }
          setIngredients(initialRecipe.ingredients);
      } else {
          // Reset
          setCurrentRecipeId(null);
          setRecipeName('');
          setCurrentVersion(1);
          setNumberOfLoaves(2);
          setWeightPerLoaf(900);
          setFlours(initialFlours.map(f => ({...f})));
          setIngredients(initialIngredients.map(i => ({...i})));
      }
  }, [initialRecipe]);

  // Load Inventory & Saved Recipes
  useEffect(() => {
    const saved = localStorage.getItem('sourdough_recipes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedRecipes(parsed);
      } catch (e) { console.error(e); }
    }
    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) {
        try {
            setInventory(JSON.parse(invStr));
        } catch (e) { console.error(e); }
    }
  }, []);
  
  // Auto-Link Ingredients to Inventory on Load/Change
  useEffect(() => {
      // Helper to link list items
      const linkItems = (items: Ingredient[]) => {
          return items.map(item => {
              // Only link if not already linked to avoid overwriting specific user intent,
              // unless the name matches perfectly and ID is missing.
              if (!item.inventoryId) {
                  const match = inventory.find(inv => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                  if (match) {
                      return { ...item, inventoryId: match.id };
                  }
              }
              return item;
          });
      };

      // We only run this on inventory load to establish connections, 
      // or we could run it when ingredient names change (handled in updateItem).
      // Here we just ensure initial connectivity if inventory loaded late.
  }, [inventory]);

  // --- CALCULATION LOGIC ---

  // 1. Calculate Target Dough Weight
  const totalTargetWeight = numberOfLoaves * weightPerLoaf;

  // 2. Calculate Total Percentage Sum (Flours should sum to ~100%, Ingredients add on top)
  // Note: We don't force flours to 100% in the math, but the UI implies it. 
  // Baker's Math: Total % = Sum(Flour %) + Sum(Ing %)
  // Usually Sum(Flour %) is exactly 100.
  const totalFlourPercentage = flours.reduce((sum, f) => sum + (f.percentage || 0), 0);
  const totalIngredientPercentage = ingredients.reduce((sum, i) => sum + (i.percentage || 0), 0);
  const totalFormulaPercentage = totalFlourPercentage + totalIngredientPercentage;

  // 3. Calculate Required Total Flour Weight (The "100%" mass)
  // Total Dough = Total Flour * (Total Formula % / 100)
  // Therefore: Total Flour = Total Dough / (Total Formula % / 100)
  const totalFlourWeight = totalFormulaPercentage > 0 
      ? totalTargetWeight / (totalFormulaPercentage / 100) 
      : 0;

  // Helper for Display Rounding
  const getDisplayWeight = useCallback((weight: number): string => {
      if (roundingMode === '1g') return Math.round(weight).toFixed(0);
      if (roundingMode === '5g') return (Math.round(weight / 5) * 5).toFixed(0);
      return weight.toFixed(1);
  }, [roundingMode]);

  // --- HANDLERS ---

  // Scaling Handlers
  const handleNumberOfLoavesChange = (val: string) => {
      const n = parseFloat(val);
      setNumberOfLoaves(isNaN(n) || n < 0 ? 0 : n);
  };
  const handleWeightPerLoafChange = (val: string) => {
      const n = parseFloat(val);
      setWeightPerLoaf(isNaN(n) || n < 0 ? 0 : n);
  };
  const handleTotalWeightChange = (val: string) => {
      const target = parseFloat(val);
      if (!isNaN(target) && target >= 0 && weightPerLoaf > 0) {
          setNumberOfLoaves(target / weightPerLoaf);
      } else if (val === '') {
          setNumberOfLoaves(0);
      }
  };

  // Ingredient Handlers (Flours & Add-ins)
  // type: 'flour' | 'ingredient'
  const updateItem = (type: 'flour' | 'ingredient', id: number, field: keyof Ingredient, value: any) => {
      const setter = type === 'flour' ? setFlours : setIngredients;
      const list = type === 'flour' ? flours : ingredients;
      
      setter(list.map(item => {
          if (item.id === id) {
              // Special logic for name change to check inventory
              if (field === 'name') {
                   const match = findInventoryMatch(value);
                   return { ...item, name: value, inventoryId: match?.id };
              }
              return { ...item, [field]: value };
          }
          return item;
      }));
  };

  const updatePercentage = (type: 'flour' | 'ingredient', id: number, valStr: string) => {
      const val = parseFloat(valStr);
      updateItem(type, id, 'percentage', isNaN(val) ? 0 : val);
  };

  const updateCost = (type: 'flour' | 'ingredient', id: number, valStr: string) => {
      const val = parseFloat(valStr);
      updateItem(type, id, 'costPerKg', isNaN(val) ? undefined : val);
  };

  // REVERSE CALCULATION: Weight -> Percentage
  const handleWeightOverride = (type: 'flour' | 'ingredient', id: number, valStr: string) => {
      const targetWeight = parseFloat(valStr);
      if (isNaN(targetWeight) || targetWeight < 0) return;

      // Current state
      const currentFlours = [...flours];
      const currentIngs = [...ingredients];

      // To change one item's weight while keeping Total Dough Weight constant,
      // we essentially have to change its percentage.
      // New % = (Target Weight / Total Flour Weight) * 100
      
      // However, changing a FLOUR's weight changes the Total Flour Weight reference if we aren't careful.
      // Strategy: 
      // 1. Calculate the implied Total Flour Weight if this item were X grams.
      // This is tricky because Total Flour Weight depends on the sum of Percentages.
      
      // Simpler Strategy:
      // Assume Total Flour Weight (Calculated from Batch Specs) is the source of truth for the DENOMINATOR.
      // We just update the percentage to match the target weight relative to the CURRENT Total Flour Weight.
      // This might slightly shift the total batch weight if the user isn't careful, but it's the most intuitive for "tweaking".
      
      if (totalFlourWeight <= 0) return;
      
      const newPct = (targetWeight / totalFlourWeight) * 100;
      updateItem(type, id, 'percentage', parseFloat(newPct.toFixed(2))); // limit precision to avoid infinite floats
  };

  const addItem = (type: 'flour' | 'ingredient') => {
      const list = type === 'flour' ? flours : ingredients;
      const setter = type === 'flour' ? setFlours : setIngredients;
      const maxId = Math.max(...flours.map(i=>i.id), ...ingredients.map(i=>i.id), 0);
      setter([...list, { id: maxId + 1, name: '', percentage: 0 }]);
  };

  const removeItem = (type: 'flour' | 'ingredient', id: number) => {
      const list = type === 'flour' ? flours : ingredients;
      const setter = type === 'flour' ? setFlours : setIngredients;
      setter(list.filter(i => i.id !== id));
  };

  // --- HELPERS ---
  
  const findInventoryMatch = (name: string) => {
      if (!name) return undefined;
      return inventory.find(item => item.name.toLowerCase().trim() === name.toLowerCase().trim());
  };

  // Filter Common lists based on inventory
  // If an item exists in inventory, we want it in the Inventory group, not the Common group to avoid duplicates in UI
  const filteredCommonFlours = useMemo(() => COMMON_FLOURS.filter(c => !inventory.some(i => i.name.toLowerCase() === c.toLowerCase())), [inventory]);
  const filteredCommonAddins = useMemo(() => COMMON_ADDINS.filter(c => !inventory.some(i => i.name.toLowerCase() === c.toLowerCase())), [inventory]);

  // AI & Saving (Similar to previous implementation, adapted for new structure)
  const handleGetSuggestion = async () => {
    if (!aiGoal.trim()) return;
    setIsAiLoading(true);
    setAiSuggestion('');

    const context = `
    Flour Blend:
    ${flours.map(f => `- ${f.name}: ${f.percentage}%`).join('\n')}
    
    Add-ins:
    ${ingredients.map(i => `- ${i.name}: ${i.percentage}%`).join('\n')}
    
    Total Hydration: ${ingredients.find(i => i.name.toLowerCase().includes('water'))?.percentage || '?'}%
    `;

    const result = await getRecipeSuggestions(context, aiGoal);
    setAiSuggestion(result);
    setIsAiLoading(false);
  };

  const handleSaveRecipe = (asNew: boolean = false) => {
      if (!recipeName.trim()) { alert('Please enter a name'); return; }

      // Snapshot
      const snapshot: RecipeSnapshot = {
          numberOfLoaves,
          weightPerLoaf,
          flours,
          ingredients,
          date: new Date().toLocaleDateString(),
          version: asNew || !currentRecipeId ? 1 : currentVersion + 1,
          // Legacy support (optional, can leave empty)
          baseFlourName: flours[0]?.name,
      };

      let newHistory: RecipeSnapshot[] = [];
      let newId = currentRecipeId;
      
      if (currentRecipeId && !asNew) {
          // Updating
          const existing = savedRecipes.find(r => r.id === currentRecipeId);
          if (existing) {
             newHistory = [
                 { ...existing, flours: existing.flours || [], ingredients: existing.ingredients }, // ensure structure
                 ...existing.history
             ];
          }
      } else {
          // New
          newId = Date.now().toString();
      }

      const finalRecipe: SavedRecipe = {
          id: newId!,
          name: asNew ? `${recipeName} (Copy)` : recipeName,
          ...snapshot,
          history: newHistory
      };

      let updatedList = savedRecipes;
      if (currentRecipeId && !asNew) {
          updatedList = savedRecipes.map(r => r.id === currentRecipeId ? finalRecipe : r);
          alert(`Updated to v${finalRecipe.version}`);
      } else {
          updatedList = [...savedRecipes, finalRecipe];
          alert('Recipe saved!');
      }

      setSavedRecipes(updatedList);
      localStorage.setItem('sourdough_recipes', JSON.stringify(updatedList));
      setCurrentRecipeId(finalRecipe.id);
      setCurrentVersion(finalRecipe.version);
      if (asNew) setRecipeName(finalRecipe.name);
  };

  const handleLoadVersion = (snap: RecipeSnapshot) => {
       if (confirm('Revert? Unsaved changes lost.')) {
           setNumberOfLoaves(snap.numberOfLoaves);
           setWeightPerLoaf(snap.weightPerLoaf);
           setFlours(snap.flours || []); // Handle legacy where flours might be undefined
           setIngredients(snap.ingredients);
           setCurrentVersion(snap.version);
       }
  };

  // --- RENDER HELPERS ---

  const renderRow = (item: Ingredient, type: 'flour' | 'ingredient') => {
      const weight = (totalFlourWeight * item.percentage) / 100;
      const isLinked = !!item.inventoryId || !!findInventoryMatch(item.name);
      
      return (
        <tr key={item.id} className="group hover:bg-stone-50 transition-colors">
            {/* NAME INPUT */}
            <td className="px-4 py-2">
                <div className="flex gap-2 items-center">
                    <select
                        className="block w-1/3 border-stone-200 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-xs py-1.5"
                        value={findInventoryMatch(item.name) ? item.name : ((type === 'flour' ? COMMON_FLOURS : COMMON_ADDINS).includes(item.name) ? item.name : "")}
                        onChange={(e) => e.target.value && updateItem(type, item.id, 'name', e.target.value)}
                    >
                        <option value="">Select...</option>
                        {inventory.length > 0 && (
                            <optgroup label="Inventory">
                                {inventory.map(inv => <option key={inv.id} value={inv.name}>{inv.name}</option>)}
                            </optgroup>
                        )}
                        <optgroup label="Common">
                            {(type === 'flour' ? filteredCommonFlours : filteredCommonAddins).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </optgroup>
                    </select>
                    <div className="relative w-2/3">
                        <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(type, item.id, 'name', e.target.value)}
                            className={`block w-full border-stone-200 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm py-1.5 ${isLinked ? 'pr-7' : ''}`}
                            placeholder={type === 'flour' ? "Flour Type" : "Ingredient"}
                        />
                        {isLinked && (
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                <BoxIcon className="w-3.5 h-3.5 text-amber-600" title="Linked to Inventory" />
                            </div>
                        )}
                    </div>
                </div>
            </td>
            {/* PERCENTAGE INPUT */}
            <td className="px-4 py-2">
                <div className="relative rounded-md shadow-sm w-20 ml-auto">
                    <input
                        type="number"
                        step="0.1"
                        value={item.percentage}
                        onChange={(e) => updatePercentage(type, item.id, e.target.value)}
                        className="block w-full text-right border-stone-200 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm py-1.5 pr-6"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-stone-400 text-xs">%</div>
                </div>
            </td>
            {/* WEIGHT INPUT (Calculated / Override) */}
            <td className="px-4 py-2">
                <div className="relative rounded-md shadow-sm w-24 ml-auto">
                    <input
                        type="number"
                        value={getDisplayWeight(weight)}
                        onChange={(e) => handleWeightOverride(type, item.id, e.target.value)}
                        className="block w-full text-right border-stone-200 rounded-md focus:ring-amber-500 focus:border-amber-500 text-sm py-1.5 pr-6 font-medium text-stone-700"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-stone-400 text-xs">g</div>
                </div>
            </td>
            {/* DELETE */}
            <td className="px-4 py-2 text-right">
                <button 
                    onClick={() => removeItem(type, item.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors p-1"
                >
                    &times;
                </button>
            </td>
        </tr>
      );
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* --- HEADER & CONFIG --- */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-800 text-sm font-medium flex items-center gap-1">
            &larr; Back
        </button>
        <div className="flex gap-2">
             <button onClick={() => setExpandedRecipeId(expandedRecipeId ? null : 'open')} className="text-amber-600 text-xs font-medium">
                 {currentRecipeId ? `v${currentVersion}` : 'Draft'} History
             </button>
        </div>
      </div>

       {/* Inline History Drawer */}
       {expandedRecipeId && currentRecipeId && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-6 animate-fade-in">
                <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Version History</p>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {savedRecipes.find(r => r.id === currentRecipeId)?.history.map((snap, idx) => (
                        <li key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-stone-200 shadow-sm">
                            <span>v{snap.version} • {snap.date}</span>
                            <button onClick={() => handleLoadVersion(snap)} className="text-amber-600 hover:underline">Restore</button>
                        </li>
                    ))}
                </ul>
            </div>
        )}

      {/* BATCH CONFIG PANEL */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Loaves</label>
              <input 
                 type="number" step="1" 
                 value={numberOfLoaves} onChange={e => handleNumberOfLoavesChange(e.target.value)}
                 className="w-full text-lg font-medium border-stone-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
          </div>
          <div className="md:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Weight / Loaf</label>
              <div className="relative">
                <input 
                    type="number" step="10" 
                    value={weightPerLoaf} onChange={e => handleWeightPerLoafChange(e.target.value)}
                    className="w-full text-lg font-medium border-stone-300 rounded-md focus:ring-amber-500 focus:border-amber-500 pr-8"
                />
                <span className="absolute right-3 top-3 text-stone-400 text-sm">g</span>
              </div>
          </div>
          <div className="md:col-span-1">
              <label className="block text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Total Batch</label>
              <div className="relative">
                <input 
                    type="number" step="10" 
                    value={Math.round(totalTargetWeight)} onChange={e => handleTotalWeightChange(e.target.value)}
                    className="w-full text-lg font-bold text-amber-800 bg-amber-50 border-amber-200 rounded-md focus:ring-amber-500 focus:border-amber-500 pr-8"
                />
                <span className="absolute right-3 top-3 text-amber-400 text-sm">g</span>
              </div>
          </div>
          <div className="md:col-span-1 flex justify-end">
              <select 
                  value={roundingMode} onChange={e => setRoundingMode(e.target.value as any)}
                  className="text-xs border-stone-200 rounded-md text-stone-500"
              >
                  <option value="exact">Exact Weights</option>
                  <option value="1g">Round to 1g</option>
                  <option value="5g">Round to 5g</option>
              </select>
          </div>
      </div>

      {/* --- FORMULA EDITOR --- */}
      
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-8">
          {/* FLOUR SECTION */}
          <div className="border-b border-stone-100">
              <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wide">Flour Blend (100%)</h3>
                  <div className={`text-sm font-bold ${Math.abs(totalFlourPercentage - 100) > 0.1 ? 'text-amber-600' : 'text-green-600'}`}>
                      {totalFlourPercentage.toFixed(1)}% Total
                  </div>
              </div>
              <table className="min-w-full divide-y divide-stone-100">
                  <thead className="bg-white">
                      <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-stone-400 uppercase w-1/2">Flour Type</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-stone-400 uppercase">Percent</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-stone-400 uppercase">Weight</th>
                          <th className="w-10"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                      {flours.map(f => renderRow(f, 'flour'))}
                      <tr>
                          <td colSpan={4} className="px-4 py-2">
                              <button onClick={() => addItem('flour')} className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">
                                  + Add Flour
                              </button>
                          </td>
                      </tr>
                      {/* Subtotal Row for Flours */}
                      <tr className="bg-stone-50 font-medium text-stone-600 border-t border-stone-200">
                           <td className="px-4 py-2 text-sm text-right">Total Flour Base:</td>
                           <td className="px-4 py-2 text-right text-xs">{totalFlourPercentage.toFixed(1)}%</td>
                           <td className="px-4 py-2 text-right text-sm">{getDisplayWeight(totalFlourWeight)} g</td>
                           <td></td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* INGREDIENTS SECTION */}
          <div>
              <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 border-t border-stone-100 flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wide">Add-ins & Hydration</h3>
                  <span className="text-xs text-stone-400">Values relative to Total Flour Weight</span>
              </div>
              <table className="min-w-full divide-y divide-stone-100">
                  <tbody className="divide-y divide-stone-50">
                      {ingredients.map(i => renderRow(i, 'ingredient'))}
                      <tr>
                          <td colSpan={4} className="px-4 py-2">
                              <button onClick={() => addItem('ingredient')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                  + Add Ingredient
                              </button>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- AI & COST --- */}
      
      {/* AI Assistant */}
      <div className="bg-gradient-to-r from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 mb-8">
          <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="w-5 h-5 text-indigo-500" />
              <h4 className="font-bold text-indigo-900 text-sm">AI Baker's Assistant</h4>
          </div>
          <div className="flex gap-2">
              <input 
                type="text" 
                value={aiGoal} onChange={e => setAiGoal(e.target.value)}
                placeholder="e.g. Add 20% Spelt without losing structure..." 
                className="flex-grow text-sm border-indigo-200 rounded-md focus:ring-indigo-500"
              />
              <button 
                onClick={handleGetSuggestion} disabled={isAiLoading || !aiGoal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                  {isAiLoading ? <Spinner /> : 'Ask AI'}
              </button>
          </div>
          {aiSuggestion && (
              <div className="mt-4 text-sm text-indigo-800 bg-white p-4 rounded border border-indigo-100 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: aiSuggestion.replace(/\n/g, '<br/>') }} />
          )}
      </div>

      {/* Cost Component - Adapting to new multi-flour structure */}
      <RecipeCost
          ingredients={[...flours, ...ingredients]} // Pass flattened list
          totalFlour={totalFlourWeight}
          numberOfLoaves={numberOfLoaves}
          baseFlourName={flours[0]?.name || "Base Flour"} // For legacy prop support inside component if needed
          baseFlourCost={""} // handled inside item list now
          onUpdateBaseFlourCost={() => {}} // handled via item update
          onUpdateIngredientCost={(id, val) => {
              // Determine if id belongs to flour or ingredient
              if (flours.some(f => f.id === id)) updateCost('flour', id, val);
              else updateCost('ingredient', id, val);
          }}
          inventory={inventory}
      />

      {/* --- SAVING --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-lg z-10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="w-full sm:w-auto flex-grow max-w-md">
                  <input 
                      type="text" 
                      value={recipeName} onChange={e => setRecipeName(e.target.value)}
                      placeholder="Recipe Name"
                      className="w-full border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                  />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  {currentRecipeId && (
                      <button onClick={() => handleSaveRecipe(true)} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-md font-medium text-sm hover:bg-stone-50">
                          Save Copy
                      </button>
                  )}
                  <button onClick={() => handleSaveRecipe(false)} className="flex-1 sm:flex-none px-6 py-2 bg-amber-600 text-white rounded-md font-medium text-sm hover:bg-amber-700 shadow-sm">
                      {currentRecipeId ? 'Update Recipe' : 'Save New Recipe'}
                  </button>
              </div>
          </div>
      </div>

    </div>
  );
};

export default RecipeCalculator;
