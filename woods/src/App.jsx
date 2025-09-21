import React, { useState } from 'react'
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
  const [rollingWords, setRollingWords] = useState([])
  const [countdownFlyOut, setCountdownFlyOut] = useState(false)
  const [whisperTranscriptions, setWhisperTranscriptions] = useState([])
  const [showBeginButton, setShowBeginButton] = useState(true)
  const [countdownExiting, setCountdownExiting] = useState(false)
  const [sentenceTimeout, setSentenceTimeout] = useState(null)

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

  const startRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Recording not supported in this browser')
      return
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Start Web Speech API for instant feedback
        startWebSpeechRecognition()

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
        setCurrentWordIndex(0)
        setTranscribedText('')
        setSentenceWordStatuses(new Array(5).fill(0))

        // Set timeout to auto-advance if sentence takes too long (30 seconds)
        const timeout = setTimeout(() => {
          console.log('Sentence timeout - auto-advancing')
          stopRecording()
          moveToNextSentence()
        }, 30000)
        setSentenceTimeout(timeout)
      })
      .catch(error => {
        console.error('Error accessing microphone:', error)
        alert('Error accessing microphone')
      })
  }

  const startWebSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported, using Whisper only')
      return
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
        checkWordsRealTime(finalText)
      }
    }

    newRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
    }

    newRecognition.onend = () => {
      // Auto-restart if still recording
      if (isRecording) {
        setTimeout(() => {
          if (isRecording) { // Double check still recording
            newRecognition.start()
          }
        }, 100)
      }
    }

    newRecognition.start()
    setRecognition(newRecognition)
  }

  const stopRecording = () => {
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

    // Stop Web Speech API
    if (recognition) {
      recognition.stop()
      setRecognition(null) // Clear recognition reference
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

  const checkWordsRealTime = (spokenText) => {
    const cleanSpoken = spokenText.toLowerCase().replace(/[.,!?;]/g, '').trim()
    const spokenWords = cleanSpoken.split(' ').filter(w => w.trim())

    if (currentSentenceIndex >= sentences.length) return

    const currentSentence = sentences[currentSentenceIndex]

    spokenWords.forEach(spokenWord => {
      setCurrentExpectedWordIndex(prevIndex => {
        if (prevIndex >= currentSentence.length) {
          return prevIndex // Already at the end of current sentence
        }

        const expectedWord = currentSentence[prevIndex].toLowerCase().replace(/[.,!?;]/g, '')

        // More flexible word matching for speech recognition variations
        const isMatch = spokenWord === expectedWord ||
                       spokenWord.includes(expectedWord) ||
                       expectedWord.includes(spokenWord) ||
                       // Handle common speech recognition variations
                       (expectedWord.length > 3 && spokenWord.length > 3 &&
                        (expectedWord.startsWith(spokenWord.slice(0, 3)) ||
                         spokenWord.startsWith(expectedWord.slice(0, 3))))

        // Update sentence word status immediately
        setSentenceWordStatuses(prev => {
          const newStatuses = [...prev]
          newStatuses[prevIndex] = isMatch ? 1 : 2 // 1 = correct (green), 2 = incorrect (orange)
          return newStatuses
        })

        // Update correct count only
        if (isMatch) {
          setTotalCorrect(prev => prev + 1)
        }

        // Auto-complete sentence when all words are checked
        if (prevIndex + 1 >= currentSentence.length) {
          // Clear any existing timeout
          if (sentenceTimeout) {
            clearTimeout(sentenceTimeout)
            setSentenceTimeout(null)
          }

          setTimeout(() => {
            stopRecording()
            moveToNextSentence()
          }, 800) // Reduced delay to prevent hanging
        }

        return prevIndex + 1 // Always move to next expected word
      })
    })
  }

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const moveToNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      const currentSentence = sentences[currentSentenceIndex]
      const nextSentenceIndex = currentSentenceIndex + 1
      const nextSentence = sentences[nextSentenceIndex]

      // Pre-render next sentence words with 'next-sentence' class (invisible but in DOM)
      setRollingWords(prev => {
        const nextSentenceKeys = nextSentence.map((_, index) => `next-${nextSentenceIndex}-${index}`)
        return [...prev, ...nextSentenceKeys]
      })

      // Small delay then trigger roll-out animation for current words
      setTimeout(() => {
        currentSentence.forEach((word, index) => {
          setTimeout(() => {
            setRollingWords(prev => [...prev, `out-${currentSentenceIndex}-${index}`])
          }, index * 60) // Faster 60ms stagger for roll-out
        })
      }, 100)

      // After roll-out completes, switch sentence and trigger roll-in
      setTimeout(() => {
        setCurrentSentenceIndex(nextSentenceIndex)
        setCurrentExpectedWordIndex(0)
        setSentenceWordStatuses(new Array(5).fill(0))
        setTranscribedText('')

        // Clear pre-render and trigger roll-in animation
        setTimeout(() => {
          setRollingWords(prev => prev.filter(key => !key.startsWith('next-')))

          // Trigger roll-in animation for next sentence
          nextSentence.forEach((word, index) => {
            setTimeout(() => {
              setRollingWords(prev => [...prev, `in-${nextSentenceIndex}-${index}`])
            }, index * 60) // Faster 60ms stagger for roll-in
          })

          // Clean up roll-in animations and start recording
          setTimeout(() => {
            setRollingWords([])
            startRecording()
          }, nextSentence.length * 60 + 300)
        }, 100)
      }, currentSentence.length * 60 + 400) // Faster timing

    } else {
      // Test complete
      setTestStarted(false)
      setIsRecording(false)

      // Log all Whisper transcriptions for data collection
      console.log('=== COMPLETE WHISPER TRANSCRIPTION DATA ===')
      console.log('Final Whisper Data:', whisperTranscriptions)
      console.log('Total Sentences:', whisperTranscriptions.length)

      alert(`Test Complete! Score: ${totalCorrect}/${totalWords}`)
    }
  }

  const startTest = () => {
    setShowBeginButton(false)
    setShowCountdown(true)
    setCountdownNumber(5)
    setCountdownExiting(false)

    let currentNum = 5

    const nextCountdownStep = () => {
      if (currentNum <= 1) {
        // Exit final number and end countdown
        setCountdownExiting(true)
        setTimeout(() => {
          setShowCountdown(false)
          setTestStarted(true)
          startRecording()
        }, 400)
      } else {
        // Exit current number
        setCountdownExiting(true)
        setTimeout(() => {
          // Move to next number
          currentNum--
          setCountdownNumber(currentNum)
          setCountdownExiting(false)
          // Schedule next step - show number then trigger next exit
          setTimeout(nextCountdownStep, 800)
        }, 400)
      }
    }

    // Start the countdown sequence after showing 5 for 800ms
    setTimeout(nextCountdownStep, 800)
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
                  <span className="letter" style={{"--delay": "0.7s"}}>L</span>
                  <span className="letter" style={{"--delay": "0.8s"}}>e</span>
                  <span className="letter" style={{"--delay": "0.9s"}}>n</span>
                  <span className="letter" style={{"--delay": "1.0s"}}>s</span>
                  <span className="letter" style={{"--delay": "1.1s"}}>e</span>
                  <span className="letter" style={{"--delay": "1.2s"}}>s</span>
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
                <button className="action-button secondary">ABOUT</button>
              </div>
            </div>

            <div className="letter-stream">
              <div className="letter-grid">
                <div className="letter-morph grid-1">b</div>
                <div className="letter-morph grid-2">d</div>
                <div className="letter-morph grid-3">p</div>
                <div className="letter-morph grid-4">q</div>
                <div className="grid-divider horizontal"></div>
                <div className="grid-divider vertical"></div>
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

          {/* Directional Countdown */}
          {showCountdown && (
            <div
              className={`directional-countdown countdown-${countdownNumber} ${
                countdownExiting ? `countdown-exit-${countdownNumber}` : ''
              }`}
            >
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
                {sentences[currentSentenceIndex] && sentences[currentSentenceIndex].map((word, index) => {
                  const rollOutKey = `out-${currentSentenceIndex}-${index}`
                  const rollInKey = `in-${currentSentenceIndex}-${index}`
                  const nextKey = `next-${currentSentenceIndex}-${index}`
                  const isRollingOut = rollingWords.includes(rollOutKey)
                  const isRollingIn = rollingWords.includes(rollInKey)
                  const isNextSentence = rollingWords.includes(nextKey)

                  return (
                    <span
                      key={`${currentSentenceIndex}-${index}`}
                      className={`test-word ${
                        sentenceWordStatuses[index] === 1 ? 'correct' :
                        sentenceWordStatuses[index] === 2 ? 'incorrect' :
                        index === currentExpectedWordIndex ? 'current' : 'unread'
                      } ${isRollingOut ? 'rolling-out' : ''} ${isRollingIn ? 'rolling-in' : ''} ${isNextSentence ? 'next-sentence' : ''}`}
                    >
                      {word}
                    </span>
                  )
                })}
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