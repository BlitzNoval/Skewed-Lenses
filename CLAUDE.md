# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Woods Dyslexia Screening Tool - A React/Flask application for real-time speech-to-text dyslexia assessment with two modes:
- **Free Speech Mode**: General dyslexia screening through speech analysis
- **Reading Assessment**: DIBELS-validated passage reading with word-by-word comparison

## Architecture
- **Frontend**: React 19 + Vite 7 with Three.js for 3D visualizations (`./woods/`)
- **Backend**: Flask app with OpenAI Whisper + Groq AI analysis (`./woods/backend/`)
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

### Real-Time Speech Recognition
- Uses Web Speech API (`webkitSpeechRecognition`) for instant feedback
- Word-by-word comparison with visual feedback (green=correct, red=incorrect, orange=current)
- Fallback to Whisper backend for detailed analysis

### State Management
- Single App.jsx with useState hooks
- Key state: `currentWordIndex`, `wordStatuses`, `transcribedText`, `isRecording`
- Word status array: `0=unread, 1=correct, 2=incorrect`

### Audio Processing Flow
1. Browser records WebM audio blob
2. POST to `/transcribe` endpoint with multipart/form-data
3. Flask saves to temp file → Whisper transcription → cleanup
4. Groq AI analysis for dyslexia indicators via `/analyze` endpoint

## Backend API Endpoints
- `POST /transcribe` - Full audio transcription (main endpoint)
- `POST /transcribe-stream` - Real-time audio chunks (backup)
- `POST /analyze` - Dyslexia analysis with Groq AI (modes: 'free', 'reading')
- `GET /health` - Health check with model status

## Environment Variables
- `VITE_API_URL` - Set in Vercel dashboard to current ngrok URL
- `GROQ_API_KEY` - Groq API key for AI analysis (currently hardcoded in app.py)

## Key Components
- `App.jsx` - Main application with speech recognition logic
- `Globe.jsx` - Three.js 3D globe visualization
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

## Current Development Focus
**Benchmark 1**: Real-time word-by-word speech recognition with instant visual feedback
- Case-insensitive word matching in `checkWordsRealTime()` function
- Web Speech API integration for instant feedback
- Progress tracking with words-per-minute calculation

## Dependencies
- **Frontend**: React 19, Three.js, @react-three/fiber, @react-three/drei
- **Backend**: Flask, OpenAI Whisper, Groq AI, Flask-CORS
- **AI Models**: Whisper "small" model (pre-loaded), Groq Llama-3.1-8b-instant

## Deployment Notes
- Frontend auto-deploys to Vercel on git push to main
- Backend requires manual ngrok tunnel setup for development
- Update VITE_API_URL in Vercel dashboard when ngrok URL changes
- No production backend deployment currently configured