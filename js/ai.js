/* ===========================
   Bhookh — Gemini AI Integration
   =========================== */

const AI = {
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

  /**
   * Generate a meal plan using Gemini API
   * @param {Object} preferences - User preferences
   * @param {string} apiKey - Gemini API key
   * @returns {Object} Parsed meal plan
   */
  async generateMealPlan(preferences, apiKey) {
    const prompt = AI._buildPrompt(preferences);

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: AI._getSchema()
      }
    };

    const response = await fetch(`${AI.API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 400 || response.status === 403) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      }
      throw new Error(err.error?.message || `API error (${response.status})`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from AI. Please try again.');
    }

    try {
      const plan = JSON.parse(text);
      return AI._validatePlan(plan, preferences);
    } catch (e) {
      throw new Error('Could not parse AI response. Please try again.');
    }
  },

  /**
   * Validate API key by making a minimal request
   */
  async validateApiKey(apiKey) {
    try {
      const response = await fetch(`${AI.API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "ok"' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Build the structured prompt
   */
  _buildPrompt(prefs) {
    const allergiesText = prefs.allergies?.length
      ? `Allergies/restrictions: ${prefs.allergies.join(', ')}`
      : 'No allergies';

    return `You are an expert Indian home cook and meal planner. Generate a complete daily meal plan.

USER PREFERENCES:
- Diet: ${prefs.diet}
- Cuisine: ${prefs.cuisine}
- Day type: ${prefs.dayType} (${prefs.dayType === 'busy' ? 'quick meals preferred, max 30 min each' : prefs.dayType === 'relaxed' ? 'elaborate meals ok, can spend time cooking' : 'impressive dishes for guests'})
- Number of people: ${prefs.people}
- Cooking skill: ${prefs.skill}
- ${allergiesText}
- Daily budget: ₹${prefs.budget} for ${prefs.people} people

REQUIREMENTS:
1. Plan 3 meals: breakfast, lunch, dinner. Each must be a real, specific dish (not generic like "rice and dal").
2. Grocery list: every ingredient needed with exact quantities for ${prefs.people} people and estimated cost in INR (₹). Group by category (Vegetables, Dairy, Spices, Grains, Proteins, Others).
3. Substitutions: provide 4-6 practical ingredient swaps with reasons (cost, availability, dietary).
4. Budget: calculate total cost, per-meal cost, whether it fits ₹${prefs.budget}, and give 2-3 saving tips if over budget.
5. Costs should be realistic Indian market prices in INR.
6. All dishes should be practical for home cooking in India.
7. Include brief cooking steps (2-3 lines) for each meal.`;
  },

  /**
   * JSON schema for structured output
   */
  _getSchema() {
    return {
      type: 'OBJECT',
      properties: {
        meals: {
          type: 'OBJECT',
          properties: {
            breakfast: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                cookTime: { type: 'STRING' },
                difficulty: { type: 'STRING' },
                calories: { type: 'INTEGER' },
                description: { type: 'STRING' },
                ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
                steps: { type: 'STRING' }
              },
              required: ['name', 'cookTime', 'difficulty', 'calories', 'ingredients', 'steps']
            },
            lunch: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                cookTime: { type: 'STRING' },
                difficulty: { type: 'STRING' },
                calories: { type: 'INTEGER' },
                description: { type: 'STRING' },
                ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
                steps: { type: 'STRING' }
              },
              required: ['name', 'cookTime', 'difficulty', 'calories', 'ingredients', 'steps']
            },
            dinner: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                cookTime: { type: 'STRING' },
                difficulty: { type: 'STRING' },
                calories: { type: 'INTEGER' },
                description: { type: 'STRING' },
                ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
                steps: { type: 'STRING' }
              },
              required: ['name', 'cookTime', 'difficulty', 'calories', 'ingredients', 'steps']
            }
          },
          required: ['breakfast', 'lunch', 'dinner']
        },
        groceryList: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              item: { type: 'STRING' },
              quantity: { type: 'STRING' },
              category: { type: 'STRING' },
              estimatedCost: { type: 'INTEGER' }
            },
            required: ['item', 'quantity', 'category', 'estimatedCost']
          }
        },
        substitutions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              original: { type: 'STRING' },
              substitute: { type: 'STRING' },
              reason: { type: 'STRING' }
            },
            required: ['original', 'substitute', 'reason']
          }
        },
        budget: {
          type: 'OBJECT',
          properties: {
            total: { type: 'INTEGER' },
            perMeal: {
              type: 'OBJECT',
              properties: {
                breakfast: { type: 'INTEGER' },
                lunch: { type: 'INTEGER' },
                dinner: { type: 'INTEGER' }
              },
              required: ['breakfast', 'lunch', 'dinner']
            },
            withinBudget: { type: 'BOOLEAN' },
            savingsTips: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['total', 'perMeal', 'withinBudget', 'savingsTips']
        }
      },
      required: ['meals', 'groceryList', 'substitutions', 'budget']
    };
  },

  /**
   * Validate and normalize the parsed plan
   */
  _validatePlan(plan, prefs) {
    // Ensure required top-level keys exist
    if (!plan.meals || !plan.groceryList || !plan.substitutions || !plan.budget) {
      throw new Error('Incomplete meal plan received. Please try again.');
    }

    // Attach user budget for comparison
    plan.budget.userBudget = prefs.budget;

    return plan;
  }
};
