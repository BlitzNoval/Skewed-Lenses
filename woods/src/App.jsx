import React, { useState, useEffect } from 'react'
import './App.css'
import PlasmaBackground from './components/PlasmaBackground'
import ChatInterface from './components/ChatInterface'
import PrivacyModal from './components/PrivacyModal'
import ResearchExport from './components/ResearchExport'
import useSpeechStore from './store/useSpeechStore'
import useSpeechRecognition from './hooks/useSpeechRecognition'
import useSessionTracking from './hooks/useSessionTracking'
import { saveBenchmark } from './lib/supabase'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [benchmarkComplete, setBenchmarkComplete] = useState({
    benchmark1: false,
    benchmark2: false
  })
  const [savedBenchmarkResults, setSavedBenchmarkResults] = useState({
    benchmark1: null,
    benchmark2: null
  })
  const [showBenchmark1Modal, setShowBenchmark1Modal] = useState(false)
  const [showBenchmark2Modal, setShowBenchmark2Modal] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [showRecordingInterface, setShowRecordingInterface] = useState(false)
  const [buttonsSlideOut, setButtonsSlideOut] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownNumber, setCountdownNumber] = useState(5)
  const [testStarted, setTestStarted] = useState(false)
  const [showBeginButton, setShowBeginButton] = useState(true)
  const [resultsSaved, setResultsSaved] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showSaveFailModal, setShowSaveFailModal] = useState(false)
  const [showRestartConfirmModal, setShowRestartConfirmModal] = useState(false)
  const [currentBenchmark, setCurrentBenchmark] = useState('benchmark1')
  const [audioLevel, setAudioLevel] = useState(0)
  const [noInputDetected, setNoInputDetected] = useState(false)

  // Privacy & Session Tracking
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const { sessionId, isInitialized, hasConsented, updateConsent } = useSessionTracking()

  // Benchmark 2 specific states - Typing Assessment
  const [benchmark2Active, setBenchmark2Active] = useState(false)
  const [benchmark2Words, setBenchmark2Words] = useState([])
  const [benchmark2CurrentIndex, setBenchmark2CurrentIndex] = useState(0)
  const [benchmark2CurrentCharIndex, setBenchmark2CurrentCharIndex] = useState(0)
  const [benchmark2TypedWord, setBenchmark2TypedWord] = useState('')
  const [benchmark2WordStatuses, setBenchmark2WordStatuses] = useState([])
  const [benchmark2Started, setBenchmark2Started] = useState(false)
  const [benchmark2Completed, setBenchmark2Completed] = useState(false)
  const [benchmark2Results, setBenchmark2Results] = useState(null)
  const [benchmark2Timer, setBenchmark2Timer] = useState(120)
  const [benchmark2SaveLoading, setBenchmark2SaveLoading] = useState(false)
  const [benchmark2SaveSuccess, setBenchmark2SaveSuccess] = useState(false)
  const [benchmark2ResultsSaved, setBenchmark2ResultsSaved] = useState(false)

  // GAI Analysis states - 3 AI models
  const [gaiAnalysisLoading, setGaiAnalysisLoading] = useState(false)
  const [gaiAnalysisComplete, setGaiAnalysisComplete] = useState(false)
  const [aiAnalyses, setAiAnalyses] = useState({
    ai1: null,
    ai2: null,
    ai3: null
  })

  // Speech recognition
  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition()

  // Speech store
  const {
    currentSentenceIndex,
    currentWordIndex,
    sentences,
    wordStatuses,
    totalCorrect,
    totalWords,
    isAssessmentActive,
    transcript,
    interimTranscript,
    canSkipCurrentWord,
    benchmarkCompleted,
    benchmarkResults,
    initializeAssessment,
    moveToNextSentence,
    skipCurrentWord,
    saveResults,
    resetBenchmark
  } = useSpeechStore()

  // Benchmark 2 typing handler - character by character
  const handleBenchmark2Typing = (char) => {
    if (!benchmark2Started || benchmark2Completed) return
    if (benchmark2CurrentIndex >= benchmark2Words.length) return

    const currentWord = benchmark2Words[benchmark2CurrentIndex].toLowerCase()
    const currentTyped = benchmark2TypedWord.toLowerCase()

    // Handle backspace
    if (char === 'Backspace') {
      if (currentTyped.length > 0) {
        setBenchmark2TypedWord(prev => prev.slice(0, -1))
        setBenchmark2CurrentCharIndex(prev => Math.max(0, prev - 1))
      }
      return
    }

    // Handle Tab or Enter - skip word entirely
    if (char === 'Tab' || char === 'Enter') {
      // Mark word as skipped
      const newStatuses = [...benchmark2WordStatuses]
      newStatuses[benchmark2CurrentIndex] = 3 // Mark as skipped (yellow)
      setBenchmark2WordStatuses(newStatuses)

      // Move to next word
      const nextIndex = benchmark2CurrentIndex + 1
      setBenchmark2CurrentIndex(nextIndex)
      setBenchmark2TypedWord('')
      setBenchmark2CurrentCharIndex(0)

      // Check if we've reached the end
      if (nextIndex >= benchmark2Words.length) {
        completeBenchmark2()
      }
      return
    }

    // Handle space - move to next word (only if word is complete or partially typed)
    if (char === ' ') {
      if (currentTyped.length > 0) {
        // Check if typed word matches
        const newStatuses = [...benchmark2WordStatuses]
        newStatuses[benchmark2CurrentIndex] = currentTyped === currentWord ? 1 : 3
        setBenchmark2WordStatuses(newStatuses)

        // Move to next word
        const nextIndex = benchmark2CurrentIndex + 1
        setBenchmark2CurrentIndex(nextIndex)
        setBenchmark2TypedWord('')
        setBenchmark2CurrentCharIndex(0)

        // Check if we've reached the end
        if (nextIndex >= benchmark2Words.length) {
          completeBenchmark2()
        }
      }
      return
    }

    // Only handle letter keys
    if (char.length === 1 && char.match(/[a-z]/i)) {
      const newTyped = currentTyped + char.toLowerCase()
      setBenchmark2TypedWord(prev => prev + char)
      setBenchmark2CurrentCharIndex(prev => prev + 1)

      // Auto-advance when word is complete
      if (newTyped.length === currentWord.length) {
        // Check if typed word matches
        const newStatuses = [...benchmark2WordStatuses]
        newStatuses[benchmark2CurrentIndex] = newTyped === currentWord ? 1 : 3
        setBenchmark2WordStatuses(newStatuses)

        // Move to next word automatically
        setTimeout(() => {
          const nextIndex = benchmark2CurrentIndex + 1
          setBenchmark2CurrentIndex(nextIndex)
          setBenchmark2TypedWord('')
          setBenchmark2CurrentCharIndex(0)

          // Check if we've reached the end
          if (nextIndex >= benchmark2Words.length) {
            completeBenchmark2()
          }
        }, 100) // Small delay for visual feedback
      }
    }
  }

  const completeBenchmark2 = async () => {
    setBenchmark2Completed(true)
    setBenchmark2Started(false)

    // Calculate results
    const totalWords = benchmark2CurrentIndex
    const correctWords = benchmark2WordStatuses.slice(0, benchmark2CurrentIndex).filter(status => status === 1).length
    const skippedWords = benchmark2WordStatuses.slice(0, benchmark2CurrentIndex).filter(status => status === 3).length
    const timeElapsed = 120 - benchmark2Timer
    const timeElapsedMinutes = Math.max(timeElapsed / 60, 0.1) // Minimum 0.1 minutes to avoid division by zero
    const wordsPerMinute = Math.round(totalWords / timeElapsedMinutes)
    const completionRate = Math.round((totalWords / benchmark2Words.length) * 100)
    const skipRate = totalWords > 0 ? Math.round((skippedWords / totalWords) * 100) : 0

    const results = {
      totalWords,
      correctWords,
      skippedWords,
      timeElapsed,
      wordsPerMinute,
      completionRate,
      skipRate,
      benchmarkType: 'benchmark2'
    }

    // Add AI analysis for reading pace assessment
    try {
      const aiAnalysis = await analyzeReadingPace(results)
      results.aiAnalysis = aiAnalysis
    } catch (error) {
      console.error('AI analysis failed:', error)
      results.aiAnalysis = null
    }

    setBenchmark2Results(results)
  }

  // AI analysis function for Benchmark 2
  const analyzeReadingPace = async (results) => {
    const analysisData = {
      mode: 'reading_pace',
      readingMetrics: {
        wordsPerMinute: results.wordsPerMinute,
        completionRate: results.completionRate,
        skipRate: results.skipRate,
        totalWords: results.totalWords,
        correctWords: results.correctWords,
        skippedWords: results.skippedWords,
        timeElapsed: results.timeElapsed
      },
      text: `Reading assessment results: User read ${results.totalWords} words in ${results.timeElapsed} seconds (${results.wordsPerMinute} WPM), with ${results.skipRate}% skip rate and ${results.completionRate}% completion rate.`
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    })

    if (!response.ok) {
      throw new Error('AI analysis request failed')
    }

    const result = await response.json()
    return result.analysis
  }

  const handleBenchmark2SaveResults = async () => {
    if (benchmark2SaveLoading || benchmark2SaveSuccess) return

    setBenchmark2SaveLoading(true)

    try {
      // Save benchmark 2 results
      const savedResults = {
        ...savedBenchmarkResults,
        benchmark2: {
          ...benchmark2Results,
          savedAt: new Date().toISOString()
        }
      }
      setSavedBenchmarkResults(savedResults)
      localStorage.setItem('savedBenchmarkResults', JSON.stringify(savedResults))
      setBenchmarkComplete(prev => ({ ...prev, benchmark2: true }))

      // Save to Supabase database (if user consented)
      if (hasConsented && sessionId && benchmark2Results) {
        await saveBenchmark(sessionId, {
          benchmark_type: 'typing_pace',
          words_per_minute: benchmark2Results.wpm,
          completion_rate: benchmark2Results.completionRate,
          skip_rate: benchmark2Results.skipRate,
          total_typed_words: benchmark2Results.totalWords,
          time_elapsed: benchmark2Results.timeElapsed,
          typing_data: benchmark2Results.wordStatuses || []
        })
      }

      setBenchmark2SaveLoading(false)
      setBenchmark2SaveSuccess(true)
      setBenchmark2ResultsSaved(true)

      // Show confetti and then navigate
      setTimeout(() => {
        setBenchmark2SaveSuccess(false)
        setCurrentPage('begin')
      }, 3000)

    } catch (error) {
      setBenchmark2SaveLoading(false)
      // Could add error modal here like Benchmark 1
    }
  }

  // Initialize Benchmark 2
  const initializeBenchmark2 = () => {
    const cleanedText = benchmark2Passage.replace(/[.,!?;:]/g, '')
    const words = cleanedText.split(' ').filter(word => word.trim())
    setBenchmark2Words(words)
    setBenchmark2WordStatuses(new Array(words.length).fill(0)) // 0 = unread
    setBenchmark2CurrentIndex(0)
    setBenchmark2CurrentCharIndex(0)
    setBenchmark2TypedWord('')
    setBenchmark2Timer(120) // 2 minutes
    setBenchmark2Completed(false)
    setBenchmark2Results(null)
  }

  const startBenchmark2Test = () => {
    setBenchmark2Started(true)
  }

  // Timer countdown for Benchmark 2
  useEffect(() => {
    if (benchmark2Started && !benchmark2Completed && benchmark2Timer > 0) {
      const interval = setInterval(() => {
        setBenchmark2Timer(prev => {
          if (prev <= 1) {
            completeBenchmark2()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [benchmark2Started, benchmark2Completed, benchmark2Timer])

  // Keyboard event handler for Benchmark 2 - Typing
  useEffect(() => {
    const handleBenchmark2KeyPress = (event) => {
      if (!benchmark2Started || benchmark2Completed) return

      event.preventDefault()
      handleBenchmark2Typing(event.key)
    }

    if (benchmark2Started && !benchmark2Completed && currentPage === 'benchmark2') {
      document.addEventListener('keydown', handleBenchmark2KeyPress)
      return () => document.removeEventListener('keydown', handleBenchmark2KeyPress)
    }
  }, [benchmark2Started, benchmark2Completed, currentPage, benchmark2CurrentIndex, benchmark2TypedWord])

  const handleBenchmark2RestartWithConfirm = () => {
    if (benchmark2Completed && !benchmark2ResultsSaved) {
      // Show unsaved results confirmation
      setPendingAction('benchmark2-restart')
      setShowConfirmModal(true)
    } else if (benchmark2ResultsSaved) {
      // Show restart confirmation for saved results
      setShowRestartConfirmModal(true)
    } else {
      executeBenchmark2Restart()
    }
  }

  const handleBenchmark2ReturnWithConfirm = () => {
    if (benchmark2Completed && !benchmark2ResultsSaved) {
      setPendingAction('benchmark2-return')
      setShowConfirmModal(true)
    } else {
      executeBenchmark2Return()
    }
  }

  const executeBenchmark2Restart = () => {
    initializeBenchmark2()
    setBenchmark2ResultsSaved(false)
    setBenchmark2SaveLoading(false)
    setBenchmark2SaveSuccess(false)
    setShowRestartConfirmModal(false)
  }

  const executeBenchmark2Return = () => {
    setBenchmark2ResultsSaved(false)
    setBenchmark2SaveLoading(false)
    setBenchmark2SaveSuccess(false)
    setCurrentPage('begin')
  }

  // GAI Analysis function - Launch new Skewed Lenses interface
  const handleGAIAnalysis = () => {
    if (!allComplete) return
    setCurrentPage('skewed-lenses')
  }

  // Keyboard event handler for Enter key (Benchmark 1)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && testStarted && isAssessmentActive && !benchmarkCompleted && canSkipCurrentWord) {
        event.preventDefault()
        skipCurrentWord()
      }
    }

    if (testStarted && isAssessmentActive && !benchmarkCompleted) {
      document.addEventListener('keydown', handleKeyPress)
      return () => document.removeEventListener('keydown', handleKeyPress)
    }
  }, [testStarted, isAssessmentActive, benchmarkCompleted, canSkipCurrentWord, skipCurrentWord])


  // No input detection for microphone status
  useEffect(() => {
    let noInputTimer

    if (isListening && testStarted && isAssessmentActive && !benchmarkCompleted) {
      // Reset no input state when starting to listen
      setNoInputDetected(false)

      // Set timer to detect if no input after 8 seconds of listening
      noInputTimer = setTimeout(() => {
        if (isListening && !transcript && !interimTranscript) {
          setNoInputDetected(true)
        }
      }, 8000)
    } else {
      // Reset when not listening
      setNoInputDetected(false)
    }

    // Reset no input state when we get new transcript
    if (transcript || interimTranscript) {
      setNoInputDetected(false)
    }

    return () => {
      if (noInputTimer) {
        clearTimeout(noInputTimer)
      }
    }
  }, [isListening, testStarted, isAssessmentActive, benchmarkCompleted, transcript, interimTranscript])

  // DIBELS passages
  const passages = [
    "Crows are scavengers. The birds will eat almost anything, from vegetables and fruit, to nuts and seeds. They'll devour insects, frogs, lizards, mice, smaller birds, basically any animal they can fit into their mouths. And they'll happily pick at the flesh of carrion, which probably accounts for why ancient people associated crows with death. Crows are playful birds, very sociable with their own kind, and they live in large extended family groups. They frequently indulge in silly games, such as carrying a twig high into the air, dropping it, then quickly swooping down and catching it. They've also been observed executing acrobatic backflips in flight.",

    "Societies tend to function best when there are well-defined laws. Yet, even more important than the laws are the people who get to decide, enact, and enforce those laws. The people and structures that make those decisions are called government. Worldwide there are many types of government. These function at local, regional, and national levels. In all instances, government is the basis of power and control. But even when power is shared among people, problems arise. So, no form of rule is perfect.",

    "Just a little over a century ago, the only way to enjoy music was to play it or listen to it in person. Then, with the discovery of radio waves and the invention of recording technology, people could enjoy music anytime. Today, digital recordings make enjoying music even easier and more portable than ever. However, the process of producing music has become more complex. Prior to the sale of the first compact disc, or CD, music was sold and listened to on wax cylinders, phonographs, vinyl records, or cassette tapes. Although most of these technologies are thought to be obsolete, you can still buy music in these formats."
  ]

  const [selectedPassage] = useState(() => Math.floor(Math.random() * passages.length))
  const passage = passages[selectedPassage]

  // Benchmark 2 - Reading pace passage
  const benchmark2Passage = "Technology has transformed the way we communicate, work, and live our daily lives. From smartphones that connect us instantly to people across the globe, to artificial intelligence that helps us solve complex problems, we are living in an era of unprecedented digital advancement. However, this rapid technological progress also brings new challenges. Privacy concerns, digital addiction, and the digital divide between those who have access to technology and those who do not are important issues that society must address. Education systems are adapting to prepare students for a future where digital literacy is as important as traditional reading and writing skills. Healthcare is being revolutionized through telemedicine and AI-powered diagnostic tools. Environmental sustainability is being enhanced through smart city technologies and renewable energy innovations. As we move forward, it is crucial that we harness the benefits of technology while being mindful of its potential negative impacts on our society, relationships, and mental well-being."

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

  // Load saved benchmark data on app initialization
  useEffect(() => {
    const loadSavedBenchmarks = () => {
      try {
        const savedResults = localStorage.getItem('savedBenchmarkResults')
        if (savedResults) {
          const parsedResults = JSON.parse(savedResults)
          setSavedBenchmarkResults(parsedResults)

          // Update completion status based on saved results
          setBenchmarkComplete({
            benchmark1: !!parsedResults.benchmark1,
            benchmark2: !!parsedResults.benchmark2
          })
        }
      } catch (error) {
        console.error('Error loading saved benchmarks:', error)
      }
    }

    loadSavedBenchmarks()
  }, [])

  // Scroll detection for back to top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const distanceFromBottom = documentHeight - (scrollPosition + windowHeight)

      // Show if scrolled down more than 300px AND not within 200px of bottom
      if (scrollPosition > 300 && distanceFromBottom > 200) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Privacy Modal 'P' key listener (global)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger on homepage and when 'P' key is pressed (not in input fields)
      if (currentPage === 'home' && e.key.toLowerCase() === 'p' && !e.target.matches('input, textarea')) {
        e.preventDefault()
        setShowPrivacyModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentPage])

  // Smooth scroll handler
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Initialize assessment sentences
  useEffect(() => {
    const testChunks = createTestChunks(passage)
    if (testChunks.length > 0) {
      const randomChunkIndex = Math.floor(Math.random() * testChunks.length)
      const selectedThirtyWords = testChunks[randomChunkIndex]
      const sentenceChunks = createSentences(selectedThirtyWords)

      console.log('Selected 30-word chunk:', selectedThirtyWords)
      console.log('Created sentences:', sentenceChunks)
    }
  }, [passage])


  const handlePageTransition = (page) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 500)
  }

  const handleBenchmarkClick = (benchmarkKey) => {
    setCurrentBenchmark(benchmarkKey)

    // Check if this benchmark is already completed with saved results
    if (savedBenchmarkResults[benchmarkKey]) {
      // Load the saved results and show the results screen directly
      const savedResult = savedBenchmarkResults[benchmarkKey]

      if (benchmarkKey === 'benchmark1') {
        // Set the speech store to the completed state with saved results
        resetBenchmark()
        // Use a setTimeout to ensure the reset happens first
        setTimeout(() => {
          // Manually set the benchmark as completed with the saved results
          useSpeechStore.setState({
            benchmarkCompleted: true,
            benchmarkResults: savedResult
          })

          setShowRecordingInterface(true)
          setButtonsSlideOut(true)
          setTestStarted(true)
          setShowBeginButton(false) // Hide begin button for completed results
          setResultsSaved(true) // Mark as already saved
        }, 100)
      } else if (benchmarkKey === 'benchmark2') {
        // For Benchmark 2, set its completed state and show results
        setBenchmark2Results(savedResult)
        setBenchmark2Completed(true)
        setBenchmark2Started(false)
        setCurrentPage('benchmark2')
      }
    } else {
      // Show the normal modal for starting a new benchmark
      if (benchmarkKey === 'benchmark1') {
        setShowBenchmark1Modal(true)
      } else if (benchmarkKey === 'benchmark2') {
        setShowBenchmark2Modal(true)
      }
    }
  }

  const closeModal = (modalSetter) => {
    setModalClosing(true)
    setTimeout(() => {
      modalSetter(false)
      setModalClosing(false)
    }, 150)
  }

  const startBenchmark = (benchmarkType) => {
    if (benchmarkType === 'benchmark1') {
      startBenchmark1()
    } else if (benchmarkType === 'benchmark2') {
      startBenchmark2()
    }
  }

  const startBenchmark1 = () => {
    setShowBenchmark1Modal(false)
    setButtonsSlideOut(true)
    setTimeout(() => {
      setShowRecordingInterface(true)
    }, 800)
  }

  const startBenchmark2 = () => {
    setShowBenchmark2Modal(false)
    setCurrentPage('benchmark2')
    initializeBenchmark2()
  }

  const startTest = () => {
    // Initialize the assessment with sentences
    const testChunks = createTestChunks(passage)
    if (testChunks.length > 0) {
      const randomChunkIndex = Math.floor(Math.random() * testChunks.length)
      const selectedThirtyWords = testChunks[randomChunkIndex]
      const sentenceChunks = createSentences(selectedThirtyWords)

      initializeAssessment(sentenceChunks)
    }

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
        startListening() // Start speech recognition
      }
    }, 1000)
  }

  const handleRecordingToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleSaveResults = async () => {
    if (isSaving || resultsSaved) return // Prevent multiple clicks

    setIsSaving(true)

    try {
      saveResults() // Call the actual save function

      // Save to persistent storage with benchmark identifier
      const benchmarkKey = currentBenchmark
      const savedResults = {
        ...savedBenchmarkResults,
        [benchmarkKey]: {
          ...benchmarkResults,
          savedAt: new Date().toISOString(),
          benchmarkType: benchmarkKey
        }
      }

      setSavedBenchmarkResults(savedResults)
      localStorage.setItem('savedBenchmarkResults', JSON.stringify(savedResults))

      // Save to Supabase database (if user consented)
      if (hasConsented && sessionId) {
        await saveBenchmark(sessionId, {
          benchmark_type: 'oral_fluency',
          fluency_score: benchmarkResults.fluencyPercentage,
          total_words: benchmarkResults.totalWords,
          correct_words: benchmarkResults.correctWords,
          total_attempts: benchmarkResults.totalAttempts,
          word_data: benchmarkResults.wordStatuses || []
        })
      }

      // Update completion status
      setBenchmarkComplete(prev => ({
        ...prev,
        [benchmarkKey]: true
      }))

      setIsSaving(false)
      setSaveSuccess(true)
      setResultsSaved(true)

      // Show confetti and then hide success state
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)

    } catch (error) {
      setIsSaving(false)
      setShowSaveFailModal(true)
    }
  }

  const handleRestartWithConfirm = () => {
    if (benchmarkCompleted && !resultsSaved) {
      // Show unsaved results confirmation
      setPendingAction('restart')
      setShowConfirmModal(true)
    } else if (resultsSaved) {
      // Show restart confirmation for saved results
      setShowRestartConfirmModal(true)
    } else {
      executeRestart()
    }
  }

  const handleReturnWithConfirm = () => {
    if (benchmarkCompleted && !resultsSaved) {
      setPendingAction('return')
      setShowConfirmModal(true)
    } else {
      executeReturn()
    }
  }

  const executeRestart = () => {
    resetBenchmark()
    setTestStarted(false)
    setShowBeginButton(true)
    setResultsSaved(false)
    setIsSaving(false)
    setSaveSuccess(false)
    setShowSaveFailModal(false)
    setShowRestartConfirmModal(false)

    // Clear any saved results for this benchmark to allow a fresh start
    const newSavedResults = { ...savedBenchmarkResults }
    delete newSavedResults[currentBenchmark]
    setSavedBenchmarkResults(newSavedResults)
    localStorage.setItem('savedBenchmarkResults', JSON.stringify(newSavedResults))

    // Update completion status
    setBenchmarkComplete(prev => ({
      ...prev,
      [currentBenchmark]: false
    }))

    startTest()
  }

  const executeReturn = () => {
    resetBenchmark()
    setShowRecordingInterface(false)
    setButtonsSlideOut(false)
    setTestStarted(false)
    setShowBeginButton(true)
    setResultsSaved(false)
    setIsSaving(false)
    setSaveSuccess(false)
    setShowSaveFailModal(false)
    setShowRestartConfirmModal(false)
    // Don't reset currentBenchmark - keep it for next time
  }

  const handleConfirmProceed = () => {
    if (pendingAction === 'restart') {
      executeRestart()
    } else if (pendingAction === 'return') {
      executeReturn()
    } else if (pendingAction === 'benchmark2-restart') {
      executeBenchmark2Restart()
    } else if (pendingAction === 'benchmark2-return') {
      executeBenchmark2Return()
    }
    setShowConfirmModal(false)
    setPendingAction(null)
  }

  const handleConfirmCancel = () => {
    setShowConfirmModal(false)
    setPendingAction(null)
  }

  const handleRestartConfirmProceed = () => {
    setShowRestartConfirmModal(false)
    if (currentBenchmark === 'benchmark2') {
      executeBenchmark2Restart()
    } else {
      executeRestart()
    }
  }

  const handleRestartConfirmCancel = () => {
    setShowRestartConfirmModal(false)
  }

  // Get current sentence for display
  const getCurrentSentence = () => {
    if (!sentences.length || currentSentenceIndex >= sentences.length) {
      return []
    }
    return sentences[currentSentenceIndex]
  }

  // Get word status for display
  const getWordStatus = (globalWordIndex) => {
    if (!wordStatuses.length || globalWordIndex >= wordStatuses.length) {
      return 0 // unread
    }
    return wordStatuses[globalWordIndex]
  }

  // Calculate current global word index for highlighting
  const getCurrentGlobalWordIndex = () => {
    let globalIndex = 0
    for (let i = 0; i < currentSentenceIndex; i++) {
      globalIndex += sentences[i]?.length || 0
    }
    return globalIndex + (currentWordIndex - globalIndex)
  }

  // Privacy Modal Handlers
  const handlePrivacyAccept = () => {
    updateConsent(true)
    setShowPrivacyModal(false)
  }

  const handlePrivacyDecline = () => {
    updateConsent(false)
    setShowPrivacyModal(false)
  }

  const handlePrivacyClose = () => {
    setShowPrivacyModal(false)
  }

  const completedCount = Object.values(benchmarkComplete).filter(Boolean).length
  const allComplete = completedCount === 2

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''} ${currentPage === 'home' ? 'home-page' : ''}`}>
      {currentPage === 'home' && <PlasmaBackground />}

      {/* Floating Scroll to Top Button */}
      {showScrollTop && currentPage === 'home' && (
        <button className="floating-scroll-top" onClick={scrollToTop}>
          <span className="scroll-arrow">↑</span>
        </button>
      )}

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
  <span className="letter" style={{"--delay": "0s"}}>T</span>
  <span className="letter" style={{"--delay": "0.1s"}}>h</span>
  <span className="letter" style={{"--delay": "0.2s"}}>e</span>
  <span className="letter space" style={{"--delay": "0.3s"}}> </span>

  <span className="letter" style={{"--delay": "0.4s"}}>A</span>
  <span className="letter" style={{"--delay": "0.5s"}}>I</span>
  <span className="letter space" style={{"--delay": "0.6s"}}> </span>

  <span className="letter" style={{"--delay": "0.7s"}}>P</span>
  <span className="letter" style={{"--delay": "0.8s"}}>e</span>
  <span className="letter" style={{"--delay": "0.9s"}}>r</span>
  <span className="letter" style={{"--delay": "1.0s"}}>s</span>
  <span className="letter" style={{"--delay": "1.1s"}}>p</span>
  <span className="letter" style={{"--delay": "1.2s"}}>e</span>
  <span className="letter" style={{"--delay": "1.3s"}}>c</span>
  <span className="letter" style={{"--delay": "1.4s"}}>t</span>
  <span className="letter" style={{"--delay": "1.5s"}}>i</span>
  <span className="letter" style={{"--delay": "1.6s"}}>v</span>
  <span className="letter" style={{"--delay": "1.7s"}}>e</span>
</span>




        </div>
        <div className="subtitle">
        AI, Bias, and Access in Today’s World
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
            onClick={() => setCurrentPage('skewed-lenses')}
          >
            GO TO DISCUSSION
          </button>
        </div>
        <div className="about-link">
          <a href="#about-section" className="about-text">ABOUT THIS PROJECT</a>
        </div>
      </div>
    </section>

    {/* About Section */}
    <section id="about-section" className="about-section">
      <div className="about-container">
        <div className="about-content">
          <div className="about-item">
            <h3>What This Project Is</h3>
            <p>
              Skewed Lenses stages a conversation between two AI systems — Llama and Gemini — as they interpret the same dyslexia benchmark results.
              Instead of producing answers, they reveal their assumptions.
            </p>
            <p>
              Their dialogue is the point: it shows how AI "reasons," misreads, exaggerates, softens, or speculates based on the language patterns it was trained on.
            </p>
            <p>
              This is deliberate.
              You're not building a tool to assess students — you're building a space where AI exposes itself.
            </p>
          </div>

          <div className="about-item">
            <h3>Why It Exists</h3>
            <p>
              This project comes directly from the HOSGAI question: How do we keep the tool a tool?
            </p>
            <p>
              We do it by refusing to let AI speak with authority, and instead forcing it to speak in front of us.
            </p>
            <p>
              When two models explain the same data — not numerically, but through language — the difference in worldview becomes visible.
              That difference is bias.
            </p>
            <p>
              This is not about dyslexia. It's about:
            </p>
            <ul>
              <li>how machines interpret human cognition</li>
              <li>how interpretation becomes "truth"</li>
              <li>how AI language frames ability and difficulty</li>
              <li>how neutrality is performed, not real</li>
            </ul>
            <p>
              This is how your project ties into HOSGAI: You turned AI from a diagnostic instrument into something that must justify its thinking.
            </p>
          </div>

          <div className="about-item">
            <h3>What You Can See Here</h3>
            <p>
              When Llama and Gemini talk, you will notice:
            </p>
            <ul>
              <li>one leans toward certainty</li>
              <li>one leans toward possibility</li>
              <li>one frames data as measurable</li>
              <li>one frames data as contextual</li>
              <li>both project assumptions onto the student</li>
            </ul>
            <p>
              These tendencies aren't mistakes — they're bias signatures.
            </p>
            <p>
              The highlighted phrases show where the other AI detects:
            </p>
            <ul>
              <li>overconfidence</li>
              <li>speculation</li>
              <li>reductive reasoning</li>
              <li>linguistic hedging</li>
              <li>culturally coded assumptions</li>
            </ul>
            <p>
              Bias appears not as a "score," but as the shape of the language itself.
            </p>
          </div>

          <div className="about-item">
            <h3>How It Works</h3>
            <ul>
              <li>Both models receive the same benchmark summary.</li>
              <li>Llama speaks first.</li>
              <li>Gemini replies — sometimes building on it, sometimes challenging it.</li>
              <li>Each model can flag the other's phrasing when it appears biased or assumptive.</li>
              <li>You can hover to see why it was marked.</li>
              <li>You watch their reasoning drift, diverge, intersect, and contradict.</li>
            </ul>
            <p>
              No AI here is "correct." The value lies in observing how they interpret, not what they conclude.
            </p>
          </div>

          <div className="about-item">
            <h3>What This Is Not</h3>
            <p>
              This is not a diagnostic tool. It does not detect dyslexia. It does not evaluate users. It does not replace teachers, psychologists, or human interpretation.
            </p>
            <p>
              This is a critical demonstration of how AI constructs meaning — even in spaces where precision and care are essential.
            </p>
          </div>

          <div className="about-item">
            <h3>The Real Question</h3>
            <p>
              "What happens when machines explain humans?"
            </p>
            <p>
              More specifically: What do their words reveal about the systems that produced them?
            </p>
            <p>
              Everything you see on this page — the tone, the highlights, the disagreements — is a reminder that AI is not neutral. It is a lens. And every lens is skewed.
            </p>
          </div>

          <div className="about-item">
            <h3>Credits</h3>
            <p>
              Designed and built by Liam Moodley
            </p>
            <p>
              Created for DIGA4002A: Holding Our Space in the Age of GAI
            </p>
            <p>
              Supervision: Hanli Geyser
            </p>
            <p>
              Speech recognition powered by Whisper AI
            </p>
          </div>
        </div>
        <div className="back-to-top">
          <a href="#" className="back-to-top-link">
            <span className="back-arrow">↑</span>
            <span className="back-text">BACK TO TOP</span>
          </a>
        </div>

        {/* Footer with Research Export Link */}
        <div className="homepage-footer">
          <p>
            <button
              className="research-export-link"
              onClick={() => setCurrentPage('research-export')}
            >
              📊 Research Data Export
            </button>
            <span className="footer-divider">|</span>
            <button
              className="privacy-link"
              onClick={() => setShowPrivacyModal(true)}
            >
              🔐 Privacy & Data
            </button>
          </p>
          <p className="footer-note">
            Anonymous data collection for academic research • Press <kbd>P</kbd> for privacy info
          </p>
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
            </div>
            <div className={`proceed-section ${buttonsSlideOut ? 'slide-out' : ''}`}>
              <button
                className={`proceed-button ${allComplete ? 'enabled' : 'disabled'}`}
                disabled={!allComplete}
                onClick={handleGAIAnalysis}
              >
                The AI's Perspective
              </button>
            </div>

            {/* About the Benchmarks */}
            <div className="about-benchmarks">
              <h3>About the Benchmarks</h3>
              <p>These two reading benchmarks measure different aspects of reading performance.</p>

              <div className="benchmark-description">
                <h4>Benchmark 1: Oral Reading Fluency</h4>
                <p>Tracks accuracy, fluency, and pace while reading aloud.</p>
              </div>

              <div className="benchmark-description">
                <h4>Benchmark 2: Reading Pace Assessment</h4>
                <p>Tracks speed, skip rate, and reading endurance during a timed reading.</p>
              </div>

              <p className="ai-perspective-note">
                Once both benchmarks are complete, you can view The AI's Perspective to see how two AI models interpret the same results in a discussion.
              </p>
            </div>

            <button
              className="persistent-home-btn"
              onClick={() => handlePageTransition('home')}
            >
              ← HOME
            </button>
          </div>

          {/* Dyslexia Analysis Results Display */}
          {gaiAnalysisComplete && gaiAnalysisResults && (
            <div className="analysis-results-panel">
              <div className="analysis-header">
                <h3>Dyslexia Screening Analysis</h3>
                <div className="analysis-type-indicator">
                  {selectedAnalysisType === 'phonological' && 'Phonological Processing'}
                  {selectedAnalysisType === 'fluency' && 'Reading Fluency Assessment'}
                  {selectedAnalysisType === 'comprehensive' && 'Risk Assessment'}
                  {selectedAnalysisType === 'bias' && 'Bias & Limitations Analysis'}
                </div>
              </div>

              {(() => {
                try {
                  const analysisData = JSON.parse(gaiAnalysisResults[selectedAnalysisType]);

                  if (selectedAnalysisType === 'phonological') {
                    return (
                      <div className="analysis-content">
                        <div className="status-card">
                          <div className="status-label">Processing Strength</div>
                          <div className={`status-badge ${analysisData.status?.toLowerCase()}`}>
                            {analysisData.status}
                          </div>
                        </div>

                        <div className="findings-section">
                          <h4>Key Findings</h4>
                          <ul className="findings-list">
                            {analysisData.keyFindings?.map((finding, index) => (
                              <li key={index}>{finding}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="evidence-section">
                          <h4>Evidence</h4>
                          <ul className="evidence-list">
                            {analysisData.evidenceFound?.map((evidence, index) => (
                              <li key={index}>{evidence}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="interpretation-section">
                          <h4>Clinical Interpretation</h4>
                          <p>{analysisData.interpretation}</p>
                        </div>

                        <div className="recommendations-section">
                          <h4>Recommendations</h4>
                          <ul className="recommendations-list">
                            {analysisData.recommendations?.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                  if (selectedAnalysisType === 'fluency') {
                    return (
                      <div className="analysis-content">
                        <div className="metrics-row">
                          <div className="metric-card">
                            <div className="metric-label">Fluency Status</div>
                            <div className={`status-badge ${analysisData.status?.toLowerCase()}`}>
                              {analysisData.status}
                            </div>
                          </div>
                          <div className="metric-card">
                            <div className="metric-label">Reading Speed</div>
                            <div className="metric-value">{analysisData.readingSpeed}</div>
                          </div>
                          <div className="metric-card">
                            <div className="metric-label">Automaticity</div>
                            <div className="metric-value">{analysisData.automaticity}</div>
                          </div>
                        </div>

                        <div className="findings-section">
                          <h4>Key Findings</h4>
                          <ul className="findings-list">
                            {analysisData.keyFindings?.map((finding, index) => (
                              <li key={index}>{finding}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="interpretation-section">
                          <h4>Clinical Interpretation</h4>
                          <p>{analysisData.interpretation}</p>
                        </div>

                        <div className="recommendations-section">
                          <h4>Recommendations</h4>
                          <ul className="recommendations-list">
                            {analysisData.recommendations?.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                  if (selectedAnalysisType === 'comprehensive') {
                    return (
                      <div className="analysis-content">
                        <div className="risk-header">
                          <div className="risk-level-card">
                            <div className="risk-label">Risk Level</div>
                            <div className={`risk-badge ${analysisData.riskLevel?.toLowerCase().replace(/\s+/g, '-')}`}>
                              {analysisData.riskLevel}
                            </div>
                          </div>
                          <div className="confidence-card">
                            <div className="confidence-label">Confidence</div>
                            <div className="confidence-score">{analysisData.confidenceScore}</div>
                          </div>
                        </div>

                        <div className="strengths-concerns-row">
                          <div className="strengths-section">
                            <h4>Strengths</h4>
                            <ul className="strengths-list">
                              {analysisData.strengths?.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="concerns-section">
                            <h4>Areas of Concern</h4>
                            <ul className="concerns-list">
                              {analysisData.concerns?.map((concern, index) => (
                                <li key={index}>{concern}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="indicators-section">
                          <h4>Key Indicators</h4>
                          <ul className="indicators-list">
                            {analysisData.keyIndicators?.map((indicator, index) => (
                              <li key={index}>{indicator}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="next-steps-section">
                          <h4>Next Steps</h4>
                          <ul className="next-steps-list">
                            {analysisData.nextSteps?.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ul>
                          <div className="timeline">
                            <strong>Timeline:</strong> {analysisData.timeline}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (selectedAnalysisType === 'bias') {
                    return (
                      <div className="analysis-content">
                        <div className="bias-warning">
                          <strong>Critical Analysis:</strong> This assessment examines potential limitations and biases in the dyslexia screening process.
                        </div>

                        <div className="bias-sections-grid">
                          <div className="bias-section">
                            <h4>Potential Biases</h4>
                            <ul className="bias-list">
                              {analysisData.potentialBiases?.map((bias, index) => (
                                <li key={index}>{bias}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="limitation-section">
                            <h4>Data Limitations</h4>
                            <ul className="limitation-list">
                              {analysisData.dataLimitations?.map((limitation, index) => (
                                <li key={index}>{limitation}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="cultural-section">
                            <h4>Cultural Factors</h4>
                            <ul className="cultural-list">
                              {analysisData.culturalFactors?.map((factor, index) => (
                                <li key={index}>{factor}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="false-results-section">
                            <h4>False Positive Risks</h4>
                            <ul className="false-positive-list">
                              {analysisData.falsePositiveRisks?.map((risk, index) => (
                                <li key={index}>{risk}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="false-results-section">
                            <h4>False Negative Risks</h4>
                            <ul className="false-negative-list">
                              {analysisData.falseNegativeRisks?.map((risk, index) => (
                                <li key={index}>{risk}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="cautions-section">
                            <h4>Recommended Cautions</h4>
                            <ul className="cautions-list">
                              {analysisData.recommendedCautions?.map((caution, index) => (
                                <li key={index}>{caution}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="improvement-section">
                          <h4>How to Improve Accuracy</h4>
                          <ul className="improvement-list">
                            {analysisData.improveAccuracy?.map((improvement, index) => (
                              <li key={index}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }

                } catch (error) {
                  return (
                    <div className="analysis-content">
                      <div className="error-fallback">
                        <h4>Analysis Result</h4>
                        <p>{gaiAnalysisResults[selectedAnalysisType]}</p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      )}

      {/* Skewed Lenses - Chat Interface */}
      {currentPage === 'skewed-lenses' && (
        <ChatInterface
          benchmarkData={{
            benchmark1: savedBenchmarkResults.benchmark1,
            benchmark2: savedBenchmarkResults.benchmark2
          }}
          sessionId={sessionId}
          hasConsented={hasConsented}
          onClose={() => setCurrentPage('begin')}
        />
      )}

      {/* Research Export Dashboard */}
      {currentPage === 'research-export' && (
        <ResearchExport onClose={() => setCurrentPage('home')} />
      )}

      {currentPage === 'benchmark2' && (
        <div className="benchmark2-interface">
          {!benchmark2Completed && (
            <button
              className="persistent-home-btn"
              onClick={() => {
                setBenchmark2Started(false)
                setBenchmark2Completed(false)
                setCurrentPage('begin')
              }}
            >
              ← BACK
            </button>
          )}

          {!benchmark2Started && !benchmark2Completed && (
            <div className="benchmark2-start-screen">
              <h1>Benchmark 2 - Typing Assessment</h1>
              <p>Type each word exactly as shown. You have 2 minutes.</p>
              <div className="controls-reminder">
                <div><strong>Blue:</strong> Current word to type</div>
                <div><strong>Green:</strong> Correct letter</div>
                <div><strong>Yellow:</strong> Incorrect letter</div>
              </div>
              <button className="begin-benchmark-btn" onClick={startBenchmark2Test}>
                Begin Assessment
              </button>
            </div>
          )}

          {benchmark2Started && !benchmark2Completed && (
            <div className="benchmark2-test-interface">
              <div className="benchmark2-header">
                <div className="timer-display">
                  Time Remaining: {Math.floor(benchmark2Timer / 60)}:{(benchmark2Timer % 60).toString().padStart(2, '0')}
                </div>
                <div className="progress-display">
                  {benchmark2CurrentIndex} / {benchmark2Words.length} words
                </div>
              </div>

              <div className="reading-passage">
                {benchmark2Words.map((word, wordIndex) => {
                  const isCurrent = wordIndex === benchmark2CurrentIndex
                  const isPast = wordIndex < benchmark2CurrentIndex
                  const status = benchmark2WordStatuses[wordIndex]

                  return (
                    <span key={wordIndex} className="passage-word">
                      {isCurrent ? (
                        // Current word being typed - show character by character coloring
                        <span>
                          {word.split('').map((char, charIndex) => {
                            const typedChar = benchmark2TypedWord[charIndex]
                            let charClass = 'char-untyped'

                            if (typedChar !== undefined) {
                              charClass = typedChar.toLowerCase() === char.toLowerCase()
                                ? 'char-correct'
                                : 'char-incorrect'
                            }

                            return (
                              <span key={charIndex} className={charClass}>
                                {char}
                              </span>
                            )
                          })}
                        </span>
                      ) : isPast ? (
                        // Previous words - keep them colored based on status
                        <span>
                          {word.split('').map((char, charIndex) => (
                            <span
                              key={charIndex}
                              className={status === 1 ? 'char-correct' : 'char-incorrect'}
                            >
                              {char}
                            </span>
                          ))}
                        </span>
                      ) : (
                        // Future words - show as untyped
                        <span className="unread-word">
                          {word}
                        </span>
                      )}
                      {' '}
                    </span>
                  )
                })}
              </div>

              <div className="benchmark2-controls-display">
                <div className="control-item">
                  <div className="control-key">Instructions</div>
                  <div className="control-label">Type each word • Auto-advances when complete • SPACE to skip partial • TAB/ENTER to skip entire word</div>
                </div>
              </div>
            </div>
          )}

          {benchmark2Completed && benchmark2Results && (
            <div className="benchmark2-results">
              <div className="results-header">
                <h2>Reading Assessment Complete!</h2>
              </div>

              <div className="results-grid">
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.totalWords}</div>
                  <div className="result-label">Words Read</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.correctWords}</div>
                  <div className="result-label">Marked Correct</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.skippedWords}</div>
                  <div className="result-label">Words Skipped</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.wordsPerMinute}</div>
                  <div className="result-label">Words Per Minute</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.completionRate}%</div>
                  <div className="result-label">Completion Rate</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmark2Results.skipRate}%</div>
                  <div className="result-label">Skip Rate</div>
                </div>
              </div>

              {benchmark2Results.aiAnalysis && (
                <div className="ai-analysis-section">
                  <h3>Reading Pace Analysis</h3>
                  <div className="ai-analysis-content">
                    <p>{benchmark2Results.aiAnalysis}</p>
                  </div>
                </div>
              )}

              <div className="benchmark2-actions">
                <button
                  className="action-button secondary"
                  onClick={handleBenchmark2RestartWithConfirm}
                >
                  Restart Test
                </button>
                <button
                  className="action-button secondary"
                  onClick={handleBenchmark2ReturnWithConfirm}
                >
                  Return to Hub
                </button>
                <button
                  className="action-button primary"
                  onClick={handleBenchmark2SaveResults}
                >
                  {benchmark2SaveLoading ? (
                    <div className="save-loading">
                      <div className="loading-spinner"></div>
                    </div>
                  ) : benchmark2SaveSuccess ? (
                    <div className="save-success">
                      <span>Results Saved</span>
                      <div className="confetti-container">
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                      </div>
                    </div>
                  ) : (
                    'Save Results'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showRecordingInterface && (
        <div className="test-interface">
          {!benchmarkCompleted && (
            <button
              className="persistent-home-btn"
              onClick={() => {
                stopListening()
                setShowRecordingInterface(false)
                setButtonsSlideOut(false)
                setTestStarted(false)
                setShowBeginButton(true)
              }}
            >
              ← BACK
            </button>
          )}

          {showBeginButton && (
            <button className="begin-benchmark-btn" onClick={startTest}>
              Begin Benchmark
            </button>
          )}

          {showCountdown && (
            <div className="simple-countdown">
              {countdownNumber}
            </div>
          )}

          {testStarted && isAssessmentActive && !benchmarkCompleted && (
            <div className="test-layout">
              <div className="fluency-score-text">
                Fluency Score: {totalCorrect}/{totalWords}
                <div className="audio-indicators">
                  <div className={`microphone-indicator ${noInputDetected ? 'no-input' : (isListening ? 'listening' : 'inactive')}`}>
                    <svg viewBox="0 0 24 24" className="mic-icon">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    {isListening && (
                      <div className="audio-bars">
                        <div className="audio-bar" style={{'--delay': '0ms'}}></div>
                        <div className="audio-bar" style={{'--delay': '150ms'}}></div>
                        <div className="audio-bar" style={{'--delay': '300ms'}}></div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="progress-indicator">
                <div className="progress-line">
                  {[0, 1, 2, 3, 4, 5].map((milestoneIndex) => {
                    const isCompleted = currentSentenceIndex > milestoneIndex
                    const isCurrent = currentSentenceIndex === milestoneIndex
                    const wordsInCurrentSentence = Math.max(0, currentWordIndex - (currentSentenceIndex * 5))
                    const progress = isCurrent ? wordsInCurrentSentence / 5 : 0

                    // Calculate skipped words in this segment
                    const segmentStartIndex = milestoneIndex * 5
                    const segmentEndIndex = segmentStartIndex + 5
                    const segmentStatuses = wordStatuses.slice(segmentStartIndex, segmentEndIndex)
                    const skippedCount = segmentStatuses.filter(status => status === 3).length
                    const skippedPercentage = (skippedCount / 5) * 100

                    return (
                      <div key={milestoneIndex} className="milestone-container">
                        <div
                          className="progress-segment"
                          style={{
                            '--progress': isCurrent ? `${progress * 100}%` : isCompleted ? '100%' : '0%'
                          }}
                        >
                          {skippedCount > 0 && (
                            <div
                              className="progress-fill yellow"
                              style={{
                                width: `${skippedPercentage}%`
                              }}
                            />
                          )}
                        </div>
                        <div className={`milestone ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                          {isCompleted && (
                            <div className="milestone-check">
                              <svg viewBox="0 0 24 24" className="check-circle">
                                <circle cx="12" cy="12" r="10" className="check-circle-bg" />
                                <path d="M9 12l2 2 4-4" className="check-mark" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="words-section-positioned">
                {getCurrentSentence().map((word, index) => {
                  // Calculate correct global word index for this word
                  const globalWordIndex = (currentSentenceIndex * 5) + index
                  const status = getWordStatus(globalWordIndex)
                  const isCurrent = globalWordIndex === currentWordIndex

                  return (
                    <span
                      key={`${currentSentenceIndex}-${index}`}
                      className={`test-word ${
                        status === 1 ? 'correct' :
                        status === 2 ? 'incorrect' :
                        isCurrent ? 'current' : 'unread'
                      }`}
                    >
                      {word}
                    </span>
                  )
                })}
              </div>

              <div className="benchmark-controls">
                <button
                  className={`action-button ${isListening ? 'secondary' : 'primary'}`}
                  onClick={handleRecordingToggle}
                >
                  {isListening ? 'Pause Benchmark' : 'Continue Benchmark'}
                </button>

                <button
                  className="action-button secondary"
                  onClick={skipCurrentWord}
                  disabled={!canSkipCurrentWord}
                >
                  <span className="button-content">
                    Skip Word
                    <span className="enter-key-hint">⏎</span>
                  </span>
                </button>
              </div>

              {/* Live Transcription */}
              {(transcript || interimTranscript) && (
                <div className="live-transcription">
                  <span className="transcription-text">
                    {transcript}
                    {interimTranscript && (
                      <span className="interim-text">{interimTranscript}</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {benchmarkCompleted && benchmarkResults && (
            <div className="results-screen">
              <div className="results-header">
                <h2>Benchmark Complete!</h2>
                <div className="final-score">
                  Fluency Score: {benchmarkResults.fluencyScore.correct}/{benchmarkResults.fluencyScore.total} ({benchmarkResults.fluencyScore.percentage}%)
                </div>
              </div>

              <div className="results-grid">
                <div className="result-item">
                  <div className="result-value">{benchmarkResults.fluencyScore.correct}</div>
                  <div className="result-label">Words Correct</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmarkResults.fluencyScore.total}</div>
                  <div className="result-label">Total Words</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmarkResults.fluencyScore.percentage}%</div>
                  <div className="result-label">Accuracy</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{benchmarkResults.errorAnalysis?.totalAttempts || 0}</div>
                  <div className="result-label">Total Attempts</div>
                </div>
              </div>

              <div className="save-controls">
                <button
                  className="action-button secondary"
                  onClick={handleRestartWithConfirm}
                >
                  Restart
                </button>
                <button
                  className="action-button secondary"
                  onClick={handleReturnWithConfirm}
                >
                  Return to Hub
                </button>
                <button
                  className={`action-button primary ${(resultsSaved && !isSaving) ? 'disabled-save' : ''}`}
                  onClick={handleSaveResults}
                  disabled={resultsSaved && !isSaving}
                >
                  {isSaving ? (
                    <div className="save-loading">
                      <div className="loading-spinner"></div>
                    </div>
                  ) : saveSuccess ? (
                    <div className="save-success">
                      <span>Results Saved</span>
                      <div className="confetti-container">
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                      </div>
                    </div>
                  ) : (
                    'Save Results'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showBenchmark1Modal && (
        <div className="modal-overlay" onClick={() => closeModal(setShowBenchmark1Modal)}>
          <div className={`benchmark-modal ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Benchmark 1 - Oral Reading Fluency</h2>
            </div>

            <div className="modal-content">
              <div className="demo-simple">
                <div className="demo-states">
                  <div className="demo-state">
                    <span className="demo-word current">speaking</span>
                    <div className="demo-label">current word</div>
                  </div>
                  <div className="demo-state">
                    <span className="demo-word completed">correct</span>
                    <div className="demo-label">correct</div>
                  </div>
                  <div className="demo-state">
                    <span className="demo-word incorrect">wrong</span>
                    <div className="demo-label">incorrect</div>
                  </div>
                </div>
              </div>

              <div className="separator-line"></div>

              <div className="test-description">
                <p>You'll read 6 sentences (5 words each) from a passage. Each word turns blue when you speak it, then green if correct or yellow if incorrect. After each sentence, there's a brief pause before the next one appears. Read naturally and skip words if needed.</p>
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

      {/* Benchmark 2 Modal */}
      {showBenchmark2Modal && (
        <div className="modal-overlay" onClick={() => closeModal(setShowBenchmark2Modal)}>
          <div className={`benchmark-modal ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Benchmark 2 - Reading Pace</h2>
            </div>

            <div className="modal-content">
              <div className="demo-simple">
                <div className="demo-states">
                  <div className="demo-state">
                    <span className="demo-word current">reading</span>
                    <div className="demo-label">current word</div>
                  </div>
                  <div className="demo-state">
                    <span className="demo-word completed">correct</span>
                    <div className="demo-label">typed correctly</div>
                  </div>
                  <div className="demo-state">
                    <span className="demo-word incorrect">skipped</span>
                    <div className="demo-label">incorrect</div>
                  </div>
                </div>
              </div>

              <div className="separator-line"></div>

              <div className="test-description">
                <p>Type each word exactly as shown. You have 2 minutes. As you type, correct letters turn green and incorrect letters turn yellow. Press SPACE to move to the next word.</p>
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
                onClick={() => startBenchmark('benchmark2')}
              >
                BEGIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleConfirmCancel}>
          <div className={`benchmark-modal small-modal no-animation ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Unsaved Results</h2>
            </div>

            <div className="modal-content">
              <div className="test-description">
                <p>You have unsaved benchmark results. If you continue without saving, your progress will be lost. Would you like to proceed anyway?</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={handleConfirmCancel}
              >
                Back
              </button>
              <button
                className="action-button primary"
                onClick={handleConfirmProceed}
              >
                Proceed Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Failure Modal */}
      {showSaveFailModal && (
        <div className="modal-overlay" onClick={() => setShowSaveFailModal(false)}>
          <div className={`benchmark-modal small-modal no-animation ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Failed</h2>
            </div>

            <div className="modal-content">
              <div className="test-description">
                <p>Failed to save results. Please check your connection and try again.</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => setShowSaveFailModal(false)}
              >
                Back
              </button>
              <button
                className="action-button primary"
                onClick={() => {
                  setShowSaveFailModal(false)
                  handleSaveResults()
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {showRestartConfirmModal && (
        <div className="modal-overlay" onClick={handleRestartConfirmCancel}>
          <div className={`benchmark-modal small-modal no-animation ${modalClosing ? 'modal-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Restart Benchmark</h2>
            </div>

            <div className="modal-content">
              <div className="test-description">
                <p>Your current results are saved. Restarting will delete the saved results and replace them with new ones. Do you want to continue?</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={handleRestartConfirmCancel}
              >
                Back
              </button>
              <button
                className="action-button primary"
                onClick={handleRestartConfirmProceed}
              >
                Delete Save & Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other modals... */}

      {/* Privacy & Data Collection Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={handlePrivacyClose}
        onAccept={handlePrivacyAccept}
        onDecline={handlePrivacyDecline}
      />
    </div>
  )
}

export default App