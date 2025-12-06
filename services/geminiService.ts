
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiGroundedResponse, GroundingChunk, AppError, ErrorCode } from '../types';

// Use Vite's import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY environment variable is not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });

const checkApiKey = () => {
    if (!apiKey) {
        throw new AppError(ErrorCode.MISSING_API_KEY, "API Key is missing. Please set VITE_GEMINI_API_KEY in .env.local.");
    }
}

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; }; }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

const handleGeminiError = (error: any) => {
    if (error instanceof AppError) {
        throw error;
    }
    console.error("Gemini API Error:", error);
    // Basic heuristic to detect network issues
    if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new AppError(ErrorCode.NETWORK_ERROR, "Network error. Please check your internet connection.");
    }
    throw new AppError(ErrorCode.UNKNOWN_ERROR, "An unexpected error occurred with the AI service.");
}

export const analyzeImage = async (imageFile: File, prompt: string): Promise<string> => {
  checkApiKey();
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text || "No analysis available.";
  } catch (error) {
    handleGeminiError(error);
    return ""; // Unreachable
  }
};

export const parseRecipePdf = async (pdfFile: File): Promise<string> => {
    checkApiKey();
    try {
        const pdfPart = await fileToGenerativePart(pdfFile);
        const prompt = `
        You are a data extraction assistant for a professional bakery app.
        Extract the recipe details from the provided PDF file.
        
        Rules:
        1. Extract the Recipe Name.
        2. Identify the "Yield" (number of loaves/units) and the approximate weight per unit if available. If not specified, estimate a standard loaf is 900g, or default to 1 loaf at total weight.
        3. Extract all Ingredients and their Weights.
        4. **CRITICAL**: Convert all weights to GRAMS (g). If inputs are in lbs/oz/cups, convert them to grams.
        5. Return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json.
        
        JSON Structure:
        {
          "name": "Recipe Name",
          "numberOfLoaves": number,
          "weightPerLoaf": number,
          "ingredients": [
            { "name": "Ingredient Name", "weight": number }
          ]
        }
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [pdfPart, { text: prompt }] },
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        return response.text || "{}";
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
};

export const getGroundedResponse = async (prompt: string): Promise<GeminiGroundedResponse> => {
    checkApiKey();
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
        
        return {
            text: response.text || "No response generated.",
            metadata: {
                groundingChunks: groundingChunks || [],
            }
        };
    } catch (error) {
        handleGeminiError(error);
        return { text: "" };
    }
};


export const getComplexResponse = async (prompt: string): Promise<string> => {
    checkApiKey();
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 1024 } // Reduced budget for faster response in this context
            },
        });
        return response.text || "No response generated.";
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
};

export const getRecipeSuggestions = async (recipeContext: string, goal: string): Promise<string> => {
    checkApiKey();
    try {
        const prompt = `
        Act as a world-class master baker and food scientist.
        
        Current Recipe Context:
        ${recipeContext}
        
        User Goal: "${goal}"
        
        Based on the goal, suggest specific modifications to the ingredient percentages, new ingredients to add, or process changes. 
        Provide the reasoning (baking science) for each suggestion.
        Format the response in Markdown.
        `;
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Fast response
            contents: prompt,
        });
        
        return response.text || "No suggestions generated.";
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
};

export const suggestIngredientCost = async (ingredientName: string): Promise<number | null> => {
    checkApiKey();
    try {
        const prompt = `
        Search for the current average bulk market price for "${ingredientName}" per kilogram (kg) in USD.
        
        Analyze the search results to find a realistic price for a bakery ingredient.
        If the results show a range, calculate a conservative average.
        
        Return ONLY a single numeric value representing the price in USD/kg. 
        Do not include symbols ($), text, or markdown. Just the number (e.g., 2.50).
        If no price can be confidently determined, return 0.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const text = response.text || "";
        // Clean up response to find the number
        const match = text.match(/[\d.]+/);
        if (match) {
            const price = parseFloat(match[0]);
            return isNaN(price) ? null : price;
        }
        return null;
    } catch (error) {
        console.error("Error suggesting cost:", error);
        // We don't throw here to avoid breaking the UI for a non-critical feature
        return null;
    }
};
