
import React, { useState } from 'react';
import DataSettings from './DataSettings';

const Header: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                Sourdough <span className="text-amber-600">Pro AI</span>
              </h1>

              <div className="flex items-center gap-4">
                <p className="hidden md:block text-stone-500">Your AI-Powered Baking Partner</p>

                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                  title="Data Settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
          </div>
        </div>
      </header>

      {showSettings && <DataSettings onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default Header;
