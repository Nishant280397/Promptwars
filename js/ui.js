/* ===========================
   Bhookh — UI Rendering
   All AI content is escaped via Utils.escapeHTML() to prevent XSS
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

    // Move focus to the screen heading for accessibility
    const heading = target.querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
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

    // Update step indicators + ARIA
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      dot.removeAttribute('aria-current');
      if (i + 1 < stepNum) dot.classList.add('done');
      if (i + 1 === stepNum) {
        dot.classList.add('active');
        dot.setAttribute('aria-current', 'step');
      }
    });
    document.getElementById('current-step-num').textContent = stepNum;

    // Announce step change to screen readers
    const stepTitles = { 1: 'Diet and Cuisine', 2: 'Day Context', 3: 'Budget' };
    Utils.announce(`Step ${stepNum} of 3: ${stepTitles[stepNum]}`);

    // Focus the first heading in the new step
    const heading = step.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  },

  /**
   * Render the full results
   */
  renderResults(plan, preferences) {
    const esc = Utils.escapeHTML;
    const meta = document.getElementById('results-meta');
    meta.textContent = `${esc(preferences.diet)} • ${esc(preferences.cuisine)} • ${preferences.people} people • Budget: ${Utils.formatCurrency(preferences.budget)}`;

    UI.renderMeals(plan.meals);
    UI.renderGroceryList(plan.groceryList);
    UI.renderSubstitutions(plan.substitutions);
    UI.renderBudget(plan.budget);

    Utils.announce('Your meal plan is ready. Use the tabs to view meals, grocery list, substitutions, and budget.');
  },

  /**
   * Render meal cards — all dynamic content escaped
   */
  renderMeals(meals) {
    const container = document.getElementById('tab-meals');
    const esc = Utils.escapeHTML;
    container.innerHTML = '';

    const mealOrder = ['breakfast', 'lunch', 'dinner'];
    const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

    for (const type of mealOrder) {
      const meal = meals[type];
      if (!meal) continue;

      const card = document.createElement('article');
      card.className = 'meal-card';
      card.setAttribute('aria-label', `${type}: ${esc(meal.name)}`);
      card.innerHTML = `
        <div class="meal-card-header">
          <span class="meal-type"><span aria-hidden="true">${mealEmojis[type]}</span> ${esc(type)}</span>
        </div>
        <h3 class="meal-name">${esc(meal.name)}</h3>
        <div class="meal-meta">
          <span class="meal-meta-item"><span aria-hidden="true">⏱</span> <span class="sr-only">Cook time:</span> ${esc(meal.cookTime)}</span>
          <span class="meal-meta-item"><span aria-hidden="true">👨‍🍳</span> <span class="sr-only">Difficulty:</span> ${esc(meal.difficulty)}</span>
          <span class="meal-meta-item"><span aria-hidden="true">🔥</span> <span class="sr-only">Calories:</span> ${esc(String(meal.calories))} cal</span>
        </div>
        ${meal.description ? `<p class="meal-description">${esc(meal.description)}</p>` : ''}
        ${meal.steps ? `<p class="meal-description"><strong>Steps:</strong> ${esc(meal.steps)}</p>` : ''}
        <div class="meal-ingredients">
          <h4>Ingredients</h4>
          <div class="ingredient-list" role="list">
            ${(meal.ingredients || []).map(ing => `<span class="ingredient-tag" role="listitem">${esc(ing)}</span>`).join('')}
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
    const esc = Utils.escapeHTML;
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
    totalDiv.setAttribute('aria-label', `Total: ${groceryList.length} items, estimated ${Utils.formatCurrency(totalCost)}`);
    totalDiv.innerHTML = `<div class="grocery-item" style="font-weight:600;">
      <span>Total Items: ${groceryList.length}</span>
      <span>Est. Total: ${Utils.formatCurrency(totalCost)}</span>
    </div>`;
    container.appendChild(totalDiv);

    // Track unique IDs to avoid duplicates
    const usedIds = new Set();

    // Render each category
    for (const [cat, items] of Object.entries(categories)) {
      const catDiv = document.createElement('div');
      catDiv.className = 'grocery-category';
      catDiv.innerHTML = `<h3 class="grocery-category-title">${esc(cat)}</h3>`;

      for (const item of items) {
        // Generate unique ID
        let baseId = 'g-' + item.item.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        let uniqueId = baseId;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
          uniqueId = `${baseId}-${counter++}`;
        }
        usedIds.add(uniqueId);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'grocery-item';
        itemDiv.innerHTML = `
          <div class="grocery-item-left">
            <input type="checkbox" class="grocery-checkbox" id="${uniqueId}" aria-label="Mark ${esc(item.item)} as bought">
            <label class="grocery-name" for="${uniqueId}">${esc(item.item)}</label>
            <span class="grocery-qty">(${esc(item.quantity)})</span>
          </div>
          <span class="grocery-cost">${Utils.formatCurrency(item.estimatedCost)}</span>
        `;

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
    const esc = Utils.escapeHTML;
    container.innerHTML = '';

    if (!substitutions || substitutions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No substitutions suggested.</p>';
      return;
    }

    for (const sub of substitutions) {
      const card = document.createElement('div');
      card.className = 'sub-card';
      card.setAttribute('aria-label', `Substitute ${esc(sub.original)} with ${esc(sub.substitute)}`);
      card.innerHTML = `
        <div class="sub-original">
          <div class="sub-label">Original</div>
          <div class="sub-name">${esc(sub.original)}</div>
        </div>
        <div class="sub-arrow" aria-hidden="true">→</div>
        <div class="sub-replacement">
          <div class="sub-label">Substitute</div>
          <div class="sub-name">${esc(sub.substitute)}</div>
          <div class="sub-reason">${esc(sub.reason)}</div>
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
    const esc = Utils.escapeHTML;
    container.innerHTML = '';

    const userBudget = budget.userBudget || 600;
    const total = budget.total || 0;
    const ratio = userBudget > 0 ? total / userBudget : 0;
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
    summary.setAttribute('aria-label', `Budget summary: ${Utils.formatCurrency(total)} of ${Utils.formatCurrency(userBudget)}`);
    summary.innerHTML = `
      <div class="budget-total">
        <div class="budget-total-label">Estimated Total</div>
        <div class="budget-total-amount ${status}">${Utils.formatCurrency(total)}</div>
      </div>

      <div class="budget-status ${status}" role="status">${statusText} — Budget: ${Utils.formatCurrency(userBudget)}</div>

      <div class="budget-bar-wrapper">
        <div class="budget-bar" role="progressbar" aria-valuenow="${Math.round(fillPct)}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Budget usage: ${Math.round(ratio * 100)}%">
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
            <div class="budget-meal-label"><span aria-hidden="true">🌅</span> Breakfast</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.breakfast)}</div>
          </div>
          <div class="budget-meal-item">
            <div class="budget-meal-label"><span aria-hidden="true">☀️</span> Lunch</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.lunch)}</div>
          </div>
          <div class="budget-meal-item">
            <div class="budget-meal-label"><span aria-hidden="true">🌙</span> Dinner</div>
            <div class="budget-meal-amount">${Utils.formatCurrency(budget.perMeal.dinner)}</div>
          </div>
        </div>
      ` : ''}

      ${budget.savingsTips && budget.savingsTips.length ? `
        <div class="budget-tips">
          <h4>💡 Saving Tips</h4>
          <ul>
            ${budget.savingsTips.map(tip => `<li>${esc(tip)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
    container.appendChild(summary);
  },

  /**
   * Set up tab switching with keyboard support
   */
  initTabs() {
    const tabs = document.querySelectorAll('#result-tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => UI._switchTab(tab));

      // Keyboard: arrow keys for tab navigation
      tab.addEventListener('keydown', (e) => {
        const tabList = Array.from(tabs);
        const currentIndex = tabList.indexOf(tab);
        let newIndex;

        if (e.key === 'ArrowRight') {
          newIndex = (currentIndex + 1) % tabList.length;
        } else if (e.key === 'ArrowLeft') {
          newIndex = (currentIndex - 1 + tabList.length) % tabList.length;
        } else if (e.key === 'Home') {
          newIndex = 0;
        } else if (e.key === 'End') {
          newIndex = tabList.length - 1;
        } else {
          return; // Don't prevent default for other keys
        }

        e.preventDefault();
        tabList[newIndex].focus();
        UI._switchTab(tabList[newIndex]);
      });
    });
  },

  /** Internal: switch active tab */
  _switchTab(tab) {
    const tabs = document.querySelectorAll('#result-tabs .tab');
    // Deactivate all
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.remove('active');
      c.classList.add('hidden');
    });
    // Activate selected
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    const target = document.getElementById(`tab-${tab.dataset.tab}`);
    target.classList.remove('hidden');
    target.classList.add('active');
  }
};
