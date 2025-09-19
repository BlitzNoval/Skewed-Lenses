STARTUP GUIDE - WOODS DYSLEXIA SCREENING TOOL

1. Navigate to project:
   cd C:\Users\ljmoo\OneDrive\Desktop\Skewed-Lenses

2. Backend Setup:
   cd woods\backend
   python -m venv venv (if venv doesn't exist)
   .\venv\Scripts\Activate.ps1
   pip install flask flask-cors groq openai-whisper (if not installed)
   python app.py

3. Start ngrok (new PowerShell window):
   ngrok http 5001
   Copy the https://abc123.ngrok-free.app URL

4. Update Vercel Environment:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Update VITE_API_URL to the ngrok URL from step 3
   - Redeploy if needed

5. Frontend (optional local testing):
   cd C:\Users\ljmoo\OneDrive\Desktop\Skewed-Lenses\woods
   npm run dev (requires Node.js 20.19+ or 22.12+)
   http://localhost:5173

6. Production URL:
   https://skewed-lenses.vercel.app

FEATURES:
- Free Speech Mode: General dyslexia screening
- Reading Assessment: DIBELS validated passages with comparison
- Real-Time Transcription: Live word highlighting (green=correct, red=incorrect, orange=current)
- Progress tracking with words-per-minute and completion percentage 