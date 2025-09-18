import { useState, useRef } from 'react'
import './VoiceRecorder.css'

const readingPassages = {
  1: {
    title: "Church Pears (Beginning)",
    text: "The church on our street has a big parking lot. On a patch of grass at one end is a pear tree. The church lot and its tree are our playground. Most days there are no cars in the lot. On those days, my brother and I ride our bikes around and around. But our favorite thing is to climb the church pear tree. We have climbed that tree a hundred times."
  },
  2: {
    title: "Puppy Love (End)",
    text: "A puppy needs love and care just like a baby. The most important thing a puppy needs is to get his shots from the doctor. These are a few other things a puppy needs: a leash, food dish, dog food, a brush and a small cage."
  },
  3: {
    title: "Pay Phones (Middle)",
    text: "Do you know what a pay phone is? In the old days when people were not home and wanted to make a phone call, they had to use a pay phone. There were no cell phones back then."
  }
}

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('free') // 'free' or 'reading'
  const [selectedPassage, setSelectedPassage] = useState(null)
  const [readingResults, setReadingResults] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startRecording = async () => {
    try {
      setError('')
      setTranscription('')
      setAnalysis('')
      window.debugLog?.('requesting microphone access...', 'info')
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      window.debugLog?.('microphone access granted', 'success')
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          window.debugLog?.(`audio chunk received: ${event.data.size} bytes`, 'info')
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        window.debugLog?.(`total chunks: ${audioChunksRef.current.length}`, 'info')

        if (audioChunksRef.current.length === 0) {
          window.debugLog?.('no audio data recorded', 'error')
          setError('No audio data was recorded')
          setIsProcessing(false)
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        window.debugLog?.(`created blob: ${audioBlob.size} bytes`, 'info')
        await sendAudioToBackend(audioBlob)

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start(1000)
      setIsRecording(true)
      window.debugLog?.('recording started', 'success')
      
    } catch (err) {
      const errorMsg = 'Could not access microphone: ' + err.message
      setError(errorMsg)
      window.debugLog?.(errorMsg, 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
      window.debugLog?.('recording stopped, processing...', 'info')
    }
  }

  const sendAudioToBackend = async (audioBlob) => {
    try {
      window.debugLog?.(`sending ${Math.round(audioBlob.size/1024)}kb audio to backend`, 'info')
      window.debugLog?.(`blob type: ${audioBlob.type}`, 'info')
      window.debugLog?.(`blob size: ${audioBlob.size} bytes`, 'info')

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      // Log FormData contents
      for (let pair of formData.entries()) {
        window.debugLog?.(`FormData: ${pair[0]} = ${pair[1].size || pair[1]} bytes`, 'info')
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      window.debugLog?.(`backend responded with status: ${response.status}`, 'info')
      
      const result = await response.json()
      
      if (result.success) {
        setTranscription(result.text)
        window.debugLog?.(`transcription received: "${result.text.substring(0, 50)}..."`, 'success')

        // Automatically analyze the transcription
        await analyzeText(result.text)
      } else {
        const errorMsg = 'Transcription failed: ' + result.error
        setError(errorMsg)
        window.debugLog?.(errorMsg, 'error')
      }
      
    } catch (err) {
      const errorMsg = 'Failed to connect to server: ' + err.message
      setError(errorMsg)
      window.debugLog?.(errorMsg, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const analyzeText = async (text) => {
    try {
      setIsAnalyzing(true)
      window.debugLog?.('starting AI analysis...', 'info')

      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'

      const payload = { text: text }

      // If in reading mode, include expected text for comparison
      if (mode === 'reading' && selectedPassage) {
        payload.expectedText = readingPassages[selectedPassage].text
        payload.mode = 'reading'
      } else {
        payload.mode = 'free'
      }

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        if (mode === 'reading') {
          setReadingResults(result)
        }
        setAnalysis(result.analysis)
        window.debugLog?.('AI analysis complete', 'success')
      } else {
        const errorMsg = 'Analysis failed: ' + result.error
        setError(errorMsg)
        window.debugLog?.(errorMsg, 'error')
      }

    } catch (err) {
      const errorMsg = 'Analysis error: ' + err.message
      setError(errorMsg)
      window.debugLog?.(errorMsg, 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="voice-recorder">
      <h2>audio input</h2>

      {/* Mode selection */}
      <div className="mode-selection">
        <button
          onClick={() => {
            setMode('free')
            setSelectedPassage(null)
            setReadingResults(null)
            setTranscription('')
            setAnalysis('')
          }}
          className={`mode-btn ${mode === 'free' ? 'active' : ''}`}
        >
          FREE SPEECH
        </button>
        <button
          onClick={() => {
            setMode('reading')
            setSelectedPassage(null)
            setReadingResults(null)
            setTranscription('')
            setAnalysis('')
          }}
          className={`mode-btn ${mode === 'reading' ? 'active' : ''}`}
        >
          READING ASSESSMENT
        </button>
      </div>

      {/* Passage selection for reading mode */}
      {mode === 'reading' && !selectedPassage && (
        <div className="passage-selection">
          <h3>select reading passage:</h3>
          {Object.entries(readingPassages).map(([id, passage]) => (
            <button
              key={id}
              onClick={() => setSelectedPassage(parseInt(id))}
              className="passage-btn"
            >
              Passage {id}: {passage.title}
            </button>
          ))}
        </div>
      )}

      {/* Reading passage display */}
      {mode === 'reading' && selectedPassage && (
        <div className="reading-passage">
          <h3>read this passage aloud:</h3>
          <div className="passage-text">
            {readingPassages[selectedPassage].text}
          </div>
          <button
            onClick={() => {
              setSelectedPassage(null)
              setReadingResults(null)
              setTranscription('')
              setAnalysis('')
            }}
            className="change-passage-btn"
          >
            CHANGE PASSAGE
          </button>
        </div>
      )}

      <div className="recorder-controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="record-btn"
            disabled={isProcessing || (mode === 'reading' && !selectedPassage)}
          >
            {mode === 'reading' ? 'START READING' : 'START REC'}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="stop-btn"
          >
            STOP
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse">REC</span>
        </div>
      )}

      {isProcessing && (
        <div className="processing">
          <span>transcribing audio...</span>
        </div>
      )}

      {isAnalyzing && (
        <div className="processing">
          <span>analyzing for dyslexia indicators...</span>
        </div>
      )}

      {transcription && (
        <div className="transcription">
          <h3>transcript:</h3>
          <p>{transcription}</p>
        </div>
      )}

      {analysis && (
        <div className="analysis">
          <h3>dyslexia screening analysis:</h3>
          <p>{analysis}</p>
        </div>
      )}

      {/* Reading comparison results */}
      {mode === 'reading' && readingResults && (
        <div className="reading-comparison">
          <h3>reading accuracy comparison:</h3>
          <div className="comparison-sections">
            <div className="expected-section">
              <h4>expected text:</h4>
              <p className="expected-text">{readingPassages[selectedPassage].text}</p>
            </div>
            <div className="actual-section">
              <h4>what you read:</h4>
              <p className="actual-text">{transcription}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error">
          <h3>error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default VoiceRecorder