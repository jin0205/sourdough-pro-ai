import React, { useState, useEffect } from 'react';
import RecipeCalculator from './RecipeCalculator';
import RecipeLibrary from './RecipeLibrary';
import { SavedRecipe } from '../types';
import { storageService } from '../services/storageService';

type ViewMode = 'library' | 'workbench';

const RecipeManagement: React.FC = () => {
    const [view, setView] = useState<ViewMode>('library');
    const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<SavedRecipe | null>(null);

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
        setView('library');
    };

    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h2 className="text-2xl font-bold text-stone-800 mb-1">
                    {view === 'library' ? 'Recipe Library' : 'Recipe Workbench'}
                </h2>
                <p className="text-stone-600">
                    {view === 'library' 
                        ? 'Manage your collection of professional sourdough formulas.' 
                        : 'Formulate, scale, and analyze your dough.'}
                </p>
            </div>

            {view === 'library' ? (
                <RecipeLibrary 
                    recipes={savedRecipes}
                    onEdit={handleEditRecipe}
                    onCreate={handleCreateRecipe}
                    onDelete={handleDeleteRecipe}
                />
            ) : (
                <div className="animate-slide-in-right">
                    <RecipeCalculator 
                        initialRecipe={activeRecipe}
                        onBack={handleBackToLibrary}
                    />
                </div>
            )}
        </div>
    );
};

export default RecipeManagement;