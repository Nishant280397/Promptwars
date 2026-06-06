/* ===========================
   Bhookh — AI Integration
   Calls our serverless API
   =========================== */

const AI = {
  /**
   * Generate a meal plan via the serverless API
   * @param {Object} preferences - User preferences
   * @returns {Object} Parsed meal plan
   */
  async generateMealPlan(preferences) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate meal plan. Please try again.');
    }

    return data;
  }
};
