import { GoogleGenAI, Type } from "@google/genai";
import type { ListItem, SmartSortResult, SortType } from '../types';
import { ItemStatus } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
if (!apiKey) {
  if (import.meta.env.DEV) {
    throw new Error("VITE_GEMINI_API_KEY environment variable not set");
  }
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        itemName: { type: Type.STRING, description: "The name of the item, converted to a singular noun (e.g., '2 kg tomatoes' should result in 'Tomato')." },
        quantity: { type: Type.NUMBER, description: "The quantity of the item. For relative updates, this is the amount to add or subtract." },
        unit: { type: Type.STRING, description: "The unit of measurement (e.g., kg, L, pcs)." },
        priority: { type: Type.STRING, description: "The priority (e.g., High, Medium, Low)." },
        updateType: {
            type: Type.STRING,
            enum: ['ABSOLUTE', 'RELATIVE_INCREASE', 'RELATIVE_DECREASE'],
            description: "For UPDATE intent, specifies how the quantity should be changed."
        }
    },
    required: ['itemName'],
};

const commandSchema = {
  type: Type.OBJECT,
  properties: {
    intent: { type: Type.STRING, enum: ['ADD', 'REMOVE', 'UPDATE', 'NOOP'], description: "The user's primary intention." },
    items: {
      type: Type.ARRAY,
      description: "A list of items for ADD or UPDATE intents.",
      items: itemSchema
    },
    removeCriteria: {
      type: Type.OBJECT,
      description: "Criteria for REMOVE intent.",
      properties: {
        itemNames: { type: Type.ARRAY, items: { type: 'STRING' }, description: "Specific item names to remove." },
      }
    },
    confirmation: {
      type: Type.OBJECT,
      description: "Details for requiring user confirmation.",
      properties: {
        required: { type: Type.BOOLEAN },
        question: { type: Type.STRING, description: "A clear question to ask the user for confirmation." },
      }
    }
  },
  required: ['intent']
};

export const parseUserCommand = async (text: string, currentList: ListItem[]): Promise<any> => {
  const listContext = currentList.length > 0
    ? `The user's current shopping list is: [${currentList.map(i => `${i.quantity} ${i.unit} of ${i.name}`).join(', ')}].`
    : "The user's shopping list is currently empty.";

  const prompt = `
    You are an intelligent shopping list assistant. Analyze the user's request and the current list context to determine the correct action.

    Context: ${listContext}

    User Request: "${text}"

    Your task is to respond in JSON format according to the provided schema.
    1.  Determine the 'intent': 'ADD', 'REMOVE', 'UPDATE', or 'NOOP'.
    2.  For 'ADD', parse all mentioned items. Convert item names to singular form. Estimate vague quantities (e.g., 'a few' -> 2).
    3.  For 'UPDATE', determine the 'updateType':
        - 'ABSOLUTE': User specifies the final quantity. Keywords: "измени на", "сделай X". Example: "измени количество молока на 1 л" -> { itemName: 'Milk', quantity: 1, updateType: 'ABSOLUTE' }.
        - 'RELATIVE_INCREASE': User adds to the existing quantity. Keywords: "добавь", "прибавь", "еще", "больше". Example: "добавь еще литр молока" -> { itemName: 'Milk', quantity: 1, updateType: 'RELATIVE_INCREASE' }.
        - 'RELATIVE_DECREASE': User subtracts from the existing quantity. Keywords: "меньше", "уменьши", "на X меньше". Example: "молока на литр меньше" -> { itemName: 'Milk', quantity: 1, updateType: 'RELATIVE_DECREASE' }.
    4.  For 'REMOVE', identify specific items or categories. Populate 'removeCriteria.itemNames' with the exact names of items from the current list that should be removed.
    5.  IMPORTANT: For broad 'REMOVE' requests (e.g., "remove all dairy"), you MUST set 'confirmation.required' to true and formulate a clear 'confirmation.question' listing the items for removal.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: commandSchema,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error parsing user command with Gemini:', error);
    // Fallback to a simple ADD intent on error
    return {
      intent: 'ADD',
      items: [{ itemName: text, quantity: 1, unit: 'pcs' }]
    };
  }
};


export const getSmartSortedList = async (items: ListItem[], sortType: SortType): Promise<{ sortedItems: ListItem[]; groups: SmartSortResult }> => {
  const openItems = items.filter(item => item.status !== ItemStatus.Purchased);
  const purchasedItems = items.filter(item => item.status === ItemStatus.Purchased);
  
  if (openItems.length === 0) {
    return { sortedItems: purchasedItems, groups: {} };
  }

  const itemNames = openItems.map(item => item.name);

  let prompt: string;
  if (sortType === 'context') {
    prompt = `Group these shopping items into logical clusters for a shopping trip (e.g., 'For dinner', 'Breakfast', 'Household'). Items: [${itemNames.join(', ')}]. Return a single JSON object where keys are cluster names and values are arrays of the item names.`;
  } else if (sortType === 'location') {
    prompt = `Group these shopping items by their typical department in a supermarket (e.g., 'Produce', 'Dairy & Eggs', 'Bakery'). Items: [${itemNames.join(', ')}]. Return a single JSON object where keys are department names and values are arrays of the item names.`;
  } else {
    return { sortedItems: items, groups: {} };
  }
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
    });

    const jsonText = response.text.trim();
    const groups: SmartSortResult = JSON.parse(jsonText);
    
    const sortedOpenItems: ListItem[] = [];
    const itemMap = new Map(openItems.map(item => [item.name.toLowerCase(), item]));

    for (const groupName in groups) {
      for (const itemName of groups[groupName]) {
        const item = itemMap.get(itemName.toLowerCase());
        if (item) {
          sortedOpenItems.push(item);
          itemMap.delete(itemName.toLowerCase());
        }
      }
    }
    
    // Add any items not in the returned groups
    const remainingItems = Array.from(itemMap.values());
    
    const finalSortedList = [...sortedOpenItems, ...remainingItems, ...purchasedItems];
    return { sortedItems: finalSortedList, groups };

  } catch (error) {
    console.error('Error getting smart sort from Gemini:', error);
    throw error;
  }
};