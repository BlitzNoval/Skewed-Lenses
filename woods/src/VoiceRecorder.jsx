import { useState, useRef } from 'react'
import './VoiceRecorder.css'

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  
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
        body: formData
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
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
      })

      const result = await response.json()

      if (result.success) {
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
      
      <div className="recorder-controls">
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            className="record-btn"
            disabled={isProcessing}
          >
            START REC
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