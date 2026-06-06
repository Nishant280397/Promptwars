/* ===========================
   Bhookh — App Controller
   State management, navigation, events
   =========================== */

(function () {
  'use strict';

  /* --- App State --- */
  const state = {
    currentScreen: 'welcome',
    wizardStep: 1,
    preferences: {
      diet: null,
      cuisine: null,
      allergies: [],
      dayType: null,
      people: 2,
      skill: null,
      budget: 600
    },
    mealPlan: null,
    isGenerating: false  // Prevent double submissions
  };

  /* --- Allowed values (input validation) --- */
  const VALID = {
    diet: ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian'],
    cuisine: ['north-indian', 'south-indian', 'chinese', 'mixed'],
    allergies: ['dairy', 'nuts', 'gluten', 'soy', 'none'],
    dayType: ['busy', 'relaxed', 'hosting'],
    skill: ['beginner', 'intermediate', 'advanced']
  };

  /* --- Initialize --- */
  function init() {
    const saved = Utils.getPreferences();
    if (saved) {
      Object.assign(state.preferences, saved);
    }
    bindEvents();
    UI.initTabs();
  }

  /* --- Event Binding --- */
  function bindEvents() {
    // Welcome → Wizard
    document.getElementById('start-btn').addEventListener('click', () => {
      navigateToWizard();
    });

    // Wizard option cards
    bindOptionCards('diet-options', 'diet', false);
    bindOptionCards('cuisine-options', 'cuisine', false);
    bindOptionCards('allergy-options', 'allergies', true);
    bindOptionCards('daytype-options', 'dayType', false);
    bindOptionCards('skill-options', 'skill', false);

    // People counter
    document.getElementById('people-minus').addEventListener('click', () => {
      if (state.preferences.people > 1) {
        state.preferences.people--;
        updatePeopleCount();
      }
    });
    document.getElementById('people-plus').addEventListener('click', () => {
      if (state.preferences.people < 20) {
        state.preferences.people++;
        updatePeopleCount();
      }
    });

    // Budget
    bindOptionCards('budget-presets', 'budgetPreset', false);
    const slider = document.getElementById('budget-slider');
    slider.addEventListener('input', () => {
      state.preferences.budget = parseInt(slider.value);
      document.getElementById('budget-value').textContent = Utils.formatCurrency(slider.value);
      slider.setAttribute('aria-valuenow', slider.value);
      slider.setAttribute('aria-valuetext', Utils.formatCurrency(slider.value));
      document.querySelectorAll('#budget-presets .option-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      });
    });

    // Wizard navigation
    document.getElementById('step1-next').addEventListener('click', () => goToWizardStep(2));
    document.getElementById('step2-back').addEventListener('click', () => goToWizardStep(1));
    document.getElementById('step2-next').addEventListener('click', () => goToWizardStep(3));
    document.getElementById('step3-back').addEventListener('click', () => goToWizardStep(2));
    document.getElementById('wizard-back-btn').addEventListener('click', handleWizardBack);

    // Generate
    document.getElementById('generate-btn').addEventListener('click', handleGenerate);

    // Results actions
    document.getElementById('copy-btn').addEventListener('click', handleCopy);
    document.getElementById('new-plan-btn').addEventListener('click', handleNewPlan);

    // Error actions
    document.getElementById('retry-btn').addEventListener('click', handleGenerate);
  }

  function updatePeopleCount() {
    const el = document.getElementById('people-count');
    el.textContent = state.preferences.people;
    Utils.announce(`${state.preferences.people} people`);
  }

  /**
   * Bind single-select or multi-select option cards
   * Includes keyboard support (Enter/Space) and ARIA state management
   */
  function bindOptionCards(containerId, field, isMulti) {
    const container = document.getElementById(containerId);

    function handleSelect(card) {
      const value = card.dataset.value;

      // Validate value against whitelist
      const validValues = VALID[field] || VALID[card.dataset.field];
      if (validValues && !validValues.includes(value) && field !== 'budgetPreset') {
        return;
      }

      if (isMulti) {
        card.classList.toggle('selected');
        const isSelected = card.classList.contains('selected');
        card.setAttribute('aria-checked', String(isSelected));

        if (value === 'none') {
          container.querySelectorAll('.option-card').forEach(c => {
            if (c !== card) {
              c.classList.remove('selected');
              c.setAttribute('aria-checked', 'false');
            }
          });
          state.preferences[field] = ['none'];
        } else {
          const noneCard = container.querySelector('[data-value="none"]');
          if (noneCard) {
            noneCard.classList.remove('selected');
            noneCard.setAttribute('aria-checked', 'false');
          }
          const selected = container.querySelectorAll('.option-card.selected');
          state.preferences[field] = Array.from(selected).map(c => c.dataset.value);
        }
      } else {
        container.querySelectorAll('.option-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');

        if (field === 'budgetPreset') {
          const budgetVal = parseInt(value);
          if (budgetVal >= 200 && budgetVal <= 2000) {
            state.preferences.budget = budgetVal;
            const slider = document.getElementById('budget-slider');
            slider.value = budgetVal;
            slider.setAttribute('aria-valuenow', budgetVal);
            slider.setAttribute('aria-valuetext', Utils.formatCurrency(budgetVal));
            document.getElementById('budget-value').textContent = Utils.formatCurrency(budgetVal);
          }
        } else {
          state.preferences[field] = value;
        }
      }
    }

    // Click handler
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (card) handleSelect(card);
    });

    // Keyboard: Enter/Space to select
    container.addEventListener('keydown', (e) => {
      const card = e.target.closest('.option-card');
      if (!card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(card);
      }
    });
  }

  /* --- Navigation --- */
  function navigateToWizard() {
    state.currentScreen = 'wizard';
    state.wizardStep = 1;
    UI.showScreen('wizard');
    UI.showWizardStep(1);
  }

  function goToWizardStep(step) {
    if (step > state.wizardStep) {
      const errors = validateStep(state.wizardStep);
      if (errors) {
        Utils.showToast(errors);
        Utils.announce(errors);
        return;
      }
    }
    state.wizardStep = step;
    UI.showWizardStep(step);
  }

  function handleWizardBack() {
    if (state.wizardStep > 1) {
      goToWizardStep(state.wizardStep - 1);
    } else {
      UI.showScreen('welcome');
      state.currentScreen = 'welcome';
    }
  }

  function validateStep(step) {
    const p = state.preferences;
    if (step === 1) {
      if (!p.diet) return 'Please select a diet type.';
      if (!p.cuisine) return 'Please select a cuisine.';
    }
    if (step === 2) {
      if (!p.dayType) return 'Please select your day type.';
      if (!p.skill) return 'Please select your cooking skill level.';
    }
    return null;
  }

  /* --- Generate Plan --- */
  async function handleGenerate() {
    // Prevent double submissions
    if (state.isGenerating) return;

    const errors = validateStep(3);
    if (errors) {
      Utils.showToast(errors);
      Utils.announce(errors);
      return;
    }

    // Final input validation before sending
    const p = state.preferences;
    if (!VALID.diet.includes(p.diet) ||
        !VALID.cuisine.includes(p.cuisine) ||
        !VALID.dayType.includes(p.dayType) ||
        !VALID.skill.includes(p.skill) ||
        p.people < 1 || p.people > 20 ||
        p.budget < 200 || p.budget > 2000) {
      Utils.showToast('Invalid preferences. Please go back and check.');
      return;
    }

    state.isGenerating = true;

    // Save preferences
    Utils.savePreferences(state.preferences);

    // Show loading
    state.currentScreen = 'loading';
    UI.showScreen('loading');
    Utils.announce('Generating your meal plan. Please wait.');

    // Disable generate button
    const genBtn = document.getElementById('generate-btn');
    genBtn.disabled = true;

    try {
      const plan = await AI.generateMealPlan(state.preferences);
      state.mealPlan = plan;
      Utils.saveMealPlan(plan);

      state.currentScreen = 'results';
      UI.showScreen('results');
      UI.renderResults(plan, state.preferences);
    } catch (error) {
      console.error('Generation error:', error);
      state.currentScreen = 'error-screen';
      document.getElementById('error-message').textContent = error.message;
      UI.showScreen('error-screen');
      Utils.announce('Error: ' + error.message);
    } finally {
      state.isGenerating = false;
      genBtn.disabled = false;
    }
  }

  /* --- Result Actions --- */
  async function handleCopy() {
    if (!state.mealPlan) return;
    const text = Utils.formatPlanAsText(state.mealPlan);
    await Utils.copyToClipboard(text);
    Utils.showToast('📋 Copied to clipboard!');
    Utils.announce('Meal plan copied to clipboard.');
  }

  function handleNewPlan() {
    state.mealPlan = null;
    state.currentScreen = 'wizard';
    UI.showScreen('wizard');
    UI.showWizardStep(1);
  }

  /* --- Boot --- */
  document.addEventListener('DOMContentLoaded', init);
})();
