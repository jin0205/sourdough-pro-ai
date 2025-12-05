import React, { useState, useEffect, useCallback } from 'react';
import { Ingredient, RecipeSnapshot, SavedRecipe, InventoryItem } from '../types';
import RecipeCost from './RecipeCost';
import { SparklesIcon } from './icons/SparklesIcon';
import Spinner from './Spinner';
import { getRecipeSuggestions } from '../services/geminiService';

const COMMON_INGREDIENTS = [
  'Bread Flour',
  'Strong White Flour',
  'Whole Wheat Flour',
  'Whole Grain Flour',
  'Rye Flour',
  'Spelt Flour',
  'All-Purpose Flour',
  'High Protein Flour',
  'Water',
  'Levain',
  'Salt',
  'Sugar',
  'Honey',
  'Olive Oil',
  'Butter',
  'Milk',
  'Seeds',
  'Yeast',
  'Malt Powder'
];

type RoundingMode = 'exact' | '1g' | '5g';
type ScalingMode = 'loaves' | 'weight';

const initialIngredientsList: Ingredient[] = [
  { id: 1, name: 'Water', percentage: 75 },
  { id: 2, name: 'Levain', percentage: 20 },
  { id: 3, name: 'Salt', percentage: 2 },
];

interface RecipeCalculatorProps {
    initialRecipe?: SavedRecipe | null;
    onBack: () => void;
}

