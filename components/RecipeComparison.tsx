import React from 'react';
import { SavedRecipe } from '../types';
import { calculateTotalFlour, calculateIngredientWeight } from '../utils/recipeMath';

interface RecipeComparisonProps {
  recipes: SavedRecipe[];
  onBack: () => void;
}

const RecipeComparison: React.FC<RecipeComparisonProps> = ({ recipes, onBack }) => {
  if (recipes.length < 2) return null;

  const [recipeA, recipeB] = recipes;

  const getHydration = (r: SavedRecipe) => {
    return r.ingredients.find(i => i.name.toLowerCase().includes('water'))?.percentage || 0;
  };

  const getInoculation = (r: SavedRecipe) => {
     return r.ingredients.find(i => i.name.toLowerCase().includes('levain'))?.percentage || 0;
  };

  const getSalt = (r: SavedRecipe) => {
      return r.ingredients.find(i => i.name.toLowerCase().includes('salt'))?.percentage || 0;
  };

  const totalFlourA = calculateTotalFlour(recipeA.numberOfLoaves, recipeA.weightPerLoaf, recipeA.ingredients);
  const totalFlourB = calculateTotalFlour(recipeB.numberOfLoaves, recipeB.weightPerLoaf, recipeB.ingredients);

  // Align ingredients
  const allIngredientNames = Array.from(new Set([
    ...recipeA.ingredients.map(i => i.name),
    ...recipeB.ingredients.map(i => i.name)
  ])).sort();

  return (
    <div className="animate-slide-in-right space-y-6">
       <button
        onClick={onBack}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors font-medium text-sm"
      >
          &larr; Back to Library
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-3 bg-stone-50 border-b border-stone-200 divide-x divide-stone-200">
            <div className="p-4 flex items-center justify-center font-bold text-stone-400 uppercase tracking-wide text-sm">
                Metric
            </div>
            <div className="p-4 text-center">
                <h3 className="font-bold text-stone-800 text-lg truncate">{recipeA.name}</h3>
                <p className="text-xs text-stone-500">v{recipeA.version} &bull; {recipeA.date}</p>
            </div>
             <div className="p-4 text-center">
                <h3 className="font-bold text-stone-800 text-lg truncate">{recipeB.name}</h3>
                 <p className="text-xs text-stone-500">v{recipeB.version} &bull; {recipeB.date}</p>
            </div>
        </div>

        <div className="divide-y divide-stone-100">
             {/* Key Stats Row */}
             <div className="grid grid-cols-3 divide-x divide-stone-100 bg-white">
                <div className="p-3 text-sm font-medium text-stone-600 pl-6">Hydration</div>
                <div className="p-3 text-center font-mono text-stone-800">{getHydration(recipeA)}%</div>
                <div className={`p-3 text-center font-mono font-bold ${getHydration(recipeB) !== getHydration(recipeA) ? 'text-amber-600 bg-amber-50' : 'text-stone-800'}`}>
                    {getHydration(recipeB)}%
                    {getHydration(recipeB) !== getHydration(recipeA) && (
                        <span className="ml-2 text-xs font-normal text-stone-500">
                            ({getHydration(recipeB) > getHydration(recipeA) ? '+' : ''}{(getHydration(recipeB) - getHydration(recipeA)).toFixed(1)}%)
                        </span>
                    )}
                </div>
             </div>

             <div className="grid grid-cols-3 divide-x divide-stone-100 bg-stone-50/50">
                <div className="p-3 text-sm font-medium text-stone-600 pl-6">Inoculation (Levain)</div>
                <div className="p-3 text-center font-mono text-stone-800">{getInoculation(recipeA)}%</div>
                <div className={`p-3 text-center font-mono font-bold ${getInoculation(recipeB) !== getInoculation(recipeA) ? 'text-amber-600 bg-amber-50' : 'text-stone-800'}`}>
                    {getInoculation(recipeB)}%
                </div>
             </div>

             <div className="grid grid-cols-3 divide-x divide-stone-100 bg-white">
                <div className="p-3 text-sm font-medium text-stone-600 pl-6">Salt</div>
                <div className="p-3 text-center font-mono text-stone-800">{getSalt(recipeA)}%</div>
                <div className={`p-3 text-center font-mono font-bold ${getSalt(recipeB) !== getSalt(recipeA) ? 'text-amber-600 bg-amber-50' : 'text-stone-800'}`}>
                    {getSalt(recipeB)}%
                </div>
             </div>

             <div className="grid grid-cols-3 divide-x divide-stone-100 bg-stone-50/50">
                <div className="p-3 text-sm font-medium text-stone-600 pl-6">Total Flour (Calculated)</div>
                <div className="p-3 text-center font-mono text-stone-800">{Math.round(totalFlourA)}g</div>
                <div className="p-3 text-center font-mono text-stone-800">{Math.round(totalFlourB)}g</div>
             </div>
        </div>

        <div className="bg-stone-100 p-2 text-xs font-bold text-stone-500 uppercase tracking-wide text-center border-t border-b border-stone-200">
            Ingredient Percentages
        </div>

        <div className="divide-y divide-stone-100">
            {allIngredientNames.map(name => {
                const ingA = recipeA.ingredients.find(i => i.name === name);
                const ingB = recipeB.ingredients.find(i => i.name === name);
                const valA = ingA ? ingA.percentage : 0;
                const valB = ingB ? ingB.percentage : 0;
                const hasDiff = Math.abs(valA - valB) > 0.1;

                return (
                    <div key={name} className="grid grid-cols-3 divide-x divide-stone-100 hover:bg-stone-50">
                        <div className="p-3 text-sm font-medium text-stone-600 pl-6 truncate" title={name}>{name}</div>
                        <div className="p-3 text-center font-mono text-sm text-stone-500">
                            {ingA ? `${valA}%` : '-'}
                        </div>
                        <div className={`p-3 text-center font-mono text-sm font-bold ${hasDiff ? 'text-amber-600 bg-amber-50' : 'text-stone-500'}`}>
                            {ingB ? `${valB}%` : '-'}
                            {hasDiff && (
                                <span className="ml-2 text-xs font-normal text-stone-400">
                                     ({valB > valA ? '+' : ''}{(valB - valA).toFixed(1)}%)
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default RecipeComparison;
