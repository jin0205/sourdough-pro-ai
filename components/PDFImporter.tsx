
import React, { useState } from 'react';
import { parseRecipePdf } from '../services/geminiService';
import { SavedRecipe, Ingredient } from '../types';
import Spinner from './Spinner';
import { DocumentIcon } from './icons/DocumentIcon';

interface ExtractedData {
    name: string;
    numberOfLoaves: number;
    weightPerLoaf: number;
    ingredients: { name: string; weight: number }[];
}

const PDFImporter: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState<ExtractedData | null>(null);
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

    const handleExtract = async () => {
        if (!file) return;

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const jsonString = await parseRecipePdf(file);
            const data: ExtractedData = JSON.parse(jsonString);
            
            // Validate basic structure
            if (!data.ingredients || !Array.isArray(data.ingredients)) {
                throw new Error("Could not identify ingredients in the PDF.");
            }
            
            setPreviewData(data);
        } catch (err) {
            console.error(err);
            setError("Failed to extract recipe data. Please ensure the PDF is clear and readable.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof ExtractedData, value: string | number) => {
        if (!previewData) return;
        setPreviewData({ ...previewData, [field]: value });
    };

    const handleIngredientChange = (index: number, field: 'name' | 'weight', value: string | number) => {
        if (!previewData) return;
        const updatedIngs = [...previewData.ingredients];
        updatedIngs[index] = { ...updatedIngs[index], [field]: value };
        setPreviewData({ ...previewData, ingredients: updatedIngs });
    };

    const calculatePercentagesAndSave = () => {
        if (!previewData) return;

        // 1. Identify Total Flour Weight
        // Heuristic: Sum of ingredients containing "flour" in the name.
        // If no "flour" found, assume the largest ingredient is flour.
        let totalFlourWeight = 0;
        const flourIngredients = previewData.ingredients.filter(i => i.name.toLowerCase().includes('flour'));
        
        if (flourIngredients.length > 0) {
            totalFlourWeight = flourIngredients.reduce((sum, i) => sum + Number(i.weight), 0);
        } else {
            // Fallback: Max weight ingredient
            totalFlourWeight = Math.max(...previewData.ingredients.map(i => Number(i.weight)));
        }

        if (totalFlourWeight <= 0) {
            alert("Could not determine Total Flour weight. Percentages may be incorrect.");
            totalFlourWeight = 1000; // Fallback to avoid division by zero
        }

        // 2. Map to Ingredient Interface with calculated percentage
        const finalIngredients: Ingredient[] = previewData.ingredients.map((ing, idx) => ({
            id: idx + 1,
            name: ing.name,
            percentage: parseFloat(((Number(ing.weight) / totalFlourWeight) * 100).toFixed(1)),
            // costPerKg, inventoryId left undefined for now
        }));

        // 3. Construct SavedRecipe
        // Attempt to identify Base Flour name for the snapshot
        const baseFlourName = flourIngredients.length > 0 ? flourIngredients[0].name : "Bread Flour";

        const newRecipe: SavedRecipe = {
            id: Date.now().toString(),
            name: previewData.name || "Imported PDF Recipe",
            numberOfLoaves: Number(previewData.numberOfLoaves) || 1,
            weightPerLoaf: Number(previewData.weightPerLoaf) || 1000,
            ingredients: finalIngredients,
            date: new Date().toLocaleDateString(),
            version: 1,
            history: [],
            baseFlourName: baseFlourName
        };

        // 4. Save to LocalStorage
        try {
            const existingStr = localStorage.getItem('sourdough_recipes');
            const existing: SavedRecipe[] = existingStr ? JSON.parse(existingStr) : [];
            const updated = [...existing, newRecipe];
            localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
            setSuccessMessage("Recipe saved successfully! Check the Recipe Management tab.");
            setPreviewData(null);
            setFile(null);
        } catch (e) {
            console.error("Save failed", e);
            setError("Failed to save recipe to local storage.");
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
                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                {successMessage && <p className="mt-4 text-sm text-green-600 font-medium">{successMessage}</p>}
            </div>

            {/* Preview & Confirm Area */}
            {previewData && (
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center">
                        <h3 className="font-bold text-stone-800">Recipe Preview</h3>
                        <span className="text-xs text-stone-500 bg-white px-2 py-1 rounded border">Verify data before saving</span>
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
                                            <th className="px-4 py-2 text-left text-xs font-medium text-stone-500 uppercase">Ingredient</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-stone-500 uppercase">Weight (g)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200 bg-white">
                                        {previewData.ingredients.map((ing, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2">
                                                    <input 
                                                        type="text" 
                                                        value={ing.name}
                                                        onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                                                        className="w-full text-sm border-0 border-b border-transparent focus:border-amber-500 focus:ring-0 p-0"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <input 
                                                        type="number" 
                                                        value={ing.weight}
                                                        onChange={(e) => handleIngredientChange(idx, 'weight', parseFloat(e.target.value))}
                                                        className="w-24 text-right text-sm border-0 border-b border-transparent focus:border-amber-500 focus:ring-0 p-0"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
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
                                className="px-6 py-2 bg-stone-800 text-white rounded-md text-sm font-medium hover:bg-stone-900 shadow-sm"
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
