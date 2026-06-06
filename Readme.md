# 🍳 Bhookh — AI-Powered Cooking Planner

A micro web app that generates a personalized daily meal plan with grocery lists, ingredient substitutions, and budget analysis — powered by Google Gemini AI.

## Features

- **Meal Plan** — Breakfast, Lunch, Dinner with cook time, difficulty, calories & step-by-step instructions
- **Grocery List** — Categorized ingredients with quantities, costs, and interactive checkboxes
- **Substitutions** — Smart ingredient swaps with reasons (cost, availability, dietary)
- **Budget Analysis** — Total cost, per-meal breakdown, within-budget indicator, and saving tips

## Tech Stack

- HTML5 + Vanilla CSS + Vanilla JS (zero dependencies)
- Google Gemini 2.0 Flash API (free tier)
- Deployable to GitHub Pages (static, no build step)

## Setup

1. **Get a free Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open `index.html` in your browser (or deploy to any static host)
3. Paste your API key when prompted (stored only in your browser's localStorage)
4. Select your preferences and generate your meal plan!

## Deployment

This is a static site — just push to GitHub and enable GitHub Pages:
- Settings → Pages → Source: `master` branch → Save
- Live at: `https://<username>.github.io/Promptwars/`

## Project Structure

```
warmup/
├── index.html          # Single page app
├── css/style.css       # Design system
├── js/
│   ├── app.js          # State & navigation
│   ├── ai.js           # Gemini API integration
│   ├── ui.js           # DOM rendering
│   └── utils.js        # Helpers
├── assets/favicon.svg  # App icon
└── Readme.md           # This file
```

## License

MIT
