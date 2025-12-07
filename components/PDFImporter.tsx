
import React, { useState, useMemo } from 'react';
import { parseRecipePdf } from '../services/geminiService';
import { SavedRecipe, Ingredient } from '../types';
import Spinner from './Spinner';
import { DocumentIcon } from './icons/DocumentIcon';
import { storageService } from '../services/storageService';

interface ExtractedData {
    name: string;
    numberOfLoaves: number;
    weightPerLoaf: number;
    ingredients: { name: string; weight: number }[];
    instructions?: string;
}

interface PreviewIngredient {
    name: string;
    weight: number;
    isFlour: boolean;
}

interface PreviewState {
    name: string;
    numberOfLoaves: number;
    weightPerLoaf: number;
    ingredients: PreviewIngredient[];
    instructions: string;
}

const FLOUR_KEYWORDS = [
    'flour', 'wheat', 'rye', 'spelt', 'semolina', 'durum', 
    'einkorn', 'emmer', 'kamut', 'strong', 'bread', 'all-purpose', 
    'plain', 'wholemeal', 't55', 't65', 't45', 't80', 't110', 't150',
    'manitoba', '00 flour'
];

// Keywords that suggest an ingredient is NOT base flour, even if it contains a flour keyword
const EXCLUSION_KEYWORDS = [
    'levain', 'starter', 'dusting', 'rice flour', 'discard', 'preferment'
];

