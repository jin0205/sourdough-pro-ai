
import React, { useState } from 'react';
import Header from './components/Header';
import AppTabs from './components/AppTabs';
import RecipeManagement from './components/RecipeManagement';
import BakingLab from './components/BakingLab';
import BatchPlanner from './components/BatchPlanner';
import InventoryManagement from './components/InventoryManagement';
import CostAnalysis from './components/CostAnalysis';

type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('management');

  const renderContent = () => {
    switch (activeTab) {
      case 'management':
        return <RecipeManagement />;
      case 'planner':
        return <BatchPlanner />;
      case 'inventory':
        return <InventoryManagement />;
      case 'cost':
        return <CostAnalysis />;
      case 'lab':
        return <BakingLab />;
      default:
        return <RecipeManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <AppTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6 md:p-10">
            {renderContent()}
          </div>
        </div>
        <footer className="text-center text-stone-500 mt-8 text-sm">
          <p>&copy; {new Date().getFullYear()} Sourdough Pro AI. Elevate your baking.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
