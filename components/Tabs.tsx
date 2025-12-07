import React, { useState } from 'react';

interface TabsProps {
    tabs: string[];
    children: React.ReactNode[];
}

const Tabs: React.FC<TabsProps> = ({ tabs, children }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div>
            <div className="border-b border-stone-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(index)}
                            className={`${
                                activeTab === index
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="animate-fade-in">
                {children[activeTab]}
            </div>
        </div>
    );
};

export default Tabs;
