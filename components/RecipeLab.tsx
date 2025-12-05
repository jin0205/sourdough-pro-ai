
import React, { useState } from 'react';
import { getComplexResponse } from '../services/geminiService';
import Spinner from './Spinner';

type LabMode = 'developer' | 'fermentation';

const RecipeLab: React.FC = () => {
    const [mode, setMode] = useState<LabMode>('developer');
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Developer Mode State
    const [query, setQuery] = useState<string>('');

    // Fermentation Mode State
    const [temp, setTemp] = useState<string>('24');
    const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
    const [hydration, setHydration] = useState<string>('75');
    const [levain, setLevain] = useState<string>('20');
    const [humidity, setHumidity] = useState<string>('50');
    const [pressure, setPressure] = useState<string>('1013'); // hPa default

    const handleDeveloperSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setResponse('');
        const result = await getComplexResponse(query);
        setResponse(result);
        setIsLoading(false);
    };

    const handleFermentationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!temp || !hydration || !levain) return;

        setIsLoading(true);
        setResponse('');

        const prompt = `Act as a master sourdough fermentation expert. Perform a predictive analysis for a dough with the following parameters:
        
        - Ambient/Dough Temperature: ${temp}°${tempUnit}
        - Hydration: ${hydration}%
        - Levain Inoculation: ${levain}% (Baker's Percentage)
        - Relative Humidity: ${humidity}%
        - Atmospheric Pressure: ${pressure} hPa

        Please provide a detailed Fermentation Model including:
        1. **Estimated Duration:** A predicted time range for bulk fermentation to reach optimal structure/rise.
        2. **Progression Timeline:** A step-by-step chronological breakdown (e.g., Hour 1, Hour 2...) describing the biological activity (yeast vs. bacteria balance), pH changes, and physical dough changes.
        3. **Environmental Impact:** Analyze how the specific Humidity and Pressure values provided will affect:
           - **Dough Temperature Fluctuations:** How ambient air might heat or cool the dough over time (evaporative cooling vs heat retention).
           - **Skin Formation:** Risk of crusting based on humidity.
           - **Gas Retention:** How atmospheric pressure influences bubble expansion.
        4. **The "Sweet Spot":** Precise visual and tactile cues that indicate the exact moment to end bulk fermentation and shape (e.g., % rise, jiggle, bubble structure).
        5. **Risk Factors:** Specific warnings based on these variables (e.g., if temp is high -> proteolytic degradation; if hydration is high -> structure collapse).
        
        Use thinking steps to calculate the metabolic rate based on the temperature and inoculation.`;

        const result = await getComplexResponse(prompt);
        setResponse(result);
        setIsLoading(false);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-800">Recipe Lab</h2>
                    <p className="text-stone-600">Advanced AI tools for recipe development and science.</p>
                </div>
                <div className="bg-stone-200 p-1 rounded-lg inline-flex whitespace-nowrap">
                    <button
                        onClick={() => { setMode('developer'); setResponse(''); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            mode === 'developer'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        Recipe Developer
                    </button>
                    <button
                        onClick={() => { setMode('fermentation'); setResponse(''); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            mode === 'fermentation'
                                ? 'bg-white text-stone-800 shadow-sm'
                                : 'text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        Fermentation Engine
                    </button>
                </div>
            </div>

            {mode === 'developer' ? (
                <div className="animate-fade-in">
                     <p className="text-stone-600 mb-6">Challenge the AI with your most complex baking ideas. Leverage maximum "thinking" power to develop novel recipes, optimize production schedules, or formulate a business plan.</p>
                    <form onSubmit={handleDeveloperSubmit} className="flex gap-4 mb-6">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., Develop a sourdough croissant recipe using spelt flour..."
                            className="flex-grow block w-full px-3 py-2 bg-white border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-stone-800 hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-700 disabled:bg-stone-400"
                        >
                            {isLoading ? <Spinner /> : 'Develop'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <p className="text-stone-600 mb-6">Model your fermentation kinetics. Input your environmental variables to predict fermentation time and optimal shaping windows.</p>
                    <form onSubmit={handleFermentationSubmit} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Dough Temperature</label>
                                <div className="flex">
                                    <input
                                        type="number"
                                        value={temp}
                                        onChange={(e) => setTemp(e.target.value)}
                                        className="block w-full px-3 py-2 bg-white border border-r-0 border-stone-300 rounded-l-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                        placeholder="24"
                                    />
                                    <select
                                        value={tempUnit}
                                        onChange={(e) => setTempUnit(e.target.value as 'C' | 'F')}
                                        className="inline-flex items-center px-3 py-2 border border-l-0 border-stone-300 bg-stone-50 text-stone-500 sm:text-sm rounded-r-md focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="C">°C</option>
                                        <option value="F">°F</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Hydration</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={hydration}
                                        onChange={(e) => setHydration(e.target.value)}
                                        className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 rounded-md py-2 px-3"
                                        placeholder="75"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-stone-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Levain Percentage</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={levain}
                                        onChange={(e) => setLevain(e.target.value)}
                                        className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 rounded-md py-2 px-3"
                                        placeholder="20"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-stone-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Relative Humidity</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={humidity}
                                        onChange={(e) => setHumidity(e.target.value)}
                                        className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 rounded-md py-2 px-3"
                                        placeholder="50"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-stone-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-700 mb-1">Pressure (hPa)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={pressure}
                                        onChange={(e) => setPressure(e.target.value)}
                                        className="focus:ring-amber-500 focus:border-amber-500 block w-full pr-10 sm:text-sm border-stone-300 rounded-md py-2 px-3"
                                        placeholder="1013"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isLoading || !temp || !hydration || !levain}
                                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-stone-800 hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-700 disabled:bg-stone-400"
                            >
                                {isLoading ? <Spinner /> : 'Simulate Fermentation'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-stone-900 text-stone-100 p-6 rounded-lg font-mono text-sm min-h-[200px] whitespace-pre-wrap overflow-x-auto shadow-inner">
                {isLoading && (
                    <div className="flex items-center justify-center h-full py-12">
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-2 text-stone-300">
                                {mode === 'developer' 
                                    ? 'Engaging deep thought process...' 
                                    : 'Modeling biological activity...'}
                            </p>
                        </div>
                    </div>
                )}
                {!isLoading && !response && (
                    <div className="text-stone-500 text-center py-12 italic">
                        {mode === 'developer' 
                            ? 'Enter a prompt above to generate a recipe or plan.' 
                            : 'Input parameters above to model fermentation.'}
                    </div>
                )}
                {response && (
                    <div className="animate-fade-in">
                        {response}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeLab;
