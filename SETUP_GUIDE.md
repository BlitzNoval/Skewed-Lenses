# Skewed Lenses - Setup Guide

## 🎯 What You Built

**"Skewed Lenses"** is an interactive demonstration of AI bias in dyslexia screening. Users complete two reading benchmarks, then explore how **3 different AI models** interpret the same results through **5 different "lenses" (perspectives)**.

### The Core Concept:
- Same data → Different AIs → Different interpretations
- Each AI can use different "lenses": Clinical, Educational, Empathetic, Technical, Cultural
- Users can **recursively** ask one AI to analyze another AI's response
- **Demonstrates AI bias, variability, and the danger of automated medical diagnoses**

---

## 🔑 API Keys Needed (All FREE)

### 1. **Groq API** (Llama 3.1) ✅ Already have this
- Used for: AI Model #1
- URL: https://console.groq.com/keys
- Free tier: Yes

### 2. **OpenRouter API** (GPT-OSS-20B)
- Used for: AI Model #2
- URL: https://openrouter.ai/
- Model: `openai/gpt-oss-20b:free`
- Free tier: **Completely free, no limits**
- Steps:
  1. Sign up at https://openrouter.ai/
  2. Go to https://openrouter.ai/keys
  3. Create a new API key
  4. Copy the key

### 3. **Google AI Studio** (Gemini 2.5)
- Used for: AI Model #3
- URL: https://makersuite.google.com/app/apikey
- Model: `gemini-2.0-flash-exp`
- Free tier: **Yes, generous limits**
- Steps:
  1. Go to https://makersuite.google.com/app/apikey
  2. Click "Create API key"
  3. Copy the key

---

## 🛠️ Installation Steps

### 1. Set up environment variables

Create `.env.local` in the root directory:

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local` and add your keys:

```env
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_AI_KEY=AIza...
```

### 2. Install dependencies (if not already done)

```bash
npm install
```

### 3. Run the development server

```bash
cd woods
npm run dev
```

---

## 🎨 How It Works

### User Flow:

1. **Home Page** → "Begin" button
2. **Complete Benchmark 1** (Oral Reading Fluency with microphone)
3. **Complete Benchmark 2** (Reading Pace Assessment with keyboard)
4. **Click "Enter Skewed Lenses"** → Opens the new interface

### Skewed Lenses Interface:

```
Step 1: Choose AI Model
├─ Llama (Analytical, neutral)
├─ OpenRouter GPT (Warm, interpretive)
└─ Gemini (Formal, academic)

Step 2: Choose Lens
├─ 🏥 Clinical (Diagnostic, medical)
├─ 📚 Educational (Teacher-like)
├─ ❤️ Empathetic (Supportive)
├─ 🔬 Technical (Data-driven)
└─ 🌍 Cultural (Western-normed)

Step 3: View Analysis
└─ ChatGPT-style typing animation
    └─ Max 20 lines (dyslexia-friendly)

Step 4: Continue?
├─ Change AI → Choose new AI
│   └─ Option: Analyze just results OR analyze previous AI's response too
├─ Change Lens → Keep same AI, different perspective
└─ End Session → Returns to dashboard
```

### Recursive Analysis:

When user switches to a new AI and selects "Analyze previous AI + results":
- The new AI reads the first AI's response
- It critiques the previous AI's bias and tone
- It provides its own interpretation
- **This creates a chain of AI-analyzing-AI**

### The Philosophy:

"There are infinite ways to read a single line."

Each layer of AI interpretation adds its own bias, demonstrating:
- How medical diagnoses can be skewed by automated systems
- The danger of trusting AI for healthcare decisions
- Digital coloniality (Western AI training biases)
- The importance of human clinical judgment

---

## 📁 New Files Created

```
woods/
├── api/
│   └── multi-analyze.js          # NEW: Handles 3 AIs + 5 lenses
├── src/
│   └── components/
│       ├── SkewedLensesAnalysis.jsx    # NEW: Main interface
│       └── SkewedLensesAnalysis.css    # NEW: Dyslexia-friendly styles
```

### Key Features in the Code:

**multi-analyze.js:**
- Calls Groq, OpenRouter, or Gemini based on selection
- Applies lens-specific system prompts
- Handles recursive analysis (AI analyzing AI)
- Limits responses to 20 lines

**SkewedLensesAnalysis.jsx:**
- Step-by-step wizard interface
- Conversation history chain visualization
- ChatGPT-style typing animation
- Prevents re-using same AI twice
- Option to analyze recursively

**SkewedLensesAnalysis.css:**
- Large font sizes (1.4rem+ for readability)
- High line-height (2.0) for dyslexic readers
- No walls of text (forced spacing)
- High contrast colors
- Smooth animations

---

## 🎯 Testing the Flow

1. Run both benchmarks (you can use saved results)
2. Click "Enter Skewed Lenses"
3. Select **Llama** → **Clinical Lens**
4. Read the analysis
5. Click "Use Different AI"
6. Select "Analyze previous AI + results"
7. Select **Gemini** → **Empathetic Lens**
8. Watch Gemini critique Llama's clinical bias
9. Repeat to build a chain of interpretations

---

## 🐛 Troubleshooting

### "API Key Error"
- Check `.env.local` has correct keys
- Restart dev server after adding keys

### "OpenRouter 401 Unauthorized"
- Make sure you're using the FREE model: `openai/gpt-oss-20b:free`
- Check API key format: `sk-or-v1-...`

### "Gemini API Error"
- Verify API key is from https://makersuite.google.com/app/apikey
- Check you're using `gemini-2.0-flash-exp` model

### "Module not found: SkewedLensesAnalysis"
- Make sure files are in correct locations
- Restart dev server

---

## 🚀 Deployment to Vercel

1. Add environment variables in Vercel dashboard:
   - Settings → Environment Variables
   - Add all three API keys

2. Deploy:
```bash
git add .
git commit -m "Add Skewed Lenses interface"
git push
```

Vercel will automatically rebuild with the new API endpoints.

---

## 💡 Assignment Connections

This project demonstrates:

**Part of Flow** | **Assignment Theme** | **How It Links**
---|---|---
AI selection | Digital coloniality | Different models = different cultural biases
Lens selection | Bias is configurable | Shows bias isn't accidental—it's programmable
Recursive analysis | Self-amplifying interpretation | Automated meaning loops, humans lost
Ending message | Critical reflection | "Infinite ways to read a line"—truth dissolves
Dyslexia-friendly UI | Accessibility & inclusion | Design for marginalized users
No diagnosis disclaimer | Ethics in AI healthcare | Keep the tool a tool, not a replacement

---

## 📝 Next Steps

- [ ] Get OpenRouter API key
- [ ] Get Google AI key
- [ ] Test the full recursive flow
- [ ] Deploy to Vercel
- [ ] Document findings for assignment

---

**Questions?** Check the code comments in `multi-analyze.js` and `SkewedLensesAnalysis.jsx`!
