# Project Context - Dyslexia Screening Tool

## Project Name
Skewed Lenses - AI-Powered Dyslexia Screening Tool

## Purpose
A web-based dyslexia screening tool that uses AI to analyze multiple types of user input and provide screening insights (not diagnosis). This is an accessibility-first application designed to help identify potential dyslexia indicators through multi-modal assessment.

## Target Audience
- Individuals seeking dyslexia screening
- Educational professionals
- Healthcare providers as a screening aid
- Parents and caregivers

## Core Assessments
1. **Reading Assessment** - User reads text aloud, system analyzes speech patterns
2. **Typing Assessment** - User types text, system analyzes keystroke patterns and errors  
3. **Phonological Assessment** - User responds to sound-based tasks

## Technology Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Speech Processing:** Web Speech API (browser native)
- **AI Analysis:** OpenAI GPT-4 or Anthropic Claude
- **Additional APIs:** 
  - Sesame AI (phonetic analysis)
  - TypingDNA (keystroke analysis)
- **Runtime:** Node.js 22.19.0

## Data Flow
1. User completes assessments (speech, typing, phonological tasks)
2. Multiple AI services analyze the data for dyslexia-related patterns
3. Results are synthesized into a screening report with recommendations
4. Everything runs in browser - no backend storage

## Key Requirements
- **Accessibility-first design** (dyslexia-friendly UI)
- **Ethical boundaries** - screening aid, NOT diagnostic tool
- **Multi-modal analysis** - combining speech, typing, and cognitive data
- **Real-time processing** with fallback handling for API failures

## Development Timeline
- **Current Phase:** 10-day prototype with reading + typing assessments
- **Next Phase:** Full MVP over 2 months including phonological assessment

## Development Notes
- Local development server runs on http://localhost:5173/
- Created with Vite React template
- Focus on proof of concept first, then expand functionality

## Ethical Considerations
- Clear disclaimers that this is a screening tool, not a diagnostic tool
- Privacy-focused (no data storage)
- Accessible design principles throughout