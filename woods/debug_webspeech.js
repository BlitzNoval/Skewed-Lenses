// Improved Web Speech API implementation for debugging
// This fixes the second sentence breaking issue

const startWebSpeechRecognition = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Web Speech API not supported, using Whisper only')
    return
  }

  // Stop any existing recognition first
  if (recognition) {
    recognition.stop()
    setRecognition(null)
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const newRecognition = new SpeechRecognition()

  newRecognition.continuous = true
  newRecognition.interimResults = true
  newRecognition.lang = 'en-US'

  newRecognition.onresult = (event) => {
    let finalText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript
      }
    }

    // Process for instant visual feedback
    if (finalText.trim()) {
      console.log('Web Speech detected:', finalText.trim())
      checkWordsRealTime(finalText)
    }
  }

  newRecognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error)

    // Don't restart on certain errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      // These are recoverable, try to restart
      setTimeout(() => {
        if (isRecording) {
          console.log('Restarting speech recognition after error:', event.error)
          startWebSpeechRecognition()
        }
      }, 1000)
    }
  }

  newRecognition.onend = () => {
    console.log('Speech recognition ended, isRecording:', isRecording)

    // Only auto-restart if still recording and recognition wasn't manually stopped
    if (isRecording && recognition === newRecognition) {
      setTimeout(() => {
        if (isRecording && recognition === newRecognition) {
          console.log('Auto-restarting speech recognition')
          try {
            newRecognition.start()
          } catch (error) {
            console.error('Failed to restart recognition:', error)
            // Create completely new recognition instance
            startWebSpeechRecognition()
          }
        }
      }, 100)
    }
  }

  newRecognition.onstart = () => {
    console.log('Speech recognition started for sentence:', currentSentenceIndex)
  }

  try {
    newRecognition.start()
    setRecognition(newRecognition)
    console.log('New speech recognition instance created')
  } catch (error) {
    console.error('Failed to start speech recognition:', error)
  }
}

// Improved stop function
const stopRecording = () => {
  console.log('Stopping recording...')
  setIsRecording(false)

  // Clear sentence timeout
  if (sentenceTimeout) {
    clearTimeout(sentenceTimeout)
    setSentenceTimeout(null)
  }

  // Stop MediaRecorder for Whisper
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }

  // Stop Web Speech API - important to set recognition to null AFTER stopping
  if (recognition) {
    recognition.stop()
    // Small delay before clearing reference to prevent restart
    setTimeout(() => {
      setRecognition(null)
    }, 200)
  }
}