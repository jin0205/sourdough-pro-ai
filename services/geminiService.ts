
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiGroundedResponse, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const analyzeImage = async (imageFile: File, prompt: string): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Sorry, I couldn't analyze the image. Please try again.";
  }
};

export const parseRecipePdf = async (pdfFile: File): Promise<string> => {
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
        console.error("Error parsing PDF:", error);
        throw new Error("Failed to parse PDF.");
    }
};

export const getGroundedResponse = async (prompt: string): Promise<GeminiGroundedResponse> => {
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
        console.error("Error getting grounded response:", error);
        return { text: "Sorry, I couldn't get a response. Please check the console for details." };
    }
};


export const getComplexResponse = async (prompt: string): Promise<string> => {
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
        console.error("Error getting complex response:", error);
        return "Sorry, I encountered an issue with the advanced query. Please try again.";
    }
};

export const getRecipeSuggestions = async (recipeContext: string, goal: string): Promise<string> => {
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
        console.error("Error getting suggestions:", error);
        return "Sorry, I couldn't generate suggestions at this time.";
    }
};

export const suggestIngredientCost = async (ingredientName: string): Promise<number | null> => {
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
        return null;
    }
};
