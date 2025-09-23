import React, { useState, useRef } from 'react'
import './App.css'
import OneInTen from './components/Globe'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [benchmarkComplete, setBenchmarkComplete] = useState({
    benchmark1: false,
    benchmark2: false,
    benchmark3: false
  })
  const [showBenchmark1Modal, setShowBenchmark1Modal] = useState(false)
  const [showBenchmark2Modal, setShowBenchmark2Modal] = useState(false)
  const [showBenchmark3Modal, setShowBenchmark3Modal] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [showRecordingInterface, setShowRecordingInterface] = useState(false)
  const [buttonsSlideOut, setButtonsSlideOut] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [audioChunks, setAudioChunks] = useState([])
  const [transcribedText, setTranscribedText] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [wordStatuses, setWordStatuses] = useState([])
  const [currentExpectedWordIndex, setCurrentExpectedWordIndex] = useState(0)
  const [sentences, setSentences] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [sentenceWordStatuses, setSentenceWordStatuses] = useState([])
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownNumber, setCountdownNumber] = useState(5)
  const [testStarted, setTestStarted] = useState(false)
  const [countdownFlyOut, setCountdownFlyOut] = useState(false)
  const [whisperTranscriptions, setWhisperTranscriptions] = useState([])
  const [showBeginButton, setShowBeginButton] = useState(true)
  const [countdownExiting, setCountdownExiting] = useState(false)
  const [sentenceTimeout, setSentenceTimeout] = useState(null)
  // state + refs for state machine approach
  const [speechTransitioning, setSpeechTransitioning] = useState(false)
  const recognitionIdRef = useRef(null)

  // Add these refs and state for debugging speech recognition
  const currentSentenceIndexRef = useRef(0)
  const sentencesRef = useRef([])
  const processedWordsRef = useRef(new Set()) // NEW: Track processed words to prevent double counting
  // NEW refs to keep synchronous/accurate per-event indexing
  const currentExpectedWordIndexRef = useRef(0)
  const sentenceWordStatusesRef = useRef([])

  // DIBELS passages
  const passages = [
    "Crows are scavengers. The birds will eat almost anything, from vegetables and fruit, to nuts and seeds. They'll devour insects, frogs, lizards, mice, smaller birds, basically any animal they can fit into their mouths. And they'll happily pick at the flesh of carrion, which probably accounts for why ancient people associated crows with death. Crows are playful birds, very sociable with their own kind, and they live in large extended family groups. They frequently indulge in silly games, such as carrying a twig high into the air, dropping it, then quickly swooping down and catching it. They've also been observed executing acrobatic backflips in flight.",

    "Societies tend to function best when there are well-defined laws. Yet, even more important than the laws are the people who get to decide, enact, and enforce those laws. The people and structures that make those decisions are called government. Worldwide there are many types of government. These function at local, regional, and national levels. In all instances, government is the basis of power and control. But even when power is shared among people, problems arise. So, no form of rule is perfect.",

    "Just a little over a century ago, the only way to enjoy music was to play it or listen to it in person. Then, with the discovery of radio waves and the invention of recording technology, people could enjoy music anytime. Today, digital recordings make enjoying music even easier and more portable than ever. However, the process of producing music has become more complex. Prior to the sale of the first compact disc, or CD, music was sold and listened to on wax cylinders, phonographs, vinyl records, or cassette tapes. Although most of these technologies are thought to be obsolete, you can still buy music in these formats."
  ]

  const [selectedPassage] = useState(() => Math.floor(Math.random() * passages.length))
  const passage = passages[selectedPassage]
  const words = passage.split(' ')

  // Function to break passage into 30-word test chunks, then into 5-word sentences
  const createTestChunks = (passageText) => {
    const cleanedText = passageText.replace(/[.,!?;]/g, '')
    const allWords = cleanedText.split(' ').filter(w => w.trim())

    // Create 30-word chunks
    const testChunks = []
    for (let i = 0; i < allWords.length; i += 30) {
      const chunk = allWords.slice(i, i + 30)
      if (chunk.length >= 30) { // Only use complete 30-word chunks
        testChunks.push(chunk)
      }
    }
    return testChunks
  }

  const createSentences = (thirtyWords) => {
    const sentenceChunks = []
    for (let i = 0; i < thirtyWords.length; i += 5) {
      const chunk = thirtyWords.slice(i, i + 5)
      if (chunk.length === 5) { // Only use complete 5-word sentences
        sentenceChunks.push(chunk)
      }
    }
    return sentenceChunks
  }

  // Keep refs in sync with state
  React.useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex
  }, [currentSentenceIndex])

  React.useEffect(() => {
    sentencesRef.current = sentences
  }, [sentences])

  // keep ref mirrors in sync with state
  React.useEffect(() => {
    currentExpectedWordIndexRef.current = currentExpectedWordIndex
  }, [currentExpectedWordIndex])

  React.useEffect(() => {
    sentenceWordStatusesRef.current = sentenceWordStatuses
  }, [sentenceWordStatuses])

  // Initialize word statuses and sentences (0 = unread, 1 = correct, 2 = incorrect)
  React.useEffect(() => {
    setWordStatuses(new Array(words.length).fill(0))
    setCurrentExpectedWordIndex(0)

    // Get all possible 30-word chunks from the passage
    const testChunks = createTestChunks(passage)

    if (testChunks.length > 0) {
      // Randomly select one 30-word chunk
      const randomChunkIndex = Math.floor(Math.random() * testChunks.length)
      const selectedThirtyWords = testChunks[randomChunkIndex]

      // Break the 30 words into 6 sentences of 5 words each
      const sentenceChunks = createSentences(selectedThirtyWords)
      setSentences(sentenceChunks)
      setCurrentSentenceIndex(0)
      setSentenceWordStatuses(new Array(5).fill(0)) // Max 5 words per sentence
      sentenceWordStatusesRef.current = new Array(5).fill(0) // NEW
      setTotalCorrect(0)
      setTotalWords(30) // Always 30 words now

      console.log('Selected 30-word chunk:', selectedThirtyWords)
      console.log('Created sentences:', sentenceChunks)
    }
  }, [words.length, passage])

  const handlePageTransition = (page) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 500)
  }

  const handleBenchmarkClick = (benchmarkKey) => {
    if (benchmarkKey === 'benchmark1') {
      setShowBenchmark1Modal(true)
    } else if (benchmarkKey === 'benchmark2') {
      setShowBenchmark2Modal(true)
    } else if (benchmarkKey === 'benchmark3') {
      setShowBenchmark3Modal(true)
    } else {
      setBenchmarkComplete(prev => ({
        ...prev,
        [benchmarkKey]: !prev[benchmarkKey]
      }))
    }
  }

  const closeModal = (modalSetter) => {
    setModalClosing(true)
    setTimeout(() => {
      modalSetter(false)
      setModalClosing(false)
    }, 300)
  }

  const startBenchmark1 = () => {
    setShowBenchmark1Modal(false)
    setButtonsSlideOut(true)
    setTimeout(() => {
      setShowRecordingInterface(true)
    }, 800)
  }

  const startRecording = (id) => {
    const newId = id ?? Date.now()
    recognitionIdRef.current = newId

    console.log(`🚀 Attempted to start recognition ${newId}`)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Recording not supported in this browser')
      return
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Start Web Speech API for instant feedback
        startWebSpeechRecognition(newId)

        // Start MediaRecorder for Whisper accuracy verification
        const newMediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        const chunks = []

        newMediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        newMediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          transcribeWithWhisper(audioBlob) // Background verification
          stream.getTracks().forEach(track => track.stop())
        }

        newMediaRecorder.start()
        setMediaRecorder(newMediaRecorder)
        setIsRecording(true)

        // Reset tracking state for new sentence
        setCurrentExpectedWordIndex(0)
        currentExpectedWordIndexRef.current = 0
        setCurrentWordIndex(0)
        setTranscribedText('')
        setSentenceWordStatuses(new Array(5).fill(0))
        sentenceWordStatusesRef.current = new Array(5).fill(0)
        processedWordsRef.current.clear() // Clear processed words for new sentence

        // Clear any existing timeout first
        if (sentenceTimeout) {
          clearTimeout(sentenceTimeout)
          setSentenceTimeout(null)
        }

        // Set timeout to auto-advance if no progress for 30 seconds
        const timeout = setTimeout(() => {
          console.log('⏱ Timeout — skipping sentence due to inactivity')
          onSentenceComplete()
        }, 30000) // 30 seconds timeout for inactivity
        setSentenceTimeout(timeout)
      })
      .catch(error => {
        console.error('Error accessing microphone:', error)
        alert('Error accessing microphone')
      })
  }

  const startWebSpeechRecognition = (id) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported, using Whisper only')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const newRecognition = new SpeechRecognition()

    console.log(`Starting recognition instance: ${id}`)
    recognitionIdRef.current = id // Use the passed ID

    newRecognition.continuous = true
    newRecognition.interimResults = true
    newRecognition.lang = 'en-US'

    newRecognition.onresult = (event) => {
      console.log(`📝 Got result from recognition ${id}, current instance is ${recognitionIdRef.current}`)

      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }

      if (finalText.trim()) {
        checkWordsRealTime(event, id)
      }
    }

    newRecognition.onerror = (event) => {
      if (id === recognitionIdRef.current) {
        console.error(`Speech recognition error for instance ${id}:`, event.error)
      }
    }

    newRecognition.onend = () => {
      if (id === recognitionIdRef.current && isRecording) {
        console.log(`Recognition ${id} ended, considering restart...`)
        setTimeout(() => {
          if (id === recognitionIdRef.current && isRecording) {
            console.log(`Restarting recognition ${id}`)
            newRecognition.start()
          }
        }, 100)
      }
    }

    // Keep debug logging
    newRecognition.onstart = () => {
      console.log(`✅ Recognition ${id} started and listening`)
    }

    newRecognition.onspeechstart = () => {
      console.log(`🎤 Speech detected by recognition ${id}`)
    }

    newRecognition.onsoundstart = () => {
      console.log(`🔊 Sound detected by recognition ${id}`)
    }

    newRecognition.onaudiostart = () => {
      console.log(`🎵 Audio input started for recognition ${id}`)
    }

    newRecognition.onnomatch = () => {
      console.log(`❌ No match found by recognition ${id}`)
    }

    try {
      newRecognition.start()
      console.log(`🚀 Started recognition ${id}`)
      setRecognition(newRecognition)
    } catch (error) {
      console.error(`💥 Failed to start recognition ${id}:`, error)
    }
  }

  const stopRecording = () => {
    console.log('Stopping recording and recognition')
    setIsRecording(false)

    // Clear sentence timeout
    if (sentenceTimeout) {
      clearTimeout(sentenceTimeout)
      setSentenceTimeout(null)
    }


    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }

    // Completely kill speech recognition
    if (recognition) {
      try {
        // Clear instance ID ref to prevent any new events
        recognitionIdRef.current = null

        // Remove ALL event handlers
        recognition.onresult = null
        recognition.onend = null
        recognition.onerror = null
        recognition.onnomatch = null
        recognition.onspeechend = null
        recognition.onaudiostart = null
        recognition.onaudioend = null
        recognition.onsoundstart = null
        recognition.onsoundend = null
        recognition.onspeechstart = null
        recognition.onstart = null

        // Force abort
        recognition.abort()

        // Clear the reference
        setRecognition(null)
        console.log('Recognition stopped and cleared')
      } catch (error) {
        console.warn('Error stopping speech recognition:', error)
        setRecognition(null)
      }
    }
  }

  const transcribeWithWhisper = async (audioBlob) => {
    try {
      setIsTranscribing(true)

      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Backend response:', data)

      // Backend returns "text" not "transcription"
      if (data.text) {
        // Save Whisper transcription for current sentence (hidden from user)
        setWhisperTranscriptions(prev => {
          const newTranscriptions = [...prev]
          newTranscriptions[currentSentenceIndex] = {
            sentenceIndex: currentSentenceIndex,
            expectedWords: sentences[currentSentenceIndex],
            whisperTranscription: data.text,
            timestamp: new Date().toISOString()
          }
          return newTranscriptions
        })

        console.log('Whisper transcription saved for sentence', currentSentenceIndex, ':', data.text)
      } else if (data.transcription) {
        // Save Whisper transcription for current sentence (hidden from user)
        setWhisperTranscriptions(prev => {
          const newTranscriptions = [...prev]
          newTranscriptions[currentSentenceIndex] = {
            sentenceIndex: currentSentenceIndex,
            expectedWords: sentences[currentSentenceIndex],
            whisperTranscription: data.transcription,
            timestamp: new Date().toISOString()
          }
          return newTranscriptions
        })

        console.log('Whisper transcription saved for sentence', currentSentenceIndex, ':', data.transcription)
      } else {
        console.error('Unexpected response format:', data)
        throw new Error('No transcription received')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Transcription failed. Make sure the backend is running.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const checkWordsRealTime = (event, id) => {
    // 1. Ignore if we're in transition
    if (speechTransitioning) {
      console.log("🚫 Ignoring result during transition")
      return
    }

    // 2. Ignore if this event is from a stale recognition instance
    if (id !== recognitionIdRef.current) {
      console.log(`⚠️ Ignoring stale result from old recognition ${id}`)
      return
    }

    // 3. Normal processing of words here
    const transcript = event.results[0][0].transcript.trim().toLowerCase()
    const words = transcript.split(/\s+/)

    // Ignore empty results
    if (!transcript || transcript.trim() === "") {
      console.log("⚠️ Ignored empty recognition result")
      return
    }

    console.log("📝 Processing words:", words)
    console.log(`📍 Current sentence index: ${currentSentenceIndex}, Expected words:`, sentencesRef.current[currentSentenceIndex])

    let localIndex = currentExpectedWordIndexRef.current
    const newStatuses = [...sentenceWordStatusesRef.current]
    let correctDelta = 0
    let matchedCount = 0

    words.forEach((spokenWord) => {
      // Ignore empty or whitespace-only words
      if (!spokenWord || spokenWord.trim() === "") {
        console.log("⚠️ Ignored empty word")
        return
      }

      if (localIndex >= sentencesRef.current[currentSentenceIndex].length) {
        return // Skip if sentence already complete
      }

      const expectedWord = sentencesRef.current[currentSentenceIndex][localIndex].toLowerCase().replace(/[.,!?;]/g, '')
      const cleanSpoken = spokenWord.replace(/[.,!?;]/g, '')

      const isMatch = cleanSpoken === expectedWord ||
                     cleanSpoken.includes(expectedWord) ||
                     expectedWord.includes(cleanSpoken) ||
                     (expectedWord.length > 3 && cleanSpoken.length > 3 &&
                      (expectedWord.startsWith(cleanSpoken.slice(0, 3)) ||
                       cleanSpoken.startsWith(expectedWord.slice(0, 3))))

      if (isMatch) {
        console.log(`✅ Matched word: ${cleanSpoken} (expected: ${expectedWord})`)
        newStatuses[localIndex] = 1
        correctDelta += 1
        matchedCount += 1
        localIndex++
      } else {
        console.log(`❌ Mismatch: heard "${cleanSpoken}", expected "${expectedWord}"`)
        newStatuses[localIndex] = 2
        localIndex++
      }
    })

    // Update React state once at the end
    setSentenceWordStatuses([...newStatuses])
    sentenceWordStatusesRef.current = newStatuses
    currentExpectedWordIndexRef.current = localIndex
    setCurrentExpectedWordIndex(localIndex)
    setTotalCorrect(prev => prev + correctDelta)

    // 4. Only complete if we actually matched all expected words
    if (localIndex >= sentencesRef.current[currentSentenceIndex].length && matchedCount > 0) {
      console.log(`✅ Sentence complete with ${matchedCount} matches`)
      onSentenceComplete()
    }
  }

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const onSentenceComplete = () => {
    console.log("✅ Sentence complete, stopping recognition")
    setSpeechTransitioning(true)
    stopRecording()

    // Clear any existing sentence timeout
    if (sentenceTimeout) {
      clearTimeout(sentenceTimeout)
      setSentenceTimeout(null)
    }

    // Defer advancing until recognizer fully shuts down
    setTimeout(() => {
      if (currentSentenceIndex < sentencesRef.current.length - 1) {
        moveToNextSentence()

        // Small buffer so recognition isn't overlapping
        setTimeout(() => {
          const newId = Date.now()
          recognitionIdRef.current = newId
          startRecording(newId)
          setSpeechTransitioning(false)
          console.log("▶️ Ready for next sentence")
        }, 500)
      } else {
        console.log("🏁 All sentences complete")
        setSpeechTransitioning(false)
      }
    }, 500) // small buffer so recognition isn't overlapping
  }

  const moveToNextSentence = () => {
    setCurrentSentenceIndex((prev) => {
      const next = prev + 1

      if (next < sentencesRef.current.length) {
        console.log(`➡️ Moving to sentence ${next}`)

        // reset progress
        setCurrentExpectedWordIndex(0)
        currentExpectedWordIndexRef.current = 0

        setSentenceWordStatuses(new Array(5).fill(0))
        sentenceWordStatusesRef.current = new Array(5).fill(0)

        processedWordsRef.current.clear()
        return next
      } else {
        console.log("🏁 All sentences complete.")
        stopRecording()
        return prev
      }
    })
  }

  const startTest = () => {
    setShowBeginButton(false)
    setShowCountdown(true)
    setCountdownNumber(5)

    // Simple countdown: 5, 4, 3, 2, 1, start
    const countdown = [5, 4, 3, 2, 1]
    let currentIndex = 0

    const countdownInterval = setInterval(() => {
      currentIndex++
      if (currentIndex < countdown.length) {
        setCountdownNumber(countdown[currentIndex])
      } else {
        clearInterval(countdownInterval)
        setShowCountdown(false)
        setTestStarted(true)
        startRecording()
      }
    }, 1000)
  }

  const completedCount = Object.values(benchmarkComplete).filter(Boolean).length
  const allComplete = completedCount === 3

  // Helper function to get all Whisper transcription data
  const getWhisperData = () => {
    return {
      testResults: whisperTranscriptions,
      totalScore: { correct: totalCorrect, total: totalWords },
      passageUsed: selectedPassage,
      testDate: new Date().toISOString()
    }
  }

  // Make Whisper data accessible globally for debugging/export
  window.getWhisperData = getWhisperData

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>

      <div className="dark-mode-toggle">
        <button
          className={`toggle-switch ${isDarkMode ? 'active' : ''}`}
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label="Toggle dark mode"
          title="Toggle between light and dark theme"
        >
          <div className="toggle-slider">
            <div className="toggle-icon">
              {isDarkMode ? '○' : '●'}
            </div>
          </div>
        </button>
      </div>

      {currentPage === 'home' && (
        <>
          <section className={`home-section ${isTransitioning ? 'slide-out-left' : 'slide-in-left'}`}>
            <div className="logo-container">
              <div className="logo-text shimmer-text">
                <span>
                  <span className="letter" style={{"--delay": "0s"}}>S</span>
                  <span className="letter" style={{"--delay": "0.1s"}}>k</span>
                  <span className="letter" style={{"--delay": "0.2s"}}>e</span>
                  <span className="letter" style={{"--delay": "0.3s"}}>w</span>
                  <span className="letter" style={{"--delay": "0.4s"}}>e</span>
                  <span className="letter" style={{"--delay": "0.5s"}}>d</span>
                  <span className="letter space" style={{"--delay": "0.6s"}}> </span>
                  <span className="word-lenses">
                    <span className="letter" style={{"--delay": "0.7s"}}>L</span>
                    <span className="letter" style={{"--delay": "0.8s"}}>e</span>
                    <span className="letter" style={{"--delay": "0.9s"}}>n</span>
                    <span className="letter" style={{"--delay": "1.0s"}}>s</span>
                    <span className="letter" style={{"--delay": "1.1s"}}>e</span>
                    <span className="letter" style={{"--delay": "1.2s"}}>s</span>
                  </span>
                </span>
              </div>
              <div className="subtitle">
                Dyslexia through the lens of generative AI
              </div>
              <div className="button-container">
                <button
                  className="action-button primary"
                  onClick={() => handlePageTransition('begin')}
                >
                  BEGIN
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => {
                    document.querySelector('.second-section').scrollIntoView({
                      behavior: 'smooth'
                    });
                  }}
                >
                  LEARN MORE
                </button>
              </div>
            </div>

          </section>

          <section className="second-section">
            <div className="section-content">
              <div className="text-block">
                <h2>1 in 10 People Have Dyslexia</h2>
                <p className="reference">Source: International Dyslexia Association</p>
              </div>
              <div className="globe-container">
                <OneInTen />
              </div>
            </div>
          </section>
        </>
      )}

      {currentPage === 'begin' && (
        <div className={`begin-page ${isTransitioning ? 'slide-out-right' : 'slide-in-right'}`}>
          <div className="page-container">
            <div className={`begin-buttons ${buttonsSlideOut ? 'slide-out' : ''}`}>
              <button
                className="tool-button"
                onClick={() => handleBenchmarkClick('benchmark1')}
              >
                <span>Benchmark 1</span>
                <div className={`checkmark-circle ${benchmarkComplete.benchmark1 ? 'completed' : ''}`}>✓</div>
              </button>
              <button
                className="tool-button"
                onClick={() => handleBenchmarkClick('benchmark2')}
              >
                <span>Benchmark 2</span>
                <div className={`checkmark-circle ${benchmarkComplete.benchmark2 ? 'completed' : ''}`}>✓</div>
              </button>
              <button
                className="tool-button"
                onClick={() => handleBenchmarkClick('benchmark3')}
              >
                <span>Benchmark 3</span>
                <div className={`checkmark-circle ${benchmarkComplete.benchmark3 ? 'completed' : ''}`}>✓</div>
              </button>
            </div>
            <div className={`proceed-section ${buttonsSlideOut ? 'slide-out' : ''}`}>
              <button
                className={`proceed-button ${allComplete ? 'enabled' : 'disabled'}`}
                disabled={!allComplete}
              >
                Proceed to GAI Analysis {completedCount}/3
              </button>
            </div>
            <button
              className="persistent-home-btn"
              onClick={() => handlePageTransition('home')}
            >
              ← HOME
            </button>
          </div>
        </div>
      )}

      {showRecordingInterface && (
        <div className="test-interface">
          {/* Persistent Back Button */}
          <button
            className="persistent-home-btn"
            onClick={() => handlePageTransition('begin')}
          >
            ← BACK
          </button>

          {/* Begin Button - Only visible initially */}
          {showBeginButton && (
            <button className="begin-benchmark-btn" onClick={startTest}>
              Begin Benchmark
            </button>
          )}

          {/* Simple Countdown */}
          {showCountdown && (
            <div className="simple-countdown">
              {countdownNumber}
            </div>
          )}

          {/* Test Layout - Only visible during test */}
          {testStarted && (
            <div className="test-layout">
              {/* Fluency Score - Positioned on left */}
              <div className="fluency-score-text">
                Fluency Score: {totalCorrect}/{totalWords}
              </div>

              {/* Words Section - Positioned in center */}
              <div className="words-section-positioned">
                {sentences[currentSentenceIndex] && sentences[currentSentenceIndex].map((word, index) => (
                  <span
                    key={`${currentSentenceIndex}-${index}`}
                    className={`test-word ${
                      sentenceWordStatuses[index] === 1 ? 'correct' :
                      sentenceWordStatuses[index] === 2 ? 'incorrect' :
                      index === currentExpectedWordIndex ? 'current' : 'unread'
                    }`}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Debug Transcription */}
          {transcribedText && (
            <div className="transcription-debug" style={{position: 'absolute', bottom: '20px', left: '20px'}}>
              <h4>Transcribed: </h4>
              <p>{transcribedText}</p>
            </div>
          )}
        </div>
      )}

      {showBenchmark1Modal && (
        <div className="modal-overlay" onClick={() => closeModal(setShowBenchmark1Modal)}>
          <div className={`benchmark-modal ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Benchmark 1 - Oral Reading Fluency Assessment</h2>
            </div>

            <div className="modal-content">
              <div className="placeholder-image">
                <div className="image-placeholder">Placeholder Image</div>
              </div>

              <div className="separator-line"></div>

              <div className="test-description">
                <p>Read a short passage aloud while we record your voice. We'll analyze your reading speed, accuracy, and fluency patterns. This test evaluates how smoothly you can decode and pronounce written words in context. Take your time and read naturally - there's no penalty for pausing or re-reading.</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => closeModal(setShowBenchmark1Modal)}
              >
                BACK
              </button>
              <button
                className="action-button primary"
                onClick={startBenchmark1}
              >
                BEGIN
              </button>
            </div>
          </div>
        </div>
      )}

      {showBenchmark2Modal && (
        <div className="modal-overlay" onClick={() => closeModal(setShowBenchmark2Modal)}>
          <div className={`benchmark-modal ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Benchmark 2 - Written Expression & Typing Analysis</h2>
            </div>

            <div className="modal-content">
              <div className="placeholder-image">
                <div className="image-placeholder">Placeholder Image</div>
              </div>

              <div className="separator-line"></div>

              <div className="test-description">
                <p>Type a displayed passage as accurately as you can. We measure your typing patterns, error frequency, and how you handle letter sequences. This assessment looks for patterns in letter reversals, sequencing difficulties.</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => closeModal(setShowBenchmark2Modal)}
              >
                BACK
              </button>
              <button
                className="action-button primary"
                onClick={() => {
                  // TODO: Implement slide-up animation and test start
                  console.log('Begin test 2')
                }}
              >
                BEGIN
              </button>
            </div>
          </div>
        </div>
      )}

      {showBenchmark3Modal && (
        <div className="modal-overlay" onClick={() => closeModal(setShowBenchmark3Modal)}>
          <div className={`benchmark-modal ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Benchmark 3 - Rapid Visual Naming Assessment</h2>
            </div>

            <div className="modal-content">
              <div className="placeholder-image">
                <div className="image-placeholder">Placeholder Image</div>
              </div>

              <div className="separator-line"></div>

              <div className="test-description">
                <p>Name displayed items (letters, numbers, colors, or objects) as quickly as possible from left to right, top to bottom. This measures how rapidly you can retrieve and verbalize visual information - a key skill linked to reading fluency. Speed matters, but so does accuracy.</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => closeModal(setShowBenchmark3Modal)}
              >
                BACK
              </button>
              <button
                className="action-button primary"
                onClick={() => {
                  // TODO: Implement slide-up animation and test start
                  console.log('Begin test 3')
                }}
              >
                BEGIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App