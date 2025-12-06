import { SavedRecipe, InventoryItem, PlannerItem } from '../types';

const KEYS = {
    RECIPES: 'sourdough_recipes',
    INVENTORY: 'sourdough_inventory',
    PLANNER: 'sourdough_planner_items',
};

class StorageService {
    // RECIPES
    getRecipes(): SavedRecipe[] {
        try {
            const data = localStorage.getItem(KEYS.RECIPES);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return parsed.map((r: any) => ({
                ...r,
                version: r.version || 1,
                history: r.history || []
            }));
        } catch (e) {
            console.error('Failed to parse recipes', e);
            return [];
        }
    }

    saveRecipes(recipes: SavedRecipe[]) {
        localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
        // Dispatch event for cross-tab or cross-component sync
        window.dispatchEvent(new Event('storage'));
    }

    addOrUpdateRecipe(recipe: SavedRecipe) {
        const recipes = this.getRecipes();
        const index = recipes.findIndex(r => r.id === recipe.id);
        if (index >= 0) {
            recipes[index] = recipe;
        } else {
            recipes.push(recipe);
        }
        this.saveRecipes(recipes);
    }

    deleteRecipe(id: string) {
        const recipes = this.getRecipes().filter(r => r.id !== id);
        this.saveRecipes(recipes);
        // Clean up planner items that use this recipe
        this.syncPlannerItems();
    }

    // INVENTORY
    getInventory(): InventoryItem[] {
        try {
            const data = localStorage.getItem(KEYS.INVENTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to parse inventory', e);
            return [];
        }
    }

    saveInventory(inventory: InventoryItem[]) {
        localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
        window.dispatchEvent(new Event('storage'));
    }

    // PLANNER
    getPlannerItems(): PlannerItem[] {
        try {
            const data = localStorage.getItem(KEYS.PLANNER);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to parse planner items', e);
            return [];
        }
    }

    savePlannerItems(items: PlannerItem[]) {
        localStorage.setItem(KEYS.PLANNER, JSON.stringify(items));
        window.dispatchEvent(new Event('storage'));
    }

    /**
     * Ensures planner items are valid against current recipes.
     * Removes items for deleted recipes.
     * Updates items if recipe version has changed.
     */
    syncPlannerItems() {
        const recipes = this.getRecipes();
        const currentPlan = this.getPlannerItems();
        const recipeMap = new Map(recipes.map(r => [r.id, r]));

        const validPlannerItems: PlannerItem[] = [];
        let hasChanges = false;

        currentPlan.forEach(item => {
            const freshRecipe = recipeMap.get(item.recipe.id);

            if (!freshRecipe) {
                hasChanges = true;
                return;
            }

            if (freshRecipe.version !== item.recipe.version) {
                validPlannerItems.push({
                    ...item,
                    recipe: freshRecipe
                });
                hasChanges = true;
            } else {
                validPlannerItems.push(item);
            }
        });

        if (hasChanges) {
            this.savePlannerItems(validPlannerItems);
        }

        return validPlannerItems;
    }
}

export const storageService = new StorageService();
