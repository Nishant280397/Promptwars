/* ===========================
   MealMind — App Controller
   State management, navigation, events
   =========================== */

(function () {
  'use strict';

  /* --- App State --- */
  const state = {
    currentScreen: 'welcome',   // welcome | wizard | loading | results | error-screen
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
    mealPlan: null
  };

  /* --- Initialize --- */
  function init() {
    // Restore saved preferences
    const saved = Utils.getPreferences();
    if (saved) {
      Object.assign(state.preferences, saved);
    }

    bindEvents();
    UI.initTabs();
  }

  /* --- Event Binding --- */
  function bindEvents() {
    // Welcome → Start
    document.getElementById('start-btn').addEventListener('click', handleStart);

    // API Key modal
    document.getElementById('save-key-btn').addEventListener('click', handleSaveKey);
    document.getElementById('cancel-key-btn').addEventListener('click', () => UI.hideModal('api-modal'));
    document.getElementById('api-key-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSaveKey();
    });

    // Wizard step 1 — option cards (diet, cuisine, allergies)
    bindOptionCards('diet-options', 'diet', false);
    bindOptionCards('cuisine-options', 'cuisine', false);
    bindOptionCards('allergy-options', 'allergies', true);

    // Wizard step 2 — day type, skill
    bindOptionCards('daytype-options', 'dayType', false);
    bindOptionCards('skill-options', 'skill', false);

    // People counter
    document.getElementById('people-minus').addEventListener('click', () => {
      if (state.preferences.people > 1) {
        state.preferences.people--;
        document.getElementById('people-count').textContent = state.preferences.people;
      }
    });
    document.getElementById('people-plus').addEventListener('click', () => {
      if (state.preferences.people < 20) {
        state.preferences.people++;
        document.getElementById('people-count').textContent = state.preferences.people;
      }
    });

    // Wizard step 3 — budget
    bindOptionCards('budget-presets', 'budgetPreset', false);
    const slider = document.getElementById('budget-slider');
    slider.addEventListener('input', () => {
      state.preferences.budget = parseInt(slider.value);
      document.getElementById('budget-value').textContent = Utils.formatCurrency(slider.value);
      // Deselect preset buttons
      document.querySelectorAll('#budget-presets .option-card').forEach(c => c.classList.remove('selected'));
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
    document.getElementById('change-key-btn').addEventListener('click', () => {
      Utils.clearApiKey();
      UI.showModal('api-modal');
    });
  }

  /**
   * Bind single-select or multi-select option cards
   */
  function bindOptionCards(containerId, field, isMulti) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (!card) return;

      const value = card.dataset.value;

      if (isMulti) {
        // Toggle multi-select
        card.classList.toggle('selected');
        // Handle "none" clearing others
        if (value === 'none') {
          container.querySelectorAll('.option-card').forEach(c => {
            if (c !== card) c.classList.remove('selected');
          });
          state.preferences[field] = ['none'];
        } else {
          // Deselect "none"
          container.querySelector('[data-value="none"]')?.classList.remove('selected');
          const selected = container.querySelectorAll('.option-card.selected');
          state.preferences[field] = Array.from(selected).map(c => c.dataset.value);
        }
      } else {
        // Single select
        container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (field === 'budgetPreset') {
          const budgetVal = parseInt(value);
          state.preferences.budget = budgetVal;
          const slider = document.getElementById('budget-slider');
          slider.value = budgetVal;
          document.getElementById('budget-value').textContent = Utils.formatCurrency(budgetVal);
        } else {
          state.preferences[field] = value;
        }
      }
    });
  }

  /* --- Navigation --- */
  function handleStart() {
    const apiKey = Utils.getApiKey();
    if (!apiKey) {
      UI.showModal('api-modal');
      document.getElementById('api-key-input').focus();
    } else {
      navigateToWizard();
    }
  }

  async function handleSaveKey() {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    const errorEl = document.getElementById('api-key-error');

    if (!key) {
      errorEl.textContent = 'Please enter an API key.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Show loading state
    const btn = document.getElementById('save-key-btn');
    btn.textContent = 'Validating...';
    btn.disabled = true;

    const valid = await AI.validateApiKey(key);

    if (valid) {
      Utils.saveApiKey(key);
      errorEl.classList.add('hidden');
      UI.hideModal('api-modal');
      navigateToWizard();
    } else {
      errorEl.textContent = 'Invalid API key. Please check and try again.';
      errorEl.classList.remove('hidden');
    }

    btn.textContent = 'Save & Continue';
    btn.disabled = false;
  }

  function navigateToWizard() {
    state.currentScreen = 'wizard';
    state.wizardStep = 1;
    UI.showScreen('wizard');
    UI.showWizardStep(1);
  }

  function goToWizardStep(step) {
    // Validate current step before advancing
    if (step > state.wizardStep) {
      const errors = validateStep(state.wizardStep);
      if (errors) {
        Utils.showToast(errors);
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
    const errors = validateStep(3);
    if (errors) {
      Utils.showToast(errors);
      return;
    }

    const apiKey = Utils.getApiKey();
    if (!apiKey) {
      UI.showModal('api-modal');
      return;
    }

    // Save preferences
    Utils.savePreferences(state.preferences);

    // Show loading
    state.currentScreen = 'loading';
    UI.showScreen('loading');

    try {
      const plan = await AI.generateMealPlan(state.preferences, apiKey);
      state.mealPlan = plan;
      Utils.saveMealPlan(plan);

      // Show results
      state.currentScreen = 'results';
      UI.showScreen('results');
      UI.renderResults(plan, state.preferences);
    } catch (error) {
      console.error('Generation error:', error);
      state.currentScreen = 'error-screen';
      document.getElementById('error-message').textContent = error.message;
      UI.showScreen('error-screen');
    }
  }

  /* --- Result Actions --- */
  async function handleCopy() {
    if (!state.mealPlan) return;
    const text = Utils.formatPlanAsText(state.mealPlan);
    await Utils.copyToClipboard(text);
    Utils.showToast('📋 Copied to clipboard!');
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
