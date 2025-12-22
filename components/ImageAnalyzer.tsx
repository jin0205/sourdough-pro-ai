
import React, { useState } from 'react';
import { analyzeImage } from '../services/geminiService';
import Spinner from './Spinner';
import { CameraIcon } from './icons/CameraIcon';

const ImageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setAnalysis('');
      setError('');
    }
  };

  const handleAnalyzeClick = async () => {
    if (!image) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setAnalysis('');
    setError('');
    const prompt = "You are a master baker specializing in sourdough. Analyze this image of a sourdough loaf's crumb. Provide a detailed analysis covering the following points in a professional but encouraging tone: \n1. Openness of the crumb (e.g., tight, irregular, lacy). \n2. Cell structure (e.g., uniform, large holes, tunnels). \n3. Signs of fermentation (e.g., well-fermented, under-proofed, over-proofed). \n4. Potential improvements for the baker. Use markdown for formatting.";
    const result = await analyzeImage(image, prompt);
    setAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">Sourdough Crumb Analyzer</h2>
      <p className="text-stone-600 dark:text-stone-400 mb-6">Upload a photo of your crumb for an expert AI analysis. Get feedback on fermentation, structure, and tips for your next bake.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label htmlFor="file-upload" className="cursor-pointer block w-full p-6 border-2 border-stone-300 dark:border-stone-700 border-dashed rounded-lg text-center hover:border-amber-500 bg-stone-50 dark:bg-stone-900 transition-colors">
             <CameraIcon className="mx-auto h-12 w-12 text-stone-400 dark:text-stone-500" />
            <span className="mt-2 block text-sm font-medium text-stone-600 dark:text-stone-300">
              {preview ? 'Change Image' : 'Click to upload an image'}
            </span>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
          </label>
          
          {preview && (
            <div className="w-full aspect-square rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm">
                <img src={preview} alt="Sourdough crumb preview" className="w-full h-full object-cover" />
            </div>
          )}

          <button
            onClick={handleAnalyzeClick}
            disabled={!image || isLoading}
            className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:cursor-not-allowed"
          >
            {isLoading ? <Spinner /> : 'Analyze My Crumb'}
          </button>
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        </div>

        <div className="bg-stone-50 dark:bg-stone-800/50 p-6 rounded-lg border border-stone-200 dark:border-stone-700 min-h-[300px] transition-colors">
          <h3 className="font-semibold text-lg text-stone-800 dark:text-stone-100 mb-4">Analysis Results</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                 <Spinner />
                 <p className="mt-2 text-stone-500 dark:text-stone-400">Analyzing your masterpiece...</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-stone dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;
