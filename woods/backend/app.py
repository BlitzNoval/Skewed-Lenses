from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import time
from groq import Groq

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

# Initialize Groq client
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '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')
groq_client = Groq(api_key=GROQ_API_KEY)

# Load the Whisper model
print("Loading Whisper model...")
model = whisper.load_model("tiny")  # 39MB vs 244MB for faster deployment
print("Model loaded successfully!")

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    try:
        print("Transcribe request received")

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
            result = model.transcribe(temp_path)
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

@app.route('/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        text = data['text']
        print(f"Analyzing text: {text[:100]}...")

        # Create prompt for dyslexia screening
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

        return jsonify({
            'analysis': analysis,
            'success': True,
            'original_text': text
        })

    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model': 'whisper-tiny'})

@app.route('/', methods=['GET'])
def root():
    return jsonify({'message': 'Woods Dyslexia Screening API', 'status': 'running'})

if __name__ == '__main__':
    print("Starting Flask server...")
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)