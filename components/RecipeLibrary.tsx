
import React, { useState, useMemo } from 'react';
import { SavedRecipe } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface RecipeLibraryProps {
  recipes: SavedRecipe[];
  onEdit: (recipe: SavedRecipe) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

const RecipeLibrary: React.FC<RecipeLibraryProps> = ({ recipes, onEdit, onCreate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');

  const getHydration = (recipe: SavedRecipe): string => {
    // 1. Calculate Total Flour % (Should ideally be 100, but sum it to be safe)
    let totalFlourPct = 100;
    
    // Check if using new structure with 'flours' array
    if (recipe.flours && recipe.flours.length > 0) {
        totalFlourPct = recipe.flours.reduce((sum, f) => sum + (f.percentage || 0), 0);
    }
    
    // 2. Find water
    const water = recipe.ingredients.find(i => i.name.toLowerCase().includes('water'));
    if (!water) return '?';

    // 3. Hydration % = (Water % / Total Flour %) * 100
    // In Baker's Math, water percentage is ALREADY relative to Total Flour (100%).
    // So we just return the water percentage directly.
    return `${water.percentage}%`;
  };

  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];

    if (searchTerm) {
      result = result.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return parseInt(b.id) - parseInt(a.id);
      } else if (sortOrder === 'oldest') {
        return parseInt(a.id) - parseInt(b.id);
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [recipes, searchTerm, sortOrder]);

  return (
    <div className="animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex-grow w-full md:w-auto">
          <div className="relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your recipe book..."
              className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-9 sm:text-sm border-stone-300 rounded-md py-2.5"
            />
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="block pl-3 pr-8 py-2 text-base border-stone-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white shadow-sm cursor-pointer"
            >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">Name (A-Z)</option>
            </select>
            <button
                onClick={onCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 whitespace-nowrap"
            >
                <span className="text-lg mr-1">+</span> New Recipe
            </button>
        </div>
      </div>

      {/* Grid */}
      {filteredAndSortedRecipes.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
           <CalculatorIcon className="mx-auto h-12 w-12 text-stone-300" />
           <p className="mt-4 text-stone-500 font-medium">No recipes found.</p>
           <button onClick={onCreate} className="mt-2 text-amber-600 hover:text-amber-800 font-medium text-sm">Create your first formula</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedRecipes.map(recipe => (
                <div 
                    key={recipe.id} 
                    onClick={() => onEdit(recipe)}
                    className="group bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
                >
                    <div className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1" title={recipe.name}>
                                {recipe.name}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                                v{recipe.version}
                            </span>
                        </div>
                        <p className="text-xs text-stone-400 mb-4">{recipe.date}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-stone-50 p-2 rounded border border-stone-100">
                                <span className="block text-xs text-stone-500 uppercase tracking-wide">Hydration</span>
                                <span className="font-semibold text-stone-800">{getHydration(recipe)}</span>
                            </div>
                            <div className="bg-stone-50 p-2 rounded border border-stone-100">
                                <span className="block text-xs text-stone-500 uppercase tracking-wide">Yield</span>
                                <span className="font-semibold text-stone-800">{recipe.numberOfLoaves} x {recipe.weightPerLoaf}g</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 px-5 py-3 border-t border-stone-100 flex justify-between items-center">
                        <span className="text-xs text-stone-500 font-medium group-hover:text-amber-600 transition-colors">
                            Open Workbench &rarr;
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                            className="text-stone-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete Recipe"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default RecipeLibrary;
