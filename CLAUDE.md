# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Woods Dyslexia Screening Tool - A React/Flask application for real-time speech-to-text dyslexia assessment with multiple benchmark modes:
- **Benchmark 1**: DIBELS-validated oral reading fluency with real-time word-by-word feedback
- **Benchmark 2**: TBD (Future implementation)
- **Benchmark 3**: TBD (Future implementation)

## Architecture
- **Frontend**: React 19 + Vite 7 with Three.js for 3D visualizations (`./woods/`)
- **Backend**: Flask app with OpenAI Whisper + Groq AI analysis (`./woods/backend/`)
- **State Management**: Zustand store for speech recognition and assessment tracking
- **Deployment**: Frontend on Vercel, Backend via ngrok tunnel for local development

## Development Commands

### Frontend Development
```bash
cd woods
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development (Windows)
```bash
cd woods/backend
# Activate virtual environment
.\venv\Scripts\Activate.ps1
# If execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies (if needed)
pip install -r requirements.txt

# Run Flask backend (pre-loads Whisper model)
python app.py        # Runs on http://127.0.0.1:5001
```

### ngrok Setup for API Access
```bash
# In separate terminal window
ngrok http 5001
# Copy the https://xxxx.ngrok-free.app URL to update VITE_API_URL in Vercel
```

## Key Architecture Patterns

### Real-Time Speech Recognition System
- **Custom Hook**: `useSpeechRecognition` wraps native Web Speech API
- **Zustand Store**: `useSpeechStore` manages speech state and assessment logic
- **Real-time Processing**: Word-by-word comparison with instant visual feedback
- **Visual States**: Green=correct, Red=incorrect, Orange=current word
- **Error Tracking**: Comprehensive speech log with timestamps and error analysis

### State Management Architecture
- **Zustand Store**: Central state management for speech recognition
- **Persistent Storage**: localStorage for benchmark completion tracking
- **Assessment Flow**: 5-word sentences from 30-word DIBELS chunks
- **Word Status Array**: `0=unread, 1=correct, 2=incorrect`
- **Speech Log**: Complete history of all speech attempts with metadata

### Dual Audio Processing
1. **Real-time (Primary)**: Web Speech API for instant feedback
2. **Post-processing (Secondary)**: Whisper backend for detailed analysis
3. **Groq AI Analysis**: Speech patterns and dyslexia indicators

## Backend API Endpoints
- `POST /transcribe` - Full audio transcription (main endpoint)
- `POST /transcribe-stream` - Real-time audio chunks (backup)
- `POST /analyze` - Dyslexia analysis with Groq AI (modes: 'free', 'reading')
- `GET /health` - Health check with model status

## Environment Variables
- `VITE_API_URL` - Set in Vercel dashboard to current ngrok URL
- `GROQ_API_KEY` - Groq API key for AI analysis (currently hardcoded in app.py)

## Key Components
- `App.jsx` - Main application with benchmark flow and UI state management
- `useSpeechRecognition.js` - Custom hook for Web Speech API integration
- `useSpeechStore.js` - Zustand store for speech recognition and assessment state
- `Globe.jsx` - Three.js 3D globe visualization ("1 in 10" representation)
- `GridBackground.jsx` - Animated grid background
- `VideoBackground.jsx` - Video background component

## DIBELS Reading Passages
Three validated passages randomly selected for reading assessment:
1. **Crows** - Animal behavior and diet (533 characters)
2. **Government** - Laws and power structures (515 characters)
3. **Digital Music Recording** - Technology evolution (739 characters)

## Testing and Quality
- ESLint configuration with React hooks and refresh plugins
- No test framework currently configured
- Manual testing via deployed Vercel app: https://skewed-lenses.vercel.app

## Benchmark 1 Implementation Status: ✅ COMPLETE

### Core Features Implemented:
- **Real-time Speech Recognition**: Custom hook with Web Speech API integration
- **DIBELS Assessment Flow**: Random 30-word chunks → 5-word sentences → Real-time feedback
- **Visual Feedback System**: Instant word highlighting (green/red/orange) during speech
- **Comprehensive Error Tracking**: Complete speech log with timestamps and skip tracking
- **Persistent State Management**: localStorage integration with benchmark completion tracking
- **Professional UI/UX**: Responsive modals, animations, confirmation dialogs
- **Save System**: Loading states, confetti animation, error handling with retry

### Assessment Logic:
- **Word Matching**: Case-insensitive with fuzzy matching for partial words
- **Progress Tracking**: Current word index, sentence progression, fluency scoring
- **Skip Functionality**: Users can skip difficult words with tracking
- **Auto-advancement**: Correct words automatically advance to next word
- **Session Management**: 2-second delays between sentences, auto-completion detection

### User Flow:
1. **Hub Selection**: Green checkmarks show completed benchmarks with saved results
2. **Smart Navigation**: Completed benchmarks show results, new ones start fresh
3. **Assessment Interface**: Clean layout with words, controls, and fluency score
4. **Results Management**: Save/Restart/Return with appropriate confirmations
5. **State Persistence**: Results survive browser sessions, smart restart handling

## Dependencies
- **Frontend**: React 19, Three.js, @react-three/fiber, @react-three/drei, Zustand
- **Backend**: Flask, OpenAI Whisper, Groq AI, Flask-CORS
- **AI Models**: Whisper "small" model (pre-loaded), Groq Llama-3.1-8b-instant

## Technical Implementation Details

### Speech Recognition Flow
```javascript
// Custom hook architecture
useSpeechRecognition() → useSpeechStore() → processSpokenWords() → UI updates
```

### Data Storage Schema
```javascript
// localStorage structure
savedBenchmarkResults: {
  benchmark1: {
    fluencyScore: { correct: 28, total: 30, percentage: 93 },
    speechLog: [...], // Complete speech attempt history
    errorAnalysis: { totalAttempts: 32, correctAttempts: 28, ... },
    detailedResults: [...], // Per-sentence breakdown
    savedAt: "2024-01-15T10:30:00.000Z",
    benchmarkType: "benchmark1"
  }
}
```

### Modal System Architecture
- **Base Classes**: `.modal-overlay`, `.benchmark-modal`, `.modal-header`, `.modal-content`, `.modal-actions`
- **Modifiers**: `.small-modal` for confirmation dialogs
- **Animations**: Fast 150ms slide-in/out with scale effects
- **Prefab Pattern**: Consistent styling across all popups

## Deployment Notes
- Frontend auto-deploys to Vercel on git push to main
- Backend requires manual ngrok tunnel setup for development
- Update VITE_API_URL in Vercel dashboard when ngrok URL changes
- No production backend deployment currently configured

## Development Notes
- **File Structure**: `/woods/src/` contains React components, `/woods/src/hooks/` for custom hooks, `/woods/src/store/` for Zustand stores
- **Styling**: Single `App.css` file with BEM-like naming conventions
- **State Logic**: Assessment logic centralized in `useSpeechStore.js`
- **Error Handling**: Comprehensive try-catch with user-friendly error modals