/* ===========================
   Bhookh — Utility Functions
   =========================== */

const Utils = {
  /* --- localStorage --- */
  savePreferences(prefs) {
    try {
      localStorage.setItem('bhookh_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Could not save preferences:', e);
    }
  },
  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem('bhookh_prefs'));
    } catch {
      return null;
    }
  },

  saveMealPlan(plan) {
    try {
      localStorage.setItem('bhookh_last_plan', JSON.stringify(plan));
    } catch (e) {
      console.warn('Could not save meal plan:', e);
    }
  },
  getLastPlan() {
    try {
      return JSON.parse(localStorage.getItem('bhookh_last_plan'));
    } catch {
      return null;
    }
  },

  /* --- Security: HTML sanitization --- */
  /**
   * Escapes HTML special characters to prevent XSS
   * when rendering AI-generated content into the DOM.
   * @param {string} str - Untrusted string
   * @returns {string} Escaped safe string
   */
  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
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
  },

  /* --- Screen reader announcement --- */
  /**
   * Announce a message to screen readers via the live region
   * @param {string} message - Text to announce
   */
  announce(message) {
    const el = document.getElementById('sr-announcer');
    if (el) {
      el.textContent = '';
      // Small delay to ensure the change is picked up
      setTimeout(() => { el.textContent = message; }, 50);
    }
  }
};
