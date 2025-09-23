import { useEffect, useCallback } from 'react'
import useSpeechStore from '../store/useSpeechStore'

const useSpeechRecognition = () => {
  const {
    isListening,
    isSupported,
    setListening,
    setTranscript,
    setInterimTranscript,
    setRecognition,
    recognition,
    processSpokenWords,
    cleanup
  } = useSpeechStore()

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.warn('Speech recognition not supported')
      return
    }

    if (recognition && isListening) {
      console.log('Already listening')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    try {
      const newRecognition = new SpeechRecognition()

      newRecognition.continuous = true
      newRecognition.interimResults = true
      newRecognition.lang = 'en-US'

      newRecognition.onstart = () => {
        console.log('🎤 Speech recognition started')
        setListening(true)
      }

      newRecognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setInterimTranscript(interimTranscript)

        if (finalTranscript.trim()) {
          console.log('📝 Final transcript:', finalTranscript)
          setTranscript(finalTranscript)
          processSpokenWords(finalTranscript)
        }
      }

      newRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.')
        }
      }

      newRecognition.onend = () => {
        console.log('🔇 Speech recognition ended')
        setListening(false)

        // Auto-restart if we're still supposed to be listening
        if (isListening) {
          console.log('🔄 Auto-restarting recognition')
          setTimeout(() => {
            if (isListening) {
              newRecognition.start()
            }
          }, 100)
        }
      }

      newRecognition.start()
      setRecognition(newRecognition)

    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      setListening(false)
    }
  }, [isSupported, recognition, isListening, setListening, setTranscript, setInterimTranscript, setRecognition, processSpokenWords])

  const stopListening = useCallback(() => {
    if (recognition) {
      console.log('🛑 Stopping speech recognition')
      recognition.stop()
      setListening(false)
    }
  }, [recognition, setListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening
  }
}

export default useSpeechRecognition