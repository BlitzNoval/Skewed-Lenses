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

  // DIBELS passages
  const passages = [
    "Crows are scavengers. The birds will eat almost anything, from vegetables and fruit, to nuts and seeds. They'll devour insects, frogs, lizards, mice, smaller birds, basically any animal they can fit into their mouths. And they'll happily pick at the flesh of carrion, which probably accounts for why ancient people associated crows with death. Crows are playful birds, very sociable with their own kind, and they live in large extended family groups. They frequently indulge in silly games, such as carrying a twig high into the air, dropping it, then quickly swooping down and catching it. They've also been observed executing acrobatic backflips in flight.",

    "Societies tend to function best when there are well-defined laws. Yet, even more important than the laws are the people who get to decide, enact, and enforce those laws. The people and structures that make those decisions are called government. Worldwide there are many types of government. These function at local, regional, and national levels. In all instances, government is the basis of power and control. But even when power is shared among people, problems arise. So, no form of rule is perfect.",

    "Just a little over a century ago, the only way to enjoy music was to play it or listen to it in person. Then, with the discovery of radio waves and the invention of recording technology, people could enjoy music anytime. Today, digital recordings make enjoying music even easier and more portable than ever. However, the process of producing music has become more complex. Prior to the sale of the first compact disc, or CD, music was sold and listened to on wax cylinders, phonographs, vinyl records, or cassette tapes. Although most of these technologies are thought to be obsolete, you can still buy music in these formats."
  ]

  const [selectedPassage] = useState(() => Math.floor(Math.random() * passages.length))
  const passage = passages[selectedPassage]
  const words = passage.split(' ')

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      const chunks = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        // Send complete recording to backend for transcription
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')

        fetch('https://c5b1ad892f23.ngrok-free.app/transcribe', {
          method: 'POST',
          body: formData,
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.text.trim()) {
            setTranscribedText(data.text)
            processTranscribedText(data.text)
          }
        })
        .catch(error => console.error('Transcription error:', error))
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setAudioChunks(chunks)

    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
  }

  const processTranscribedText = (newText) => {
    // Simple word matching - compare transcribed words with expected passage
    const spokenWords = newText.toLowerCase().split(' ')
    const expectedWords = words.map(w => w.toLowerCase().replace(/[.,!?]/g, ''))

    spokenWords.forEach(spokenWord => {
      if (spokenWord.trim() && currentWordIndex < expectedWords.length) {
        const expectedWord = expectedWords[currentWordIndex]

        // Check if spoken word matches expected word (allowing for slight variations)
        if (spokenWord.includes(expectedWord) || expectedWord.includes(spokenWord)) {
          setCurrentWordIndex(prev => prev + 1)
        }
      }
    })

    // Auto-stop when passage is complete
    if (currentWordIndex >= words.length - 1) {
      stopRecording()
    }
  }

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const completedCount = Object.values(benchmarkComplete).filter(Boolean).length
  const allComplete = completedCount === 3

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
              className="back-button"
              onClick={() => handlePageTransition('home')}
            >
              ← HOME
            </button>
          </div>
        </div>
      )}

      {showRecordingInterface && (
        <div className="recording-interface">
          <div className="recording-container">
            <div className="left-section">
              <button
                className={`start-recording-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleRecordingToggle}
              >
                {isRecording ? 'Recording...' : 'Start'}
              </button>
            </div>

            <div className="right-section">
              <div className="passage-container">
                <h3>Read the following passage aloud:</h3>
                <div className="passage-text">
                  {words.map((word, index) => (
                    <span
                      key={index}
                      className={`word ${
                        index < currentWordIndex ? 'correct' :
                        index === currentWordIndex ? 'current' : 'unread'
                      }`}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </div>

                {transcribedText && (
                  <div className="transcription-debug">
                    <h4>Transcribed: </h4>
                    <p>{transcribedText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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