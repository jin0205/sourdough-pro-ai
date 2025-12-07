
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;
  costPerKg?: number;
  inventoryId?: string;
  // Optional weight override for UI state tracking before calc
  weight?: number; 
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface GeminiGroundedResponse {
  text: string;
  metadata?: GroundingMetadata;
}

export interface RecipeSnapshot {
  numberOfLoaves: number;
  weightPerLoaf: number;
  
  // New: Dedicated array for flour blend
  flours: Ingredient[]; 
  
  // Non-flour ingredients (Water, Salt, Yeast, etc.)
  ingredients: Ingredient[];
  
  date: string;
  version: number;

  // Deprecated but kept for type compatibility during migration if needed
  baseFlourName?: string;
  baseFlourInventoryId?: string;
  baseFlourCostPerKg?: number;
}

export interface SavedRecipe extends RecipeSnapshot {
  id: string;
  name: string;
  history: RecipeSnapshot[];
}

export interface PlannerItem {
  uniqueId: string;
  recipe: SavedRecipe;
  count: number;
}

export type UnitOfMeasure = 'g' | 'kg' | 'lb' | 'oz';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number; // stored in grams
  costPerKg?: number; // derived or manual
  lastUpdated: string;
  
  // Packaging Details for easy conversion/editing
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}
