import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import RecipeComparison from './RecipeComparison';
import { SavedRecipe } from '../types';
import { storageService } from '../services/storageService';

type ViewMode = 'library' | 'workbench' | 'comparison';

const RecipeManagement: React.FC = () => {
    const [view, setView] = useState<ViewMode>('library');
    const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);
    const [comparisonIds, setComparisonIds] = useState<string[]>([]);

    // Load recipes on mount and when view changes to library (to catch updates)
    useEffect(() => {
        const loadRecipes = () => {
            setSavedRecipes(storageService.getRecipes());
        };
        loadRecipes();

        window.addEventListener('storage', loadRecipes);
        return () => window.removeEventListener('storage', loadRecipes);
    }, [view]);

    const handleEditRecipe = (recipe: SavedRecipe) => {
        setActiveRecipe(recipe);
        setView('workbench');
    };

    const handleCreateRecipe = () => {
        setActiveRecipe(null);
        setView('workbench');
    };

    const handleDeleteRecipe = (id: string) => {
        if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
            storageService.deleteRecipe(id);
            setSavedRecipes(storageService.getRecipes());
        }
    };

    const handleBackToLibrary = () => {
        setActiveRecipe(null);
        setComparisonIds([]);
        setView('library');
    };

    const handleCompare = (ids: string[]) => {
        if (ids.length !== 2) return;
        setComparisonIds(ids);
        setView('comparison');
    }

    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h2 className="text-2xl font-bold text-stone-800 mb-1">
                    {view === 'library' ? 'Recipe Library' : view === 'workbench' ? 'Recipe Workbench' : 'Recipe Comparison'}
                </h2>
                <p className="text-stone-600">
                    {view === 'library' 
                        ? 'Manage your collection of professional sourdough formulas.' 
                        : view === 'workbench'
                            ? 'Formulate, scale, and analyze your dough.'
                            : 'Analyze differences between two formulas.'}
                </p>
            </div>

            {view === 'library' && (
                <RecipeLibrary 
                    recipes={savedRecipes}
                    onEdit={handleEditRecipe}
                    onCreate={handleCreateRecipe}
                    onDelete={handleDeleteRecipe}
                    onCompare={handleCompare}
                />
            )}

            {view === 'workbench' && (
                <div className="animate-slide-in-right">
                    <RecipeCalculator 
                        initialRecipe={activeRecipe}
                        onBack={handleBackToLibrary}
                    />
                </div>
            )}

            {view === 'comparison' && (
                <RecipeComparison
                    recipes={savedRecipes.filter(r => comparisonIds.includes(r.id))}
                    onBack={handleBackToLibrary}
                />
            )}
        </div>
    );
};

export default RecipeManagement;