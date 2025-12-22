
import React, { useState, useEffect } from 'react';

const DENSITIES: Record<string, number> = {
  'Flour (AP/Bread)': 120, // g per cup
  'Whole Wheat Flour': 125,
  'Rye Flour': 105,
  'Water': 236.6,
  'Milk': 245,
  'Sugar (Granulated)': 200,
  'Brown Sugar (Packed)': 210,
  'Butter': 227,
  'Honey/Molasses': 340,
  'Salt (Fine)': 270, // 1 cup is a lot of salt! But used for density reference
  'Yeast (Instant)': 150,
};

const MeasurementConverter: React.FC = () => {
  // Volume to Weight
  const [volAmount, setVolAmount] = useState<string>('1');
  const [volUnit, setVolUnit] = useState<'cup' | 'tbsp' | 'tsp'>('cup');
  const [volIngredient, setVolIngredient] = useState<string>('Flour (AP/Bread)');
  const [volResult, setVolResult] = useState<number>(120);

  // Mass to Mass
  const [massAmount, setMassAmount] = useState<string>('1');
  const [massFrom, setMassFrom] = useState<'lb' | 'oz' | 'g' | 'kg'>('lb');
  const [massResult, setMassResult] = useState<number>(453.6);

  // Temperature
  const [tempAmount, setTempAmount] = useState<string>('24');
  const [tempFrom, setTempFrom] = useState<'C' | 'F'>('C');
  const [tempResult, setTempResult] = useState<number>(75.2);

  // Vol to Weight Logic
  useEffect(() => {
    const amount = parseFloat(volAmount) || 0;
    const density = DENSITIES[volIngredient] || 120;
    let factor = 1;
    if (volUnit === 'tbsp') factor = 1 / 16;
    if (volUnit === 'tsp') factor = 1 / 48;
    setVolResult(amount * density * factor);
  }, [volAmount, volUnit, volIngredient]);

  // Mass Logic
  useEffect(() => {
    const amount = parseFloat(massAmount) || 0;
    let grams = 0;
    if (massFrom === 'lb') grams = amount * 453.592;
    else if (massFrom === 'oz') grams = amount * 28.3495;
    else if (massFrom === 'kg') grams = amount * 1000;
    else grams = amount;
    setMassResult(grams);
  }, [massAmount, massFrom]);

  // Temp Logic
  useEffect(() => {
    const amount = parseFloat(tempAmount) || 0;
    if (tempFrom === 'C') {
      setTempResult((amount * 9/5) + 32);
    } else {
      setTempResult((amount - 32) * 5/9);
    }
  }, [tempAmount, tempFrom]);

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">Measurement Converter</h2>
      <p className="text-stone-600 dark:text-stone-400 mb-6 italic text-sm">A quick utility for precision baking across different unit systems.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Volume to Weight */}
        <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-xl border border-stone-200 dark:border-stone-700">
          <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider mb-4">Volume to Grams</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={volAmount}
                onChange={(e) => setVolAmount(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              />
              <select
                value={volUnit}
                onChange={(e) => setVolUnit(e.target.value as any)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              >
                <option value="cup">Cups</option>
                <option value="tbsp">Tbsp</option>
                <option value="tsp">Tsp</option>
              </select>
            </div>
            <select
              value={volIngredient}
              onChange={(e) => setVolIngredient(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
            >
              {Object.keys(DENSITIES).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="pt-4 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center">
              <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">Result</span>
              <span className="text-2xl font-bold text-amber-600">{volResult.toFixed(1)} g</span>
            </div>
          </div>
        </div>

        {/* Mass Converter */}
        <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-xl border border-stone-200 dark:border-stone-700">
          <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider mb-4">Mass Normalizer</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={massAmount}
                onChange={(e) => setMassAmount(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              />
              <select
                value={massFrom}
                onChange={(e) => setMassFrom(e.target.value as any)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              >
                <option value="lb">lb</option>
                <option value="oz">oz</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
            <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">Grams</span>
                <span className="text-xl font-bold text-stone-800 dark:text-stone-100">{massResult.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase">Kilograms</span>
                <span className="text-xl font-bold text-stone-800 dark:text-stone-100">{(massResult / 1000).toFixed(3)} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Converter */}
        <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-xl border border-stone-200 dark:border-stone-700 md:col-span-2">
          <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider mb-4">Temperature Converter</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex gap-2 w-full sm:w-1/2">
               <input
                type="number"
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                className="flex-grow bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              />
              <select
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value as any)}
                className="w-24 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-md p-2 text-sm text-stone-900 dark:text-stone-100"
              >
                <option value="C">°C</option>
                <option value="F">°F</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-stone-400">
              <span className="text-2xl">&rarr;</span>
            </div>
            <div className="w-full sm:w-1/2 bg-white dark:bg-stone-900 rounded-md p-2 border border-stone-300 dark:border-stone-600 text-center font-bold text-2xl text-amber-600">
              {tempResult.toFixed(1)} °{tempFrom === 'C' ? 'F' : 'C'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MeasurementConverter;
