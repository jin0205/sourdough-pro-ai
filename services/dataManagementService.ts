import { storageService } from './storageService';

export interface BackupData {
    timestamp: string;
    recipes: any[];
    inventory: any[];
    planner: any[];
}

export const dataManagementService = {
    exportData: () => {
        const data: BackupData = {
            timestamp: new Date().toISOString(),
            recipes: storageService.getRecipes(),
            inventory: storageService.getInventory(),
            planner: storageService.getPlannerItems(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sourdough_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData: async (file: File): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const data = JSON.parse(content) as BackupData;

                    // Basic validation
                    if (!data.recipes || !Array.isArray(data.recipes)) {
                        throw new Error('Invalid backup file: Missing recipes data');
                    }

                    // We use storageService to save so it handles keys and events
                    // However, storageService currently saves *one* type at a time and triggers event.
                    // We might want to do it manually to avoid 3 separate events or just reuse them.
                    // Reusing them is safer for consistency.

                    storageService.saveRecipes(data.recipes);
                    storageService.saveInventory(data.inventory || []);
                    storageService.savePlannerItems(data.planner || []);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
};
