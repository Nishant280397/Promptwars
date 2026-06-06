/* ===========================
   MealMind — UI Rendering
   =========================== */

const UI = {
  /**
   * Show a screen, hide all others
   */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.add('active');
    window.scrollTo(0, 0);
  },

  /**
   * Show/hide wizard steps
   */
  showWizardStep(stepNum) {
    document.querySelectorAll('.wizard-step').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const step = document.getElementById(`wizard-step-${stepNum}`);
    step.classList.remove('hidden');
    step.classList.add('active');

    // Update step indicators
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 < stepNum) dot.classList.add('done');
      if (i + 1 === stepNum) dot.classList.add('active');
    });
    document.getElementById('current-step-num').textContent = stepNum;
  },

  /**
   * Show/hide modal
   */
  showModal(id) {
    document.getElementById(id).classList.remove('hidden');
  },
  hideModal(id) {
    document.getElementById(id).classList.add('hidden');
  },

  /**
   * Render the full results
   */
  renderResults(plan, preferences) {
    // Meta
    const meta = document.getElementById('results-meta');
    meta.textContent = `${preferences.diet} • ${preferences.cuisine} • ${preferences.people} people • Budget: ${Utils.formatCurrency(preferences.budget)}`;

    UI.renderMeals(plan.meals);
    UI.renderGroceryList(plan.groceryList);
    UI.renderSubstitutions(plan.substitutions);
    UI.renderBudget(plan.budget);
  },

  /**
   * Render meal cards
   */
  renderMeals(meals) {
    const container = document.getElementById('tab-meals');
    container.innerHTML = '';

    const mealOrder = ['breakfast', 'lunch', 'dinner'];
    const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

    for (const type of mealOrder) {
      const meal = meals[type];
      if (!meal) continue;

      const card = document.createElement('div');
      card.className = 'meal-card';
      card.innerHTML = `
        <div class="meal-card-header">
          <span class="meal-type">${mealEmojis[type]} ${type}</span>
        </div>
        <div class="meal-name">${meal.name}</div>
        <div class="meal-meta">
          <span class="meal-meta-item">⏱ ${meal.cookTime}</span>
          <span class="meal-meta-item">👨‍🍳 ${meal.difficulty}</span>
          <span class="meal-meta-item">🔥 ${meal.calories} cal</span>
        </div>
        ${meal.description ? `<div class="meal-description">${meal.description}</div>` : ''}
        ${meal.steps ? `<div class="meal-description"><strong>Steps:</strong> ${meal.steps}</div>` : ''}
        <div class="meal-ingredients">
          <h4>Ingredients</h4>
          <div class="ingredient-list">
            ${(meal.ingredients || []).map(ing => `<span class="ingredient-tag">${ing}</span>`).join('')}
          </div>
        </div>
      `;
      container.appendChild(card);
    }
  },

  /**
   * Render categorized grocery list with checkboxes
   */
  renderGroceryList(groceryList) {
    const container = document.getElementById('tab-grocery');
    container.innerHTML = '';

    // Group by category
    const categories = {};
    let totalCost = 0;
    for (const item of groceryList) {
      const cat = item.category || 'Others';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
      totalCost += item.estimatedCost || 0;
    }

    // Total header
    const totalDiv = document.createElement('div');
    totalDiv.className = 'grocery-category';
    totalDiv.innerHTML = `<div class="grocery-item" style="font-weight:600;">
      <span>Total Items: ${groceryList.length}</span>
      <span>Est. Total: ${Utils.formatCurrency(totalCost)}</span>
    </div>`;
    container.appendChild(totalDiv);

    // Render each category
    for (const [cat, items] of Object.entries(categories)) {
      const catDiv = document.createElement('div');
      catDiv.className = 'grocery-category';
      catDiv.innerHTML = `<div class="grocery-category-title">${cat}</div>`;

      for (const item of items) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'grocery-item';
        itemDiv.innerHTML = `
          <div class="grocery-item-left">
            <input type="checkbox" class="grocery-checkbox" id="g-${item.item.replace(/\s/g, '-')}">
            <label class="grocery-name" for="g-${item.item.replace(/\s/g, '-')}">${item.item}</label>
            <span class="grocery-qty">(${item.quantity})</span>
          </div>
          <span class="grocery-cost">${Utils.formatCurrency(item.estimatedCost)}</span>
        `;

        // Checkbox toggle
        const checkbox = itemDiv.querySelector('.grocery-checkbox');
        checkbox.addEventListener('change', () => {
          itemDiv.classList.toggle('checked', checkbox.checked);
        });

        catDiv.appendChild(itemDiv);
      }
      container.appendChild(catDiv);
    }
  },

  /**
   * Render substitution cards
   */
  renderSubstitutions(substitutions) {
    const container = document.getElementById('tab-substitutions');
    container.innerHTML = '';

    if (!substitutions || substitutions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No substitutions suggested.</p>';
      return;
    }

    for (const sub of substitutions) {
      const card = document.createElement('div');
      card.className = 'sub-card';
      card.innerHTML = `
        <div class="sub-original">
          <div class="sub-label">Original</div>
          <div class="sub-name">${sub.original}</div>
        </div>
        <div class="sub-arrow">→</div>
        <div class="sub-replacement">
          <div class="sub-label">Substitute</div>
          <div class="sub-name">${sub.substitute}</div>
          <div class="sub-reason">${sub.reason}</div>
        </div>
      `;
      container.appendChild(card);
    }
  },

  /**
   * Render budget summary
   */
  renderBudget(budget) {
    const container = document.getElementById('tab-budget');
    container.innerHTML = '';

    const userBudget = budget.userBudget || 600;
    const total = budget.total || 0;
    const ratio = total / userBudget;
    const status = ratio <= 0.9 ? 'under' : ratio <= 1.05 ? 'near' : 'over';
    const statusText = status === 'under' ? '✅ Within budget!'
      : status === 'near' ? '⚠️ Close to budget'
      : '🚨 Over budget';

    const fillPct = Math.min(ratio * 100, 120);
    const barColor = status === 'under' ? 'var(--green)'
      : status === 'near' ? 'var(--orange)'
      : 'var(--red)';

    const summary = document.createElement('div');
    summary.className = 'budget-summary';
    summary.innerHTML = `
      <div class="budget-total">
        <div class="budget-total-label">Estimated Total</div>
        <div class="budget-total-amount ${status}">${Utils.formatCurrency(total)}</div>
      </div>

      <div class="budget-status ${status}">${statusText} — Budget: ${Utils.formatCurrency(userBudget)}</div>

      <div class="budget-bar-wrapper">
        <div class="budget-bar">
          <div class="budget-bar-fill" style="width:${Math.min(fillPct, 100)}%; background:${barColor};"></div>
        </div>
        <div class="budget-bar-labels">
          <span>₹0</span>
          <span>${Utils.formatCurrency(userBudget)}</span>
        </div>
      </div>

      ${budget.perMeal ? `
        <div class="budget-breakdown">
          <div class="budget-meal-item">
            <div class="budget-meal-label">🌅 Breakfast</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.breakfast)}</div>
          </div>
          <div class="budget-meal-item">
            <div class="budget-meal-label">☀️ Lunch</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.lunch)}</div>
          </div>
          <div class="budget-meal-item">
            <div class="budget-meal-label">🌙 Dinner</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.dinner)}</div>
          </div>
        </div>
      ` : ''}

      ${budget.savingsTips && budget.savingsTips.length ? `
        <div class="budget-tips">
          <h4>💡 Saving Tips</h4>
          <ul>
            ${budget.savingsTips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    container.appendChild(summary);
  },

  /**
   * Set up tab switching
   */
  initTabs() {
    const tabs = document.querySelectorAll('#result-tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Deactivate all
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => {
          c.classList.remove('active');
          c.classList.add('hidden');
        });
        // Activate selected
        tab.classList.add('active');
        const target = document.getElementById(`tab-${tab.dataset.tab}`);
        target.classList.remove('hidden');
        target.classList.add('active');
      });
    });
  }
};