const PDFImporter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState<PreviewState | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Please upload a valid PDF file.');
                return;
            }
            setFile(selectedFile);
            setError('');
            setPreviewData(null);
            setSuccessMessage('');
        }
    };

    const isLikelyFlour = (name: string): boolean => {
        const lowerName = name.toLowerCase();
        // Must contain a flour keyword
        const hasFlourKeyword = FLOUR_KEYWORDS.some(k => lowerName.includes(k));
        // Must NOT contain an exclusion keyword
        const isExcluded = EXCLUSION_KEYWORDS.some(k => lowerName.includes(k));
        
        return hasFlourKeyword && !isExcluded;
    };

    const handleExtract = async () => {
        if (!file) return;

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const jsonString = await parseRecipePdf(file);
            let data: ExtractedData;

            try {
                data = JSON.parse(jsonString);
            } catch (jsonErr) {
                throw new Error("Could not interpret the document structure.");
            }
            
            // Validate basic structure
            if (!data || !data.ingredients || !Array.isArray(data.ingredients) || data.ingredients.length === 0) {
                throw new Error("No identifiable ingredients found.");
            }

            // Check for valid weights (common failure point with complex PDFs or unscannable text)
            const hasValidWeights = data.ingredients.some(i => i.weight && !isNaN(Number(i.weight)) && Number(i.weight) > 0);
            if (!hasValidWeights) {
                 throw new Error("Ingredients were found but weights could not be determined.");
            }
            
            // Apply Heuristic to mark flours
            const processedIngredients: PreviewIngredient[] = data.ingredients.map(ing => ({
                name: ing.name,
                weight: Number(ing.weight) || 0, // Fallback to 0 if NaN, though validated above
                isFlour: isLikelyFlour(ing.name)
            }));

            // If no flours detected, default to largest ingredient or check all if simple list
            const hasFlour = processedIngredients.some(i => i.isFlour);
            if (!hasFlour && processedIngredients.length > 0) {
                 // Fallback: Assume the heaviest ingredient is the flour base
                 const maxWeight = Math.max(...processedIngredients.map(i => i.weight));
                 const heaviest = processedIngredients.find(i => i.weight === maxWeight);
                 if (heaviest) heaviest.isFlour = true;
            }

            setPreviewData({
                name: data.name || "Imported Recipe",
                numberOfLoaves: Number(data.numberOfLoaves) || 1,
                weightPerLoaf: Number(data.weightPerLoaf) || 1000,
                ingredients: processedIngredients,
                instructions: data.instructions || ""
            });
        } catch (err: any) {
            console.error(err);
            const specificMessage = err.message || "Failed to extract recipe data.";
            setError(`${specificMessage} Tips: Ensure the ingredient list is clear, legible, and units (g, kg, oz, cups) are specified.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof PreviewState, value: string | number) => {
        if (!previewData) return;
        setPreviewData({ ...previewData, [field]: value });
    };

    const handleIngredientChange = (index: number, field: keyof PreviewIngredient, value: string | number | boolean) => {
        if (!previewData) return;
        const updatedIngs = [...previewData.ingredients];
        updatedIngs[index] = { ...updatedIngs[index], [field]: value };
        setPreviewData({ ...previewData, ingredients: updatedIngs });
    };

    const totalFlourWeight = useMemo(() => {
        if (!previewData) return 0;
        return previewData.ingredients.reduce((sum, ing) => ing.isFlour ? sum + (Number(ing.weight) || 0) : sum, 0);
    }, [previewData]);

    const calculatePercentagesAndSave = () => {
        if (!previewData) return;

        if (totalFlourWeight <= 0) {
            alert("Total Flour Weight is 0. Please select at least one ingredient in the 'Flour?' column to act as the 100% base.");
            return;
        }

        // 2. Map to Ingredient Interface with calculated percentage
        const finalIngredients: Ingredient[] = previewData.ingredients.map((ing, idx) => ({
            id: idx + 1,
            name: ing.name,
            percentage: parseFloat(((Number(ing.weight) / totalFlourWeight) * 100).toFixed(1)),
        }));

        // 3. Construct SavedRecipe
        // Base Flour Name is the first marked flour, or generic
        const firstFlour = previewData.ingredients.find(i => i.isFlour);
        const baseFlourName = firstFlour ? firstFlour.name : "Bread Flour";

        const newRecipe: SavedRecipe = {
            id: Date.now().toString(),
            name: previewData.name || "Imported PDF Recipe",
            numberOfLoaves: Number(previewData.numberOfLoaves) || 1,
            weightPerLoaf: Number(previewData.weightPerLoaf) || 1000,
            ingredients: finalIngredients,
            date: new Date().toLocaleDateString(),
            version: 1,
            history: [],
            baseFlourName: baseFlourName,
            instructions: previewData.instructions // Added instructions
        };

        // 4. Save to Storage Service
        try {
            storageService.addOrUpdateRecipe(newRecipe);
            setSuccessMessage("Recipe saved successfully! Check the Recipe Management tab.");
            setPreviewData(null);
            setFile(null);
        } catch (e) {
            console.error("Save failed", e);
            setError("Failed to save recipe to storage.");
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">PDF Recipe Importer</h2>
            <p className="text-stone-600 mb-6">Upload a digital recipe card or sheet (PDF). AI will extract the ingredients, convert units to grams, and calculate Baker's Percentages automatically.</p>

            {/* Upload Area */}
            <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-amber-500 transition-colors mb-8">
                <DocumentIcon className="mx-auto h-12 w-12 text-stone-400 mb-3" />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                     <span className="block text-sm font-medium text-stone-600 mb-1">
                        {file ? file.name : 'Click to select a PDF file'}
                     </span>
                     <span className="text-xs text-stone-400">Supported format: .pdf</span>
                    <input 
                        id="pdf-upload" 
                        type="file" 
                        accept="application/pdf" 
                        className="sr-only" 
                        onChange={handleFileChange} 
                    />
                </label>
                {file && !isLoading && !previewData && (
                    <button
                        onClick={handleExtract}
                        className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
                    >
                        Extract Recipe
                    </button>
                )}
                {isLoading && (
                    <div className="mt-4 flex justify-center items-center text-amber-600 text-sm">
                        <Spinner />
                        <span className="ml-2">Reading PDF...</span>
                    </div>
                )}
                {error && <p className="mt-4 text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">{error}</p>}
                {successMessage && <p className="mt-4 text-sm text-green-600 font-medium">{successMessage}</p>}
            </div>

            {/* Preview & Confirm Area */}
            {previewData && (
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <h3 className="font-bold text-stone-800">Recipe Preview</h3>
                            <p className="text-xs text-stone-500">Verify ingredients and select which ones count as Flour Base.</p>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-stone-500 uppercase tracking-wide">Total Flour Base</div>
                             <div className={`font-bold text-lg ${totalFlourWeight === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                 {totalFlourWeight.toFixed(0)} g
                             </div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Recipe Name</label>
                                <input 
                                    type="text" 
                                    value={previewData.name} 
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="block w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Yield (Loaves)</label>
                                <input 
                                    type="number" 
                                    value={previewData.numberOfLoaves} 
                                    onChange={(e) => handleInputChange('numberOfLoaves', parseFloat(e.target.value))}
                                    className="block w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Weight / Loaf (g)</label>
                                <input 
                                    type="number" 
                                    value={previewData.weightPerLoaf} 
                                    onChange={(e) => handleInputChange('weightPerLoaf', parseFloat(e.target.value))}
                                    className="block w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-medium text-stone-500 mb-2">Ingredients (Weights Normalized to Grams)</label>
                             <div className="border border-stone-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-stone-200">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase w-12 text-center">Flour?</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Ingredient</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase">Weight (g)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200 bg-white">
                                        {previewData.ingredients.map((ing, idx) => (
                                            <tr key={idx} className={ing.isFlour ? 'bg-amber-50' : ''}>
                                                <td className="px-4 py-2 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        checked={ing.isFlour}
                                                        onChange={(e) => handleIngredientChange(idx, 'isFlour', e.target.checked)}
                                                        className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-stone-300 rounded cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="text" 
                                                        value={ing.name}
                                                        onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                                                        className={`w-full text-sm border-0 border-b border-transparent focus:border-amber-500 focus:ring-0 p-0 bg-transparent ${ing.isFlour ? 'font-medium text-stone-900' : 'text-stone-600'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <input 
                                                        type="number" 
                                                        value={ing.weight}
                                                        onChange={(e) => handleIngredientChange(idx, 'weight', parseFloat(e.target.value))}
                                                        className="w-24 text-right text-sm border-0 border-b border-transparent focus:border-amber-500 focus:ring-0 p-0 bg-transparent"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                             {totalFlourWeight === 0 && (
                                 <p className="text-xs text-red-500 mt-2 font-medium">
                                     * Warning: No flour selected. Baker's percentages cannot be calculated without a Flour Base.
                                 </p>
                             )}
                        </div>

                        {/* Instructions Section */}
                        <div>
                             <label className="block text-xs font-medium text-stone-500 mb-1">Extracted Method & Notes</label>
                             <textarea
                                value={previewData.instructions}
                                onChange={(e) => handleInputChange('instructions', e.target.value)}
                                className="block w-full px-3 py-2 border border-stone-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 h-32"
                                placeholder="Extracted instructions will appear here..."
                             />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setPreviewData(null)}
                                className="mr-4 px-4 py-2 bg-white text-stone-600 border border-stone-300 rounded-md text-sm font-medium hover:bg-stone-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={calculatePercentagesAndSave}
                                disabled={totalFlourWeight <= 0}
                                className="px-6 py-2 bg-stone-800 text-white rounded-md text-sm font-medium hover:bg-stone-900 shadow-sm disabled:bg-stone-400 disabled:cursor-not-allowed"
                            >
                                Confirm & Save Recipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFImporter;
