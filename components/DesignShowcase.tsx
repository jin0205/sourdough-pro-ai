
import React, { useState } from 'react';
// Added missing import for SparklesIcon
import { SparklesIcon } from './icons/SparklesIcon';

type LayoutTheme = 'artisan' | 'scientific' | 'minimalist' | 'command' | 'executive';

const DesignShowcase: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<LayoutTheme>('artisan');

  const themes = {
    artisan: {
      name: "Modular Hearth",
      desc: "Warm tones, organic rounded corners, and card-focused efficiency. Designed for home-to-professional micro-bakeries.",
      colors: ["#78350f", "#fef3c7", "#f59e0b"],
      alignment: "Card Grid",
      tag: "Professional & Friendly"
    },
    scientific: {
      name: "Data Lab",
      desc: "High-precision greys with indigo highlights. Prioritizes charts, fermentation curves, and metabolic metrics.",
      colors: ["#1e1b4b", "#e0e7ff", "#4f46e5"],
      alignment: "Split Dashboard",
      tag: "R&D Focused"
    },
    minimalist: {
      name: "Flour & Stone",
      desc: "Aggressive use of whitespace, thin borders, and serif typography. Pure focus on the formula.",
      colors: ["#000000", "#ffffff", "#71717a"],
      alignment: "Single Column",
      tag: "Clean & Elegant"
    },
    command: {
      name: "Midnight Mill",
      desc: "Dark-first interface with neon amber accents. High density for fast-paced professional production environments.",
      colors: ["#09090b", "#18181b", "#d97706"],
      alignment: "Console/Table Heavy",
      tag: "High Volume"
    },
    executive: {
      name: "Executive Crust",
      desc: "Traditional business dashboard feel. Puts cost-analysis and inventory front and center with sidebar navigation.",
      colors: ["#0f172a", "#f1f5f9", "#334155"],
      alignment: "Classic Sidebar",
      tag: "Business Optimization"
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">Design Themes Showcase</h2>
        <p className="text-stone-600 dark:text-stone-400">
          Preview potential interface evolutions for Sourdough Pro AI. These designs are concepts to enhance specific baking workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(themes).map(([key, data]) => (
          <button
            key={key}
            onClick={() => setActiveTheme(key as LayoutTheme)}
            className={`p-4 rounded-xl border transition-all text-left ${
              activeTheme === key 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md ring-2 ring-indigo-500 ring-opacity-20' 
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700'
            }`}
          >
            <div className="flex gap-1 mb-2">
               {data.colors.map(c => <div key={c} className="w-4 h-4 rounded-full border border-stone-200 dark:border-stone-700" style={{backgroundColor: c}} />)}
            </div>
            <h3 className={`font-bold text-sm ${activeTheme === key ? 'text-indigo-700 dark:text-indigo-300' : 'text-stone-800 dark:text-stone-100'}`}>
              {data.name}
            </h3>
            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider">
              {data.tag}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-2xl p-8 min-h-[400px] flex flex-col md:flex-row items-center gap-10 transition-colors duration-500">
        <div className="flex-grow space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 mb-2">
             Concept Visualization
          </div>
          <h3 className="text-3xl font-bold text-stone-900 dark:text-stone-50">{themes[activeTheme].name}</h3>
          <p className="text-lg text-stone-600 dark:text-stone-400 max-w-xl">{themes[activeTheme].desc}</p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-800">
              <span className="block text-xs text-stone-400 uppercase font-bold tracking-widest mb-1">Navigation</span>
              <span className="text-stone-800 dark:text-stone-100 font-medium">{themes[activeTheme].alignment}</span>
            </div>
            <div className="bg-white dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-800">
              <span className="block text-xs text-stone-400 uppercase font-bold tracking-widest mb-1">Color Palette</span>
              <div className="flex gap-2">
                {themes[activeTheme].colors.map(c => <span key={c} className="text-[10px] font-mono text-stone-500 dark:text-stone-400">{c}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-full md:w-80 h-96 bg-stone-200 dark:bg-stone-950 rounded-xl relative overflow-hidden shadow-2xl border-4 border-stone-300 dark:border-stone-800 group">
           {/* Abstract Mockup Visualization based on theme */}
           <div className="absolute inset-0 p-4 flex flex-col gap-3">
              <div className="h-6 w-3/4 bg-stone-300 dark:bg-stone-800 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-4 w-12 bg-indigo-400/20 dark:bg-indigo-500/20 rounded border border-indigo-400/30" />
                <div className="h-4 w-12 bg-stone-300 dark:bg-stone-800 rounded" />
              </div>
              
              {activeTheme === 'artisan' && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white dark:bg-stone-900 rounded-lg shadow-sm border border-stone-100 dark:border-stone-800" />)}
                </div>
              )}
              {activeTheme === 'scientific' && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="h-32 w-full bg-stone-800 dark:bg-indigo-900/10 rounded-lg border border-indigo-500/20 relative">
                     <div className="absolute bottom-4 left-4 right-4 h-1 bg-indigo-500 rounded-full opacity-50" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[1,2,3].map(i => <div key={i} className="h-8 bg-stone-300 dark:bg-stone-800 rounded" />)}
                  </div>
                </div>
              )}
              {activeTheme === 'minimalist' && (
                <div className="mt-10 mx-auto w-4/5 flex flex-col gap-6">
                   <div className="h-1 bg-stone-800 dark:bg-white w-full opacity-10" />
                   <div className="h-40 bg-transparent border border-stone-300 dark:border-stone-800 w-full" />
                   <div className="h-1 bg-stone-800 dark:bg-white w-full opacity-10" />
                </div>
              )}
              {activeTheme === 'command' && (
                <div className="mt-4 bg-black p-2 rounded font-mono text-[8px] text-amber-500 h-64 overflow-hidden border border-amber-900/50">
                   {`$ system_load recipe_main
> levain: 200g [OK]
> water: 750g [WARNING: TEMP HIGH]
> salt: 20g [OK]
... processing production_log_v2.csv`}
                </div>
              )}
              {activeTheme === 'executive' && (
                <div className="mt-2 flex h-full">
                  <div className="w-12 border-r border-stone-300 dark:border-stone-800 h-full flex flex-col gap-2">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-4 w-8 bg-stone-300 dark:bg-stone-800 rounded mx-auto" />)}
                  </div>
                  <div className="flex-grow p-2 space-y-2">
                    <div className="h-12 w-full bg-white dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-800" />
                    <div className="h-32 w-full bg-white dark:bg-stone-900 rounded border border-stone-100 dark:border-stone-800" />
                  </div>
                </div>
              )}
           </div>
           
           <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 to-transparent pointer-events-none" />
           <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-white dark:bg-stone-800 text-[10px] px-2 py-1 rounded shadow-sm border border-stone-200 dark:border-stone-700 dark:text-stone-300">
                Preview Mode
              </span>
           </div>
        </div>
      </div>

      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-700 dark:text-indigo-400 text-sm flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Designer Note:</strong> These themes prioritize "Eye Comfort" in dark mode by using stone-based dark greys (Stone-900/950) rather than pure black, which prevents text bleeding and reduces pupil strain during long production shifts.
        </p>
      </div>
    </div>
  );
};

export default DesignShowcase;
