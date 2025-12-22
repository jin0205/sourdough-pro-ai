
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
  'Water', 'Levain', 'Stiff Levain', 'Poolish', 'Biga', 'Milk', 'Buttermilk', 'Beer', 'Coffee',
  'Salt', 'Sea Salt', 'Kosher Salt', 'Instant Yeast', 'Active Dry Yeast', 'Fresh Yeast',
  'Olive Oil', 'Butter', 'Lard', 'Vegetable Oil', 'Coconut Oil',
  'Sugar', 'Brown Sugar', 'Honey', 'Molasses', 'Maple Syrup', 'Malt Syrup', 'Diastatic Malt Powder', 'Non-Diastatic Malt',
  'Raisins', 'Cranberries', 'Walnuts', 'Pecans', 'Sunflower Seeds', 'Sesame Seeds', 'Pumpkin Seeds', 
  'Flax Seeds', 'Chia Seeds', 'Poppy Seeds', 'Oats', 'Rolled Oats',
  'Chocolate Chips', 'Cocoa Powder', 'Cinnamon', 'Cardamom', 'Cheese', 'Olives', 'Garlic'
];

type RoundingMode = 'exact' | '1g' | '5g';

const initialFlours: Ingredient[] = [{ id: 1, name: 'Bread Flour', percentage: 100 }];
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
  const [numberOfLoaves, setNumberOfLoaves] = useState<number>(2);
  const [weightPerLoaf, setWeightPerLoaf] = useState<number>(900);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('exact');
  const [flours, setFlours] = useState<Ingredient[]>(initialFlours);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [recipeName, setRecipeName] = useState<string>('');
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [aiGoal, setAiGoal] = useState<string>('');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
      if (initialRecipe) {
          setCurrentRecipeId(initialRecipe.id);
          setRecipeName(initialRecipe.name);
          setCurrentVersion(initialRecipe.version);
          setNumberOfLoaves(initialRecipe.numberOfLoaves);
          setWeightPerLoaf(initialRecipe.weightPerLoaf);
          if (initialRecipe.flours && initialRecipe.flours.length > 0) setFlours(initialRecipe.flours);
          else setFlours([{ id: 1, name: initialRecipe.baseFlourName || 'Bread Flour', percentage: 100 }]);
          setIngredients(initialRecipe.ingredients);
      }
  }, [initialRecipe]);

  useEffect(() => {
    const saved = localStorage.getItem('sourdough_recipes');
    if (saved) try { setSavedRecipes(JSON.parse(saved)); } catch (e) {}
    const invStr = localStorage.getItem('sourdough_inventory');
    if (invStr) try { setInventory(JSON.parse(invStr)); } catch (e) {}
  }, []);

  const totalTargetWeight = numberOfLoaves * weightPerLoaf;
  const totalFlourPercentage = flours.reduce((sum, f) => sum + (f.percentage || 0), 0);
  const totalIngredientPercentage = ingredients.reduce((sum, i) => sum + (i.percentage || 0), 0);
  const totalFormulaPercentage = totalFlourPercentage + totalIngredientPercentage;
  const totalFlourWeight = totalFormulaPercentage > 0 ? totalTargetWeight / (totalFormulaPercentage / 100) : 0;

  const getDisplayWeight = useCallback((weight: number): string => {
      if (roundingMode === '1g') return Math.round(weight).toFixed(0);
      if (roundingMode === '5g') return (Math.round(weight / 5) * 5).toFixed(0);
      return weight.toFixed(1);
  }, [roundingMode]);

  const updateItem = (type: 'flour' | 'ingredient', id: number, field: keyof Ingredient, value: any) => {
      const setter = type === 'flour' ? setFlours : setIngredients;
      const list = type === 'flour' ? flours : ingredients;
      setter(list.map(item => {
          if (item.id === id) {
              if (field === 'name') {
                   const match = inventory.find(inv => inv.name.toLowerCase().trim() === (value as string).toLowerCase().trim());
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

  const handleWeightOverride = (type: 'flour' | 'ingredient', id: number, valStr: string) => {
      const targetWeight = parseFloat(valStr);
      if (isNaN(targetWeight) || targetWeight < 0 || totalFlourWeight <= 0) return;
      const newPct = (targetWeight / totalFlourWeight) * 100;
      updateItem(type, id, 'percentage', parseFloat(newPct.toFixed(2)));
  };

  const handleSaveRecipe = (asNew: boolean = false) => {
      if (!recipeName.trim()) { alert('Please enter a name'); return; }
      const snapshot: RecipeSnapshot = { numberOfLoaves, weightPerLoaf, flours, ingredients, date: new Date().toLocaleDateString(), version: asNew || !currentRecipeId ? 1 : currentVersion + 1 };
      let newId = asNew ? Date.now().toString() : (currentRecipeId || Date.now().toString());
      const existing = savedRecipes.find(r => r.id === currentRecipeId);
      const finalRecipe: SavedRecipe = { id: newId, name: asNew ? `${recipeName} (Copy)` : recipeName, ...snapshot, history: existing ? [{ ...existing, flours: existing.flours || [], ingredients: existing.ingredients }, ...existing.history] : [] };
      const updatedList = asNew ? [...savedRecipes, finalRecipe] : savedRecipes.map(r => r.id === newId ? finalRecipe : r);
      setSavedRecipes(updatedList);
      localStorage.setItem('sourdough_recipes', JSON.stringify(updatedList));
      setCurrentRecipeId(finalRecipe.id);
      setCurrentVersion(finalRecipe.version);
      alert('Recipe saved!');
  };

  const renderRow = (item: Ingredient, type: 'flour' | 'ingredient') => {
      const weight = (totalFlourWeight * item.percentage) / 100;
      const isLinked = !!item.inventoryId;
      return (
        <tr key={item.id} className="group hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            <td className="px-4 py-2">
                <div className="flex gap-2 items-center">
                    <select
                        className="block w-1/3 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-md shadow-sm text-xs py-1.5 dark:text-stone-300"
                        value={item.name}
                        onChange={(e) => updateItem(type, item.id, 'name', e.target.value)}
                    >
                        <option value="">Select...</option>
                        {inventory.length > 0 && <optgroup label="Inventory">{inventory.map(inv => <option key={inv.id} value={inv.name}>{inv.name}</option>)}</optgroup>}
                        <optgroup label="Common">{(type === 'flour' ? COMMON_FLOURS : COMMON_ADDINS).map(c => <option key={c} value={c}>{c}</option>)}</optgroup>
                    </select>
                    <div className="relative w-2/3">
                        <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(type, item.id, 'name', e.target.value)}
                            className={`block w-full border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-md shadow-sm text-sm py-1.5 dark:text-stone-100 ${isLinked ? 'pr-7' : ''}`}
                            placeholder={type === 'flour' ? "Flour Type" : "Ingredient"}
                        />
                        {isLinked && <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none"><BoxIcon className="w-3.5 h-3.5 text-amber-600" /></div>}
                    </div>
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="relative rounded-md shadow-sm w-20 ml-auto">
                    <input type="number" step="0.1" value={item.percentage} onChange={(e) => updatePercentage(type, item.id, e.target.value)} className="block w-full text-right border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-md text-sm py-1.5 pr-6 dark:text-stone-100" />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-stone-400 text-xs">%</div>
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="relative rounded-md shadow-sm w-24 ml-auto">
                    <input type="number" value={getDisplayWeight(weight)} onChange={(e) => handleWeightOverride(type, item.id, e.target.value)} className="block w-full text-right border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-md text-sm py-1.5 pr-6 font-medium text-stone-700 dark:text-stone-300" />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-stone-400 text-xs">g</div>
                </div>
            </td>
            <td className="px-4 py-2 text-right">
                <button onClick={() => { const s = type === 'flour' ? setFlours : setIngredients; s(prev => prev.filter(i => i.id !== item.id)); }} className="text-stone-300 dark:text-stone-600 hover:text-red-500 transition-colors p-1">&times;</button>
            </td>
        </tr>
      );
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 text-sm font-medium flex items-center gap-1">&larr; Back</button>
      </div>

      <div className="bg-white dark:bg-stone-900 p-5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Loaves</label>
              <input type="number" value={numberOfLoaves} onChange={e => setNumberOfLoaves(parseFloat(e.target.value) || 0)} className="w-full text-lg font-medium border-stone-300 dark:border-stone-700 dark:bg-stone-950 rounded-md dark:text-stone-100" />
          </div>
          <div>
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Weight / Loaf</label>
              <div className="relative">
                <input type="number" value={weightPerLoaf} onChange={e => setWeightPerLoaf(parseFloat(e.target.value) || 0)} className="w-full text-lg font-medium border-stone-300 dark:border-stone-700 dark:bg-stone-950 rounded-md pr-8 dark:text-stone-100" />
                <span className="absolute right-3 top-3 text-stone-400 text-sm">g</span>
              </div>
          </div>
          <div>
              <label className="block text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Total Batch</label>
              <div className="relative">
                <input type="number" value={Math.round(totalTargetWeight)} className="w-full text-lg font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900 rounded-md pr-8" readOnly />
                <span className="absolute right-3 top-3 text-amber-400 text-sm">g</span>
              </div>
          </div>
          <div className="flex justify-end">
              <select value={roundingMode} onChange={e => setRoundingMode(e.target.value as any)} className="text-xs border-stone-200 dark:border-stone-700 dark:bg-stone-800 rounded-md text-stone-500 dark:text-stone-400">
                  <option value="exact">Exact Weights</option>
                  <option value="1g">Round to 1g</option>
                  <option value="5g">Round to 5g</option>
              </select>
          </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden mb-8">
          <div className="border-b border-stone-100 dark:border-stone-800">
              <div className="bg-stone-50 dark:bg-stone-800 px-6 py-3 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm uppercase tracking-wide">Flour Blend (100%)</h3>
                  <div className={`text-sm font-bold ${Math.abs(totalFlourPercentage - 100) > 0.1 ? 'text-amber-600' : 'text-green-600'}`}>{totalFlourPercentage.toFixed(1)}% Total</div>
              </div>
              <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800">
                  <tbody className="divide-y divide-stone-50 dark:divide-stone-800/50">
                      {flours.map(f => renderRow(f, 'flour'))}
                      <tr>
                          <td colSpan={4} className="px-4 py-2">
                              <button onClick={() => setFlours([...flours, { id: Date.now(), name: '', percentage: 0 }])} className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">+ Add Flour</button>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
          <div>
              <div className="bg-stone-50 dark:bg-stone-800 px-6 py-3 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center">
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm uppercase tracking-wide">Add-ins & Hydration</h3>
                  <span className="text-xs text-stone-400">Relative to Total Flour</span>
              </div>
              <table className="min-w-full divide-y divide-stone-100 dark:divide-stone-800">
                  <tbody className="divide-y divide-stone-50 dark:divide-stone-800/50">
                      {ingredients.map(i => renderRow(i, 'ingredient'))}
                      <tr>
                          <td colSpan={4} className="px-4 py-2">
                              <button onClick={() => setIngredients([...ingredients, { id: Date.now(), name: '', percentage: 0 }])} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1">+ Add Ingredient</button>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>

      <RecipeCost ingredients={[...flours, ...ingredients]} totalFlour={totalFlourWeight} numberOfLoaves={numberOfLoaves} onUpdateIngredientCost={(id, val) => {
          const update = (list: Ingredient[]) => list.map(i => i.id === id ? { ...i, costPerKg: parseFloat(val) } : i);
          setFlours(update(flours)); setIngredients(update(ingredients));
      }} inventory={inventory} />

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-4 shadow-lg z-10 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
              <input type="text" value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Recipe Name" className="w-full sm:max-w-md border-stone-300 dark:border-stone-700 dark:bg-stone-950 rounded-md dark:text-stone-100" />
              <div className="flex gap-2 w-full sm:w-auto">
                  {currentRecipeId && <button onClick={() => handleSaveRecipe(true)} className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-md font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-700">Save Copy</button>}
                  <button onClick={() => handleSaveRecipe(false)} className="flex-1 sm:flex-none px-6 py-2 bg-amber-600 text-white rounded-md font-medium text-sm hover:bg-amber-700 shadow-sm">{currentRecipeId ? 'Update Recipe' : 'Save New Recipe'}</button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default RecipeCalculator;
