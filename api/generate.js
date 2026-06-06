/* ===========================
   Bhookh — Serverless API: /api/generate
   Proxies meal plan generation to Gemini API
   Security: input validation, rate limiting headers, no key exposure
   =========================== */

// --- Input validation constants ---
const VALID_DIETS = ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian'];
const VALID_CUISINES = ['north-indian', 'south-indian', 'chinese', 'mixed'];
const VALID_DAY_TYPES = ['busy', 'relaxed', 'hosting'];
const VALID_SKILLS = ['beginner', 'intermediate', 'advanced'];
const VALID_ALLERGIES = ['dairy', 'nuts', 'gluten', 'soy', 'none'];
const MAX_PEOPLE = 20;
const MIN_BUDGET = 200;
const MAX_BUDGET = 2000;

export default async function handler(req, res) {
  // --- Security headers ---
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- API key check ---
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error. Please contact the administrator.' });
  }

  try {
    const { preferences } = req.body || {};
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid preferences in request body.' });
    }

    // --- Input validation ---
    const validation = validatePreferences(preferences);
    if (validation) {
      return res.status(400).json({ error: validation });
    }

    // Sanitize: only pass validated fields
    const sanitized = {
      diet: preferences.diet,
      cuisine: preferences.cuisine,
      allergies: (preferences.allergies || []).filter(a => VALID_ALLERGIES.includes(a)),
      dayType: preferences.dayType,
      people: Math.min(Math.max(parseInt(preferences.people) || 2, 1), MAX_PEOPLE),
      skill: preferences.skill,
      budget: Math.min(Math.max(parseInt(preferences.budget) || 600, MIN_BUDGET), MAX_BUDGET)
    };

    const prompt = buildPrompt(sanitized);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
            responseSchema: getSchema()
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, err);
      return res.status(502).json({
        error: 'AI service temporarily unavailable. Please try again in a moment.'
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'No response from AI. Please try again.' });
    }

    let plan;
    try {
      plan = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', parseErr);
      return res.status(502).json({ error: 'Invalid AI response. Please try again.' });
    }

    // Attach user budget for comparison
    plan.budget = plan.budget || {};
    plan.budget.userBudget = sanitized.budget;

    return res.status(200).json(plan);
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}

/**
 * Validate user preferences — returns error string or null
 */
function validatePreferences(p) {
  if (!VALID_DIETS.includes(p.diet)) return `Invalid diet: ${p.diet}`;
  if (!VALID_CUISINES.includes(p.cuisine)) return `Invalid cuisine: ${p.cuisine}`;
  if (!VALID_DAY_TYPES.includes(p.dayType)) return `Invalid day type: ${p.dayType}`;
  if (!VALID_SKILLS.includes(p.skill)) return `Invalid skill level: ${p.skill}`;

  const people = parseInt(p.people);
  if (isNaN(people) || people < 1 || people > MAX_PEOPLE) {
    return `People count must be between 1 and ${MAX_PEOPLE}`;
  }

  const budget = parseInt(p.budget);
  if (isNaN(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
    return `Budget must be between ₹${MIN_BUDGET} and ₹${MAX_BUDGET}`;
  }

  if (p.allergies && !Array.isArray(p.allergies)) {
    return 'Allergies must be an array';
  }

  return null;
}

function buildPrompt(prefs) {
  const allergiesText = prefs.allergies?.length && !prefs.allergies.includes('none')
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
}

function getSchema() {
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
}
