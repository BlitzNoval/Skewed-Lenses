from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Load the Whisper model
print("Loading Whisper model...")
model = whisper.load_model("small")
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

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model': 'whisper-small'})

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(debug=True, port=5001, threaded=True)