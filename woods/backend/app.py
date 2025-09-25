from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import time
from groq import Groq

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

@app.after_request
def after_request(response):
    response.headers.add('ngrok-skip-browser-warning', 'true')
    return response

# Initialize Groq client
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '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')
groq_client = Groq(api_key=GROQ_API_KEY)

# Lazy load Whisper model
model = None
is_transcribing = False

def get_whisper_model():
    global model
    if model is None:
        print("Loading Whisper model...")
        import whisper
        model = whisper.load_model("small")
        print("Model loaded successfully!")
    return model

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    global is_transcribing

    try:
        print("Transcribe request received")

        # Skip if already transcribing (prevent queue buildup)
        if is_transcribing:
            print("Already transcribing, skipping request")
            return jsonify({'error': 'Busy transcribing', 'success': False}), 429

        is_transcribing = True

        # Check if audio file is in request
        if 'audio' not in request.files:
            print("No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        print(f"Audio file received: {audio_file.filename}")
        print(f"Content length: {audio_file.content_length}")
        print(f"Content type: {audio_file.content_type}")

        # Read the actual data
        audio_data = audio_file.read()
        print(f"Actual data size: {len(audio_data)} bytes")

        if len(audio_data) == 0:
            print("No audio data received")
            return jsonify({'error': 'No audio data received'}), 400

        # Skip very small files (likely incomplete)
        if len(audio_data) < 10000:  # 10KB minimum
            print("Audio file too small, skipping")
            return jsonify({'error': 'Audio file too small', 'success': False}), 400

        # Save the data to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
            print(f"Audio saved to: {temp_path} ({len(audio_data)} bytes)")

        try:
            # Verify file exists and is readable
            print(f"Starting transcription of: {temp_path}")
            print(f"File exists: {os.path.exists(temp_path)}")
            print(f"File size on disk: {os.path.getsize(temp_path)} bytes")

            # Try to transcribe
            whisper_model = get_whisper_model()
            result = whisper_model.transcribe(temp_path)
            print(f"Transcription successful: {result['text']}")

            return jsonify({
                'text': result['text'],
                'language': result['language'],
                'success': True
            })
        except Exception as transcribe_error:
            print(f"Transcription failed: {transcribe_error}")
            print(f"Error type: {type(transcribe_error)}")
            raise transcribe_error
        finally:
            # Always clean up the temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                print(f"Cleaned up temp file: {temp_path}")

    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
    finally:
        is_transcribing = False

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        text = data['text']
        mode = data.get('mode', 'free')  # 'free' or 'reading'
        expected_text = data.get('expectedText', None)

        print(f"Analyzing text in {mode} mode: {text[:100]}...")

        if mode == 'reading' and expected_text:
            # Reading assessment analysis with comparison
            print(f"Expected text: {expected_text[:100]}...")

            prompt = f"""Compare the expected reading passage with what the user actually read aloud. Analyze for dyslexia-specific reading indicators:

EXPECTED TEXT:
"{expected_text}"

ACTUAL READING:
"{text}"

Please analyze:
1. Word accuracy - exact matches vs substitutions/omissions
2. Dyslexia-specific patterns:
   - Letter reversals (b/d, p/q, etc.)
   - Word substitutions (similar looking words)
   - Omitted or added words
   - Phonetic errors or complex sound confusion
3. Reading fluency indicators
4. Overall reading accuracy percentage

Provide:
- Detailed comparison highlighting specific differences
- Dyslexia risk assessment (Low/Medium/High) based on reading errors
- Specific patterns that suggest dyslexia vs. normal reading errors"""

        elif mode == 'reading_pace':
            # Reading pace assessment analysis
            reading_metrics = data.get('readingMetrics', {})
            wpm = reading_metrics.get('wordsPerMinute', 0)
            skip_rate = reading_metrics.get('skipRate', 0)
            completion_rate = reading_metrics.get('completionRate', 0)

            prompt = f"""Analyze these reading pace metrics for potential dyslexia indicators:

READING METRICS:
- Words per minute: {wpm}
- Skip rate: {skip_rate}%
- Completion rate: {completion_rate}%
- Total words attempted: {reading_metrics.get('totalWords', 0)}
- Words marked correct: {reading_metrics.get('correctWords', 0)}
- Time spent: {reading_metrics.get('timeElapsed', 0)} seconds

Compare against typical reading speeds:
- Average adult reading speed: 200-250 WPM
- Slow reading (potential indicator): <150 WPM
- High skip rate (potential indicator): >15%

Please provide:
1. Assessment of reading speed relative to typical ranges
2. Analysis of skip patterns and what they might indicate
3. Overall dyslexia risk assessment (Low/Medium/High) based on these metrics
4. Recommendations for the user about potential next steps

Be supportive and encouraging while providing helpful insights."""

        elif mode == 'comprehensive_analysis':
            # Comprehensive analysis of both benchmarks
            combined_results = data.get('combinedResults', {})

            prompt = text  # Use the full prompt provided from frontend

        else:
            # Free speech analysis (original prompt)
            prompt = f"""Analyze this speech transcript for potential dyslexia indicators. Look for:
- Reading difficulties or hesitations
- Word substitutions or mispronunciations
- Letter/sound confusion
- Rhythm and fluency issues
- Self-corrections or struggles

Text: "{text}"

Provide a brief analysis and risk assessment (Low/Medium/High) for dyslexia indicators."""

        # Call Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.1-8b-instant",  # Current fast Llama model
            temperature=0.1,  # Low temperature for consistent analysis
            max_tokens=1000
        )

        analysis = chat_completion.choices[0].message.content
        print(f"Analysis complete: {analysis[:100]}...")

        response_data = {
            'analysis': analysis,
            'success': True,
            'original_text': text,
            'mode': mode
        }

        if mode == 'reading' and expected_text:
            response_data['expected_text'] = expected_text

        return jsonify(response_data)

    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/transcribe-stream', methods=['POST'])
def transcribe_stream():
    try:
        print("Stream transcribe request received")

        if 'audio' not in request.files:
            return jsonify({'error': 'No audio chunk provided'}), 400

        audio_file = request.files['audio']
        chunk_id = request.form.get('chunk_id', '0')

        print(f"Processing audio chunk {chunk_id}: {audio_file.filename}")

        audio_data = audio_file.read()
        print(f"Chunk data size: {len(audio_data)} bytes")

        if len(audio_data) == 0:
            return jsonify({'error': 'No audio data in chunk'}), 400

        # Save chunk to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        try:
            # Process chunk with Whisper
            whisper_model = get_whisper_model()
            result = whisper_model.transcribe(temp_path)
            transcribed_text = result['text'].strip()

            print(f"Chunk {chunk_id} transcribed: '{transcribed_text}'")

            return jsonify({
                'text': transcribed_text,
                'chunk_id': chunk_id,
                'confidence': result.get('segments', [{}])[0].get('avg_logprob', 0) if result.get('segments') else 0,
                'success': True
            })

        except Exception as transcribe_error:
            print(f"Stream transcription failed: {transcribe_error}")
            return jsonify({'error': str(transcribe_error), 'success': False}), 500

        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model': 'whisper-small'})

@app.route('/', methods=['GET'])
def root():
    return jsonify({'message': 'Woods Dyslexia Screening API', 'status': 'running'})

if __name__ == '__main__':
    print("Starting Flask server...")
    print("Pre-loading Whisper model...")
    get_whisper_model()  # Pre-load the model
    print("Model ready!")
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)