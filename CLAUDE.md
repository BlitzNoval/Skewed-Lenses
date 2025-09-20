# Memory for Claude

This file contains important information that Claude should remember between conversations.

## Project Structure
- Frontend: React/Vite app deployed on Vercel
- Backend: Flask app with Whisper integration (local development)

## Backend Setup (Windows PowerShell)
```powershell
# Navigate to backend folder
cd "C:\Users\ljmoo\OneDrive\Desktop\Skewed-Lenses\woods\backend"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies (if needed)
pip install openai-whisper flask flask-cors groq

# Run Flask backend (pre-loads Whisper model)
python app.py
# Should see: "Pre-loading Whisper model..." then "Model ready!"
# Runs on http://127.0.0.1:5001

# In separate PowerShell window - run ngrok
ngrok http 5001
# Current URL: https://c5b1ad892f23.ngrok-free.app
```

## Backend Features
- `/transcribe` - Full audio transcription (main endpoint)
- `/transcribe-stream` - Real-time chunks (backup)
- `/analyze` - Dyslexia analysis with Groq AI
- Pre-loaded Whisper "small" model for instant response
- CORS enabled for Vercel frontend

## Frontend API Integration
- Uses `import.meta.env.VITE_API_URL` environment variable
- Set in Vercel dashboard to current ngrok URL
- Audio recording ’ WebM blob ’ POST to `/transcribe`

## Development Commands
```bash
# Frontend development
npm run dev

# Backend development (Windows)
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

## Deployment
- Frontend: Auto-deploys to Vercel on git push
- Backend: Local development with ngrok tunnel

## Environment Variables
- VITE_API_URL: Set in Vercel dashboard to ngrok URL (https://c5b1ad892f23.ngrok-free.app)

## Current Status
- Benchmark 1: Fully functional speech-to-text with word highlighting
- Backend: Pre-loaded Whisper model ready for instant transcription
- Frontend: Connected via environment variable to ngrok tunnel

## DIBELS Passages
Three reading passages for random selection:
1. Crows (about bird behavior and diet)
2. Government (about laws and power structures)
3. Digital Music Recording (about music technology evolution)