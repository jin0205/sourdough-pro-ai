
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
              Sourdough <span className="text-amber-600">Pro AI</span>
            </h1>
            <p className="hidden md:block text-stone-500">Your AI-Powered Baking Partner</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
