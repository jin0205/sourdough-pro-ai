
import React, { useState } from 'react';
import ImageAnalyzer from './ImageAnalyzer';
import BakersAssistant from './BakersAssistant';
import RecipeLab from './RecipeLab';
import PDFImporter from './PDFImporter';
import { CameraIcon } from './icons/CameraIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LabIcon } from './icons/LabIcon';
import { DocumentIcon } from './icons/DocumentIcon';

type LabTab = 'assistant' | 'analyzer' | 'science' | 'pdf';

const BakingLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('assistant');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800 mb-1">Baking Lab</h2>
        <p className="text-stone-600">Your AI-powered research and development center.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sub-navigation Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 bg-white p-2 rounded-lg border border-stone-200 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'assistant'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <SparklesIcon className={`mr-3 h-5 w-5 ${activeTab === 'assistant' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Baker's Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'analyzer'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <CameraIcon className={`mr-3 h-5 w-5 ${activeTab === 'analyzer' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Crumb Analyzer</span>
            </button>

            <button
              onClick={() => setActiveTab('science')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'science'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <LabIcon className={`mr-3 h-5 w-5 ${activeTab === 'science' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">Dev & Fermentation</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'pdf'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <DocumentIcon className={`mr-3 h-5 w-5 ${activeTab === 'pdf' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">PDF Importer</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
           <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 min-h-[600px]">
             {activeTab === 'assistant' && (
               <div className="animate-fade-in">
                 <BakersAssistant />
               </div>
             )}
             {activeTab === 'analyzer' && (
               <div className="animate-fade-in">
                 <ImageAnalyzer />
               </div>
             )}
             {activeTab === 'science' && (
               <div className="animate-fade-in">
                 <RecipeLab />
               </div>
             )}
             {activeTab === 'pdf' && (
               <div className="animate-fade-in">
                 <PDFImporter />
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default BakingLab;
