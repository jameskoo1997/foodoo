import { useState, useCallback, useRef } from 'react';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  is_active: boolean;
}

interface SLMResponse {
  response: string;
  suggestions: MenuItem[];
}

export const useClientSLM = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const pipelineRef = useRef<any>(null);

  const loadModel = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;

    try {
      setIsLoading(true);
      console.log('Loading Phi-3 Mini model...');
      
      // Load the text generation pipeline with Phi-3 Mini
      pipelineRef.current = await pipeline(
        'text-generation',
        'microsoft/Phi-3-mini-4k-instruct-onnx-web',
        { device: 'webgpu' }
      );
      
      setIsModelLoaded(true);
      console.log('Phi-3 Mini model loaded successfully');
      return pipelineRef.current;
    } catch (error) {
      console.error('Error loading SLM model:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateRecommendations = useCallback(async (
    query: string, 
    menuItems: MenuItem[]
  ): Promise<SLMResponse> => {
    try {
      setIsLoading(true);
      const model = await loadModel();

      // Create a prompt for the model
      const menuContext = menuItems.map(item => 
        `${item.name} (${item.category}) - RM${item.price.toFixed(2)}: ${item.description}`
      ).join('\n');

      const prompt = `<|system|>You are a helpful food recommendation assistant for Foodoo restaurant. Analyze the user's request and suggest 2-3 relevant menu items from the list below. Respond in JSON format with "response" (friendly explanation) and "suggested_items" (array of item IDs).

Menu Items:
${menuContext}

<|user|>${query}<|assistant|>`;

      const result = await model(prompt, {
        max_new_tokens: 200,
        temperature: 0.7,
        do_sample: true,
      });

      let response = result[0].generated_text.split('<|assistant|>')[1]?.trim() || '';
      
      // Try to parse JSON response
      let parsedResponse: any;
      try {
        // Extract JSON from response if it's wrapped in other text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        // Fallback: create response based on keywords
        const keywords = query.toLowerCase().split(' ');
        const matchedItems = menuItems.filter(item => 
          keywords.some(keyword => 
            item.name.toLowerCase().includes(keyword) ||
            item.category.toLowerCase().includes(keyword) ||
            item.description.toLowerCase().includes(keyword)
          )
        ).slice(0, 3);

        parsedResponse = {
          response: `Based on your request "${query}", here are some recommendations from our menu.`,
          suggested_items: matchedItems.map(item => item.id)
        };
      }

      // Filter menu items based on suggested IDs
      const suggestions = menuItems.filter(item => 
        parsedResponse.suggested_items?.includes(item.id)
      );

      return {
        response: parsedResponse.response || 'Here are some recommendations for you.',
        suggestions
      };
    } catch (error) {
      console.error('Error generating SLM recommendations:', error);
      
      // Simple fallback based on keywords
      const keywords = query.toLowerCase().split(' ');
      const matchedItems = menuItems.filter(item => 
        keywords.some(keyword => 
          item.name.toLowerCase().includes(keyword) ||
          item.category.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword)
        )
      ).slice(0, 2);

      return {
        response: `I found some items that might interest you based on your request.`,
        suggestions: matchedItems
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadModel]);

  return {
    generateRecommendations,
    isLoading,
    isModelLoaded,
    loadModel
  };
};