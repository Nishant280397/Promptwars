/* ===========================
   Bhookh — Utility Functions
   =========================== */

const Utils = {
  /* --- localStorage --- */
  saveApiKey(key) {
    localStorage.setItem('bhookh_api_key', key);
  },
  getApiKey() {
    return localStorage.getItem('bhookh_api_key');
  },
  clearApiKey() {
    localStorage.removeItem('bhookh_api_key');
  },

  savePreferences(prefs) {
    localStorage.setItem('bhookh_prefs', JSON.stringify(prefs));
  },
  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem('bhookh_prefs'));
    } catch {
      return null;
    }
  },

  saveMealPlan(plan) {
    localStorage.setItem('bhookh_last_plan', JSON.stringify(plan));
  },
  getLastPlan() {
    try {
      return JSON.parse(localStorage.getItem('bhookh_last_plan'));
    } catch {
      return null;
    }
  },

  /* --- Currency --- */
  formatCurrency(amount) {
    const num = Number(amount);
    if (isNaN(num)) return '₹0';
    return '₹' + num.toLocaleString('en-IN');
  },

  /* --- Clipboard --- */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  },

  /* --- Format meal plan as plain text for copy --- */
  formatPlanAsText(plan) {
    if (!plan) return '';
    let text = '🍳 Bhookh — Your Daily Meal Plan\n';
    text += '='.repeat(40) + '\n\n';

    // Meals
    const meals = plan.meals;
    for (const [type, meal] of Object.entries(meals)) {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      text += `🍽️ ${label}: ${meal.name}\n`;
      text += `   ⏱ ${meal.cookTime} | 👨‍🍳 ${meal.difficulty} | 🔥 ${meal.calories} cal\n`;
      if (meal.ingredients && meal.ingredients.length) {
        text += `   Ingredients: ${meal.ingredients.join(', ')}\n`;
      }
      text += '\n';
    }

    // Grocery
    if (plan.groceryList && plan.groceryList.length) {
      text += '🛒 Grocery List\n';
      text += '-'.repeat(30) + '\n';
      for (const item of plan.groceryList) {
        text += `   • ${item.item} — ${item.quantity} (${Utils.formatCurrency(item.estimatedCost)})\n`;
      }
      text += '\n';
    }

    // Substitutions
    if (plan.substitutions && plan.substitutions.length) {
      text += '🔄 Substitutions\n';
      text += '-'.repeat(30) + '\n';
      for (const sub of plan.substitutions) {
        text += `   ${sub.original} → ${sub.substitute} (${sub.reason})\n`;
      }
      text += '\n';
    }

    // Budget
    if (plan.budget) {
      text += '💰 Budget Summary\n';
      text += '-'.repeat(30) + '\n';
      text += `   Total: ${Utils.formatCurrency(plan.budget.total)}\n`;
      if (plan.budget.perMeal) {
        for (const [meal, cost] of Object.entries(plan.budget.perMeal)) {
          text += `   ${meal}: ${Utils.formatCurrency(cost)}\n`;
        }
      }
      text += `   Status: ${plan.budget.withinBudget ? '✅ Within budget' : '⚠️ Over budget'}\n`;
    }

    return text;
  },

  /* --- Toast notification --- */
  showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  }
};
