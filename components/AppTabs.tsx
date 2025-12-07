
import React from 'react';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { LabIcon } from './icons/LabIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { BoxIcon } from './icons/BoxIcon';

type Tab = 'management' | 'planner' | 'inventory' | 'cost' | 'lab';

interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabsConfig = [
  { id: 'management', name: 'Recipe Management', icon: CalculatorIcon },
  { id: 'planner', name: 'Batch Planner', icon: ClipboardIcon },
  { id: 'inventory', name: 'Inventory Management', icon: BoxIcon },
  { id: 'cost', name: 'Cost Analysis', icon: (props: any) => <span className="font-bold text-lg leading-none mr-2">$</span> },
  { id: 'lab', name: 'Baking Lab', icon: LabIcon },
];

const AppTabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-stone-200">
      <nav className="-mb-px flex space-x-1 sm:space-x-4 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Tabs">
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            } group inline-flex items-center py-4 px-1 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap focus:outline-none transition-colors duration-200`}
          >
            {typeof tab.icon === 'function' ? (
                <tab.icon className={`${activeTab === tab.id ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-500'} -ml-0.5 mr-2 h-5 w-5`} />
            ) : null}
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AppTabs;