const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ initialRecipe, onBack }) => {
  // Calculator State
  const [numberOfLoaves, setNumberOfLoaves] = useState<number>(2);
  const [weightPerLoaf, setWeightPerLoaf] = useState<number>(900);
  const [totalFlour, setTotalFlour] = useState<number>(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredientsList);
  const [doughWeight, setDoughWeight] = useState<number>(0);
  
  // Scaling State
  const [scalingMode, setScalingMode] = useState<ScalingMode>('loaves');
  const [scalePercentage, setScalePercentage] = useState<string>('100');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('exact');
  
  // Base Flour State
  const [baseFlourName, setBaseFlourName] = useState<string>('Bread Flour');
  const [baseFlourCost, setBaseFlourCost] = useState<string>('');
  
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

  // Initialize with passed recipe if available
  useEffect(() => {
      if (initialRecipe) {
          setCurrentRecipeId(initialRecipe.id);
          setRecipeName(initialRecipe.name);
          setCurrentVersion(initialRecipe.version);
          setNumberOfLoaves(initialRecipe.numberOfLoaves);
          setWeightPerLoaf(initialRecipe.weightPerLoaf);
          setIngredients(initialRecipe.ingredients);
          setBaseFlourName(initialRecipe.baseFlourName || 'Bread Flour');
          setBaseFlourCost(initialRecipe.baseFlourCostPerKg ? initialRecipe.baseFlourCostPerKg.toString() : '');
      } else {
          // Reset if new
          setCurrentRecipeId(null);
          setRecipeName('');
          setCurrentVersion(1);
          setNumberOfLoaves(2);
          setWeightPerLoaf(900);
          setIngredients(initialIngredientsList.map(i => ({...i})));
          setBaseFlourName('Bread Flour');
          setBaseFlourCost('');
      }
  }, [initialRecipe]);

  const calculateRecipe = useCallback(() => {
    const targetDoughWeight = (numberOfLoaves || 0) * (weightPerLoaf || 0);
    const totalPercentage = 1 + ingredients.reduce((sum, ing) => sum + (ing.percentage || 0) / 100, 0);
    const newTotalFlour = totalPercentage > 0 ? targetDoughWeight / totalPercentage : 0;
    
    setTotalFlour(newTotalFlour);
    setDoughWeight(targetDoughWeight);
  }, [numberOfLoaves, weightPerLoaf, ingredients]);

  useEffect(() => {
    calculateRecipe();
  }, [calculateRecipe]);

  // Load recipes and inventory from local storage on mount (for saving logic)
  useEffect(() => {
    const saved = localStorage.getItem('sourdough_recipes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((r: any) => ({
            ...r,
            version: r.version || 1,
            history: r.history || []
        }));
        setSavedRecipes(migrated);
      } catch (e) {
        console.error('Failed to load recipes', e);
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

  const findInventoryMatch = (name: string) => {
      return inventory.find(item => item.name.toLowerCase() === name.toLowerCase());
  };

  const handlePercentageChange = (id: number, value: string) => {
    const newPercentage = parseFloat(value);
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, percentage: isNaN(newPercentage) ? 0 : newPercentage } : ing
      )
    );
  };

  const handleWeightChange = (id: number, value: string) => {
      const targetWeight = parseFloat(value);
      if (isNaN(targetWeight) || targetWeight < 0) return;

      const totalDoughWeight = (numberOfLoaves || 0) * (weightPerLoaf || 0);
      
      if (totalDoughWeight - targetWeight <= 1) return; 

      const otherIngredientsPercentageSum = ingredients.reduce((sum, ing) => {
          if (ing.id === id) return sum;
          return sum + (ing.percentage || 0) / 100;
      }, 0);
      
      const s_other = 1 + otherIngredientsPercentageSum;
      const newPercentageDecimal = (targetWeight * s_other) / (totalDoughWeight - targetWeight);
      const newPercentage = newPercentageDecimal * 100;

      setIngredients(ingredients.map(ing => 
          ing.id === id ? { ...ing, percentage: newPercentage } : ing
      ));
  };

  const handleBaseFlourWeightChange = (value: string) => {
      const targetFlour = parseFloat(value);
      if (isNaN(targetFlour) || targetFlour < 0) return;
      
      const totalPercentage = 1 + ingredients.reduce((sum, ing) => sum + (ing.percentage || 0) / 100, 0);
      const newDoughWeight = targetFlour * totalPercentage;
      
      const count = numberOfLoaves || 1;
      const newWeightPerLoaf = newDoughWeight / count;
      
      setWeightPerLoaf(parseFloat(newWeightPerLoaf.toFixed(1)));
  };

  const handleCostChange = (id: number, value: string) => {
      const newCost = parseFloat(value);
      setIngredients(
        ingredients.map((ing) =>
          ing.id === id ? { ...ing, costPerKg: isNaN(newCost) ? undefined : newCost } : ing
        )
      );
  };

  const handleNumberOfLoavesChange = (value: string) => {
    const newCount = parseFloat(value);
    setNumberOfLoaves(isNaN(newCount) ? 0 : newCount);
  };

  const handleWeightPerLoafChange = (value: string) => {
    const newWeight = parseFloat(value);
    setWeightPerLoaf(isNaN(newWeight) ? 0 : newWeight);
    
    if (scalingMode === 'weight' && !isNaN(newWeight) && newWeight > 0) {
        const currentTotal = numberOfLoaves * weightPerLoaf;
        setNumberOfLoaves(currentTotal / newWeight);
    }
  };
  
  const handleTotalWeightInput = (value: string) => {
      const targetTotal = parseFloat(value);
      if (!isNaN(targetTotal) && weightPerLoaf > 0) {
          setNumberOfLoaves(targetTotal / weightPerLoaf);
      }
  };

  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([...ingredients, { id: newId, name: '', percentage: 0 }]);
  }

  const handleIngredientNameChange = (id: number, name: string) => {
    const match = findInventoryMatch(name);
    setIngredients(
        ingredients.map((ing) =>
          ing.id === id ? { 
              ...ing, 
              name, 
              inventoryId: match ? match.id : undefined,
          } : ing
        )
      );
  }

  const removeIngredient = (id: number) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  }

  const applyScaling = () => {
      const factor = parseFloat(scalePercentage);
      if (!isNaN(factor) && factor > 0) {
          const multiplier = factor / 100;
          const newLoaves = numberOfLoaves * multiplier;
          setNumberOfLoaves(Math.round(newLoaves * 100) / 100);
          setScalePercentage('100');
      }
  };

  const getDisplayWeight = (weight: number): string => {
      if (roundingMode === '1g') {
          return Math.round(weight).toFixed(0);
      }
      if (roundingMode === '5g') {
          return (Math.round(weight / 5) * 5).toFixed(0);
      }
      return weight.toFixed(1);
  };

  const handleGetSuggestion = async () => {
      if (!aiGoal.trim()) return;
      setIsAiLoading(true);
      setAiSuggestion('');

      const context = `
      Base Flour: ${baseFlourName} (100%)
      Hydration: ${ingredients.find(i => i.name.toLowerCase() === 'water')?.percentage || 'Unknown'}%
      Ingredients:
      ${ingredients.map(i => `- ${i.name}: ${i.percentage}%`).join('\n')}
      `;

      const result = await getRecipeSuggestions(context, aiGoal);
      setAiSuggestion(result);
      setIsAiLoading(false);
  };

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      alert('Please enter a recipe name to save.');
      return;
    }

    const baseFlourMatch = findInventoryMatch(baseFlourName);

    const currentData: RecipeSnapshot = {
      numberOfLoaves,
      weightPerLoaf,
      ingredients,
      date: new Date().toLocaleDateString(),
      version: currentVersion,
      baseFlourName,
      baseFlourInventoryId: baseFlourMatch?.id,
      baseFlourCostPerKg: parseFloat(baseFlourCost) || 0
    };

    let updatedRecipes: SavedRecipe[];

    if (currentRecipeId) {
        updatedRecipes = savedRecipes.map(r => {
            if (r.id === currentRecipeId) {
                const historyItem: RecipeSnapshot = {
                    numberOfLoaves: r.numberOfLoaves,
                    weightPerLoaf: r.weightPerLoaf,
                    ingredients: r.ingredients,
                    date: r.date,
                    version: r.version,
                    baseFlourName: r.baseFlourName,
                    baseFlourInventoryId: r.baseFlourInventoryId,
                    baseFlourCostPerKg: r.baseFlourCostPerKg
                };

                const newVersion = r.version + 1;
                setCurrentVersion(newVersion);
                
                return {
                    ...r,
                    ...currentData,
                    name: recipeName,
                    version: newVersion,
                    history: [historyItem, ...r.history]
                };
            }
            return r;
        });
        alert(`Recipe updated to Version ${currentVersion + 1}!`);
    } else {
        const newRecipe: SavedRecipe = {
          id: Date.now().toString(),
          name: recipeName,
          ...currentData,
          version: 1,
          history: []
        };
        updatedRecipes = [...savedRecipes, newRecipe];
        setCurrentRecipeId(newRecipe.id);
        setCurrentVersion(1);
        alert('Recipe saved successfully!');
    }

    setSavedRecipes(updatedRecipes);
    localStorage.setItem('sourdough_recipes', JSON.stringify(updatedRecipes));
  };

  const handleSaveAsNew = () => {
    if (!recipeName.trim()) {
        alert('Please enter a recipe name to save.');
        return;
    }

    const baseFlourMatch = findInventoryMatch(baseFlourName);

    const newRecipe: SavedRecipe = {
        id: Date.now().toString(),
        name: recipeName + ' (Copy)',
        numberOfLoaves,
        weightPerLoaf,
        ingredients,
        date: new Date().toLocaleDateString(),
        version: 1,
        history: [],
        baseFlourName,
        baseFlourInventoryId: baseFlourMatch?.id,
        baseFlourCostPerKg: parseFloat(baseFlourCost) || 0
    };

    const updatedRecipes = [...savedRecipes, newRecipe];
    setSavedRecipes(updatedRecipes);
    localStorage.setItem('sourdough_recipes', JSON.stringify(updatedRecipes));
    
    setCurrentRecipeId(newRecipe.id);
    setRecipeName(newRecipe.name);
    setCurrentVersion(1);
    alert('Recipe saved as new copy!');
  };

  const handleLoadVersion = (recipe: SavedRecipe, snapshot: RecipeSnapshot) => {
      if (window.confirm(`Revert to Version ${snapshot.version} from ${snapshot.date}? Unsaved changes will be lost.`)) {
          // This keeps the recipe ID but resets the data to the snapshot
          setCurrentVersion(snapshot.version);
          setNumberOfLoaves(snapshot.numberOfLoaves);
          setWeightPerLoaf(snapshot.weightPerLoaf);
          setIngredients(snapshot.ingredients);
          setBaseFlourName(snapshot.baseFlourName || 'Bread Flour');
          setBaseFlourCost(snapshot.baseFlourCostPerKg ? snapshot.baseFlourCostPerKg.toString() : '');
      }
  };

  const toggleHistory = () => {
      if (currentRecipeId) {
          setExpandedRecipeId(expandedRecipeId === currentRecipeId ? null : currentRecipeId);
      }
  }
  
  const currentRecipeObject = savedRecipes.find(r => r.id === currentRecipeId);

  return (
    <div className="animate-fade-in pb-12">
      {/* Back Navigation */}
      <button 
        onClick={onBack}
        className="mb-4 flex items-center text-stone-500 hover:text-stone-800 transition-colors font-medium text-sm"
      >
          &larr; Back to Library
      </button>

      <datalist id="all-ingredients-list">
        {inventory.map(item => (
            <option key={`inv-${item.id}`} value={item.name} />
        ))}
        {COMMON_INGREDIENTS.filter(c => !inventory.find(i => i.name.toLowerCase() === c.toLowerCase())).map((opt) => (
          <option key={`common-${opt}`} value={opt} />
        ))}
      </datalist>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 mb-1">
             {recipeName || "New Recipe"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-stone-500">
             <span>{currentRecipeId ? `Version ${currentVersion}` : 'Unsaved Draft'}</span>
             {currentRecipeObject && currentRecipeObject.history.length > 0 && (
                 <>
                    <span>&bull;</span>
                    <button onClick={toggleHistory} className="text-amber-600 hover:underline">
                        {expandedRecipeId ? 'Hide History' : 'View History'}
                    </button>
                 </>
             )}
          </div>
        </div>
      </div>

       {/* Inline History Drawer */}
       {expandedRecipeId && currentRecipeObject && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-6 animate-fade-in">
                <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Version History</p>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {currentRecipeObject.history.map((snap, idx) => (
                        <li key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-stone-200 shadow-sm">
                            <div>
                                <span className="font-medium text-stone-700">v{snap.version}</span>
                                <span className="mx-2 text-stone-300">|</span>
                                <span className="text-stone-500">{snap.date}</span>
                                <span className="mx-2 text-stone-300">|</span>
                                <span className="text-stone-500">{snap.numberOfLoaves} x {snap.weightPerLoaf}g</span>
                            </div>
                            <button 
                                onClick={() => handleLoadVersion(currentRecipeObject, snap)}
                                className="text-amber-600 hover:text-amber-800 font-medium hover:underline"
                            >
                                Restore
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}

      {/* Unified Batch Configuration Panel */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h3 className="text-lg font-bold text-stone-800">Batch Configuration</h3>
            </div>
            
            {/* Rounding Select */}
            <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                <label htmlFor="rounding" className="text-xs font-medium text-stone-600 uppercase tracking-wide">Rounding</label>
                <select 
                    id="rounding"
                    value={roundingMode}
                    onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
                    className="bg-transparent border-none text-sm font-medium text-stone-800 focus:ring-0 cursor-pointer pl-0 pr-8 py-0"
                >
                    <option value="exact">Exact (0.1g)</option>
                    <option value="1g">Nearest 1g/ml</option>
                    <option value="5g">Nearest 5g/ml</option>
                </select>
            </div>
        </div>

        {/* Mode Toggles */}
        <div className="flex space-x-1 bg-stone-100 p-1 rounded-lg mb-6 w-full md:w-auto inline-flex">
            <button
                onClick={() => setScalingMode('loaves')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    scalingMode === 'loaves' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
            >
                By Loaf Count
            </button>
            <button
                onClick={() => setScalingMode('weight')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    scalingMode === 'weight' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
            >
                By Total Weight
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
            {scalingMode === 'loaves' ? (
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Number of Loaves</label>
                    <input
                        type="number"
                        step="0.5"
                        value={numberOfLoaves}
                        onChange={(e) => handleNumberOfLoavesChange(e.target.value)}
                        className="block w-full px-4 py-2 bg-white border border-stone-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-lg"
                        placeholder="2"
                    />
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Target Total Weight (g)</label>
                    <input
                        type="number"
                        step="10"
                        value={Math.round(doughWeight)} 
                        onChange={(e) => handleTotalWeightInput(e.target.value)}
                        className="block w-full px-4 py-2 bg-white border border-stone-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-lg"
                        placeholder="e.g. 5000"
                    />
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Weight per Loaf (g)</label>
                <input
                    type="number"
                    step="10"
                    value={weightPerLoaf}
                    onChange={(e) => handleWeightPerLoafChange(e.target.value)}
                    className="block w-full px-4 py-2 bg-white border border-stone-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-lg"
                    placeholder="900"
                />
            </div>

            {/* Info Card */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex flex-col justify-center min-h-[72px]">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        {scalingMode === 'loaves' ? 'Total Dough Weight' : 'Resulting Loaves'}
                    </span>
                </div>
                <div className="text-2xl font-bold text-amber-900">
                    {scalingMode === 'loaves' 
                        ? `${doughWeight.toFixed(0)} g`
                        : `${numberOfLoaves.toFixed(1)}`
                    }
                </div>
                {scalingMode === 'weight' && (
                    <div className="text-xs text-amber-700 mt-1">loaves @ {weightPerLoaf}g</div>
                )}
            </div>
        </div>
        
        {/* Percentage Scaler Utility */}
        <div className="mt-6 pt-6 border-t border-stone-100 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-stone-500">Quick Scale:</span>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={scalePercentage}
                    onChange={(e) => setScalePercentage(e.target.value)}
                    className="w-20 px-3 py-1.5 text-sm border border-stone-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                    placeholder="100"
                />
                <span className="text-sm text-stone-500">%</span>
                <button 
                    onClick={applyScaling}
                    className="ml-2 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-md text-sm font-medium hover:bg-stone-200"
                >
                    Apply %
                </button>
            </div>
        </div>
      </div>
      
      {/* Ingredients Table */}
      <div className="overflow-x-auto mb-6 shadow-sm rounded-lg border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider w-1/3">Ingredient</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Baker's %</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Weight (g)</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            <tr className="bg-stone-50 font-semibold">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                  <div className="flex flex-col">
                      <span className="text-xs text-stone-500 mb-1">Total Flour Base (100%)</span>
                      <div className="flex gap-2">
                          <select
                              className="block w-1/3 border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-xs"
                              value={COMMON_INGREDIENTS.includes(baseFlourName) ? baseFlourName : ""}
                              onChange={(e) => e.target.value && setBaseFlourName(e.target.value)}
                          >
                              <option value="">Quick Select...</option>
                              {COMMON_INGREDIENTS.map(c => <option key={`bf-${c}`} value={c}>{c}</option>)}
                          </select>
                          <input
                            type="text"
                            list="all-ingredients-list"
                            value={baseFlourName}
                            onChange={(e) => setBaseFlourName(e.target.value)}
                            className="block w-2/3 border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm font-normal"
                            placeholder="Type name..."
                          />
                      </div>
                  </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">100%</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                  <div className="relative rounded-md shadow-sm w-28">
                        <input
                            type="number"
                            step="any"
                            value={getDisplayWeight(totalFlour)}
                            onChange={(e) => handleBaseFlourWeightChange(e.target.value)}
                            className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-stone-300 rounded-md pr-6 text-right"
                        />
                         <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                           <span className="text-stone-400 sm:text-sm">g</span>
                         </div>
                    </div>
              </td>
              <td></td>
            </tr>
            {ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex gap-2">
                         <select
                              className="block w-1/3 border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-xs"
                              value={COMMON_INGREDIENTS.includes(ing.name) ? ing.name : ""}
                              onChange={(e) => e.target.value && handleIngredientNameChange(ing.id, e.target.value)}
                          >
                              <option value="">Quick Select...</option>
                              {COMMON_INGREDIENTS.map(c => <option key={`ing-${ing.id}-${c}`} value={c}>{c}</option>)}
                          </select>
                         <input
                           type="text"
                           list="all-ingredients-list"
                           value={ing.name}
                           onChange={(e) => handleIngredientNameChange(ing.id, e.target.value)}
                           className="block w-2/3 border-stone-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                           placeholder="Type custom name..."
                         />
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative rounded-md shadow-sm w-24">
                          <input
                              type="number"
                              value={ing.percentage}
                              onChange={(e) => handlePercentageChange(ing.id, e.target.value)}
                              className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-stone-300 rounded-md pr-6"
                          />
                           <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                             <span className="text-stone-400 sm:text-sm">%</span>
                           </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      <div className="relative rounded-md shadow-sm w-28">
                          <input
                              type="number"
                              step="any"
                              value={getDisplayWeight((totalFlour * ing.percentage) / 100)}
                              onChange={(e) => handleWeightChange(ing.id, e.target.value)}
                              className="focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-stone-300 rounded-md pr-6 text-right"
                          />
                           <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                             <span className="text-stone-400 sm:text-sm">g</span>
                           </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => removeIngredient(ing.id)} className="text-red-600 hover:text-red-900">Remove</button>
                  </td>
                </tr>
            ))}
            <tr className="bg-stone-100 font-medium border-t-2 border-stone-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-800">Total Batch</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-800 text-right pr-12">
                    {(
                        parseFloat(getDisplayWeight(totalFlour)) + 
                        ingredients.reduce((sum, ing) => sum + parseFloat(getDisplayWeight((totalFlour * ing.percentage) / 100)), 0)
                    ).toFixed(roundingMode === 'exact' ? 1 : 0)} g
                </td>
                <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <button onClick={addIngredient} className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center">
            <span className="text-lg mr-1">+</span> Add Ingredient
        </button>
      </div>

       {/* AI Recipe Assistant Section */}
       <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">AI Recipe Developer</h3>
            </div>
            <p className="text-sm text-indigo-700 mb-4">
                Want to tweak this recipe? Tell the AI your goal (e.g., "Make the crumb more open," "Add a nutty flavor," "Increase sourness") and get scientific suggestions.
            </p>
            
            <div className="flex gap-3 mb-4">
                <input 
                    type="text" 
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="Describe your goal..."
                    className="flex-grow px-4 py-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleGetSuggestion()}
                />
                <button 
                    onClick={handleGetSuggestion}
                    disabled={isAiLoading || !aiGoal.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium text-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                    {isAiLoading ? <Spinner /> : 'Get Suggestions'}
                </button>
            </div>

            {aiSuggestion && (
                <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm animate-fade-in">
                    <h4 className="font-semibold text-indigo-900 mb-2 text-sm uppercase tracking-wide">AI Suggestions</h4>
                    <div className="prose prose-sm prose-indigo max-w-none" dangerouslySetInnerHTML={{ __html: aiSuggestion.replace(/\n/g, '<br />') }} />
                </div>
            )}
       </div>

      <RecipeCost
        ingredients={ingredients}
        totalFlour={totalFlour}
        numberOfLoaves={numberOfLoaves}
        baseFlourName={baseFlourName}
        baseFlourCost={baseFlourCost}
        onUpdateBaseFlourCost={setBaseFlourCost}
        onUpdateIngredientCost={handleCostChange}
        inventory={inventory}
      />
      
      <div className="mb-8"></div>

      {/* Saving Action Bar */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur shadow-xl border border-stone-200 p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="w-full flex-grow">
            <label htmlFor="recipe-name" className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Recipe Name
            </label>
            <input 
                type="text" 
                id="recipe-name"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g., Sunday Morning Sourdough"
                className="block w-full px-3 py-2 bg-white border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
            />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            {currentRecipeId && (
                <button 
                    onClick={handleSaveAsNew}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-md hover:bg-amber-50 font-medium text-sm shadow-sm whitespace-nowrap h-[38px]"
                >
                    Save as Copy
                </button>
            )}
            <button 
                onClick={handleSaveRecipe}
                className="flex-1 sm:flex-none px-6 py-2 bg-amber-600 border border-transparent rounded-md shadow-sm text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 font-medium text-sm h-[38px]"
            >
                {currentRecipeId ? 'Update Recipe' : 'Save New Recipe'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCalculator;