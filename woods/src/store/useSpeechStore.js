import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useSpeechStore = create(devtools((set, get) => ({
  // Core speech state
  transcript: '',
  interimTranscript: '',
  isListening: false,
  isSupported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),

  // Assessment state
  currentSentenceIndex: 0,
  currentWordIndex: 0,
  sentences: [],
  wordStatuses: [], // 0 = unread, 1 = correct, 2 = incorrect
  totalCorrect: 0,
  totalWords: 0,
  isAssessmentActive: false,
  canSkipCurrentWord: false, // Shows skip button when current word is wrong
  benchmarkCompleted: false, // Shows save results screen
  benchmarkResults: null, // Stores final results for saving
  speechLog: [], // Stores all speech attempts for error tracking

  // Timing state for WPM calculations
  testStartTime: null,
  currentSentenceStartTime: null,
  wordStartTime: null, // When current word recognition began

  // Recognition instance
  recognition: null,

  // Actions
  setTranscript: (transcript) => set({ transcript }),
  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
  setListening: (isListening) => set({ isListening }),

  resetTranscript: () => set({
    transcript: '',
    interimTranscript: ''
  }),

  // Assessment actions
  initializeAssessment: (sentences) => {
    const totalWords = sentences.reduce((total, sentence) => total + sentence.length, 0)
    const now = Date.now()
    set({
      sentences,
      totalWords,
      currentSentenceIndex: 0,
      currentWordIndex: 0,
      wordStatuses: new Array(totalWords).fill(0),
      totalCorrect: 0,
      isAssessmentActive: true,
      transcript: '',
      interimTranscript: '',
      speechLog: [],
      // Initialize timing
      testStartTime: now,
      currentSentenceStartTime: now,
      wordStartTime: null
    })
  },

  processSpokenWords: (spokenText) => {
    const state = get()
    if (!state.isAssessmentActive || !state.sentences.length) return

    const currentSentence = state.sentences[state.currentSentenceIndex]
    if (!currentSentence) return

    const now = Date.now()
    const words = spokenText.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0)
    let { currentWordIndex, wordStatuses, totalCorrect, speechLog } = state
    const newWordStatuses = [...wordStatuses]
    const newSpeechLog = [...speechLog]
    let newCorrect = totalCorrect

    // Calculate current position within current sentence
    const sentenceStartIndex = state.currentSentenceIndex * 5
    let wordIndexInSentence = currentWordIndex - sentenceStartIndex

    // Set word start time if not set
    let wordStartTime = state.wordStartTime
    if (!wordStartTime) {
      wordStartTime = now
    }

    words.forEach(spokenWord => {
      // Stop if we've completed current sentence (5 words)
      if (wordIndexInSentence >= 5 || currentWordIndex >= state.totalWords) return

      const expectedWord = currentSentence[wordIndexInSentence]?.toLowerCase().replace(/[.,!?;]/g, '') || ''
      const cleanSpoken = spokenWord.replace(/[.,!?;]/g, '')

      const isMatch = cleanSpoken === expectedWord ||
                     cleanSpoken.includes(expectedWord) ||
                     expectedWord.includes(cleanSpoken) ||
                     (expectedWord.length > 3 && cleanSpoken.length > 3 &&
                      (expectedWord.startsWith(cleanSpoken.slice(0, 3)) ||
                       cleanSpoken.startsWith(expectedWord.slice(0, 3))))

      // Log this speech attempt with timing data
      newSpeechLog.push({
        timestamp: new Date().toISOString(),
        sentenceIndex: state.currentSentenceIndex,
        wordIndex: currentWordIndex,
        globalWordIndex: currentWordIndex,
        expectedWord: expectedWord,
        spokenWord: cleanSpoken,
        originalSpoken: spokenWord,
        isCorrect: isMatch,
        fullTranscript: spokenText,
        // Timing data for WPM analysis
        wordStartTime: wordStartTime,
        wordEndTime: now,
        wordDuration: now - wordStartTime,
        sentenceStartTime: state.currentSentenceStartTime,
        testStartTime: state.testStartTime
      })

      newWordStatuses[currentWordIndex] = isMatch ? 1 : 2
      if (isMatch) {
        newCorrect++
        // If they got it right, move to next word automatically
        currentWordIndex++
        wordIndexInSentence++
      }

      console.log(`Word ${currentWordIndex}: "${cleanSpoken}" vs "${expectedWord}" = ${isMatch ? '✅' : '❌'}`)
    })

    // Check if current word is wrong to show skip button
    const currentWordStatus = newWordStatuses[currentWordIndex]
    const canSkip = currentWordStatus === 2 // Word is marked incorrect

    set({
      currentWordIndex,
      wordStatuses: newWordStatuses,
      totalCorrect: newCorrect,
      canSkipCurrentWord: canSkip,
      speechLog: newSpeechLog,
      wordStartTime: null // Reset for next word
    })

    // Check if current sentence is complete (5 words per sentence)
    const wordsInCurrentSentence = currentWordIndex - (state.currentSentenceIndex * 5)
    if (wordsInCurrentSentence >= 5) {
      console.log(`✅ Sentence ${state.currentSentenceIndex + 1} complete! Moving to next...`)

      setTimeout(() => {
        const moved = get().moveToNextSentence()
        if (!moved) {
          console.log('🏁 All sentences completed!')
          get().completeAssessment()
        }
      }, 2000) // 2 second delay between sentences
    }

    // Check if assessment complete
    if (currentWordIndex >= state.totalWords) {
      get().completeAssessment()
    }
  },

  skipCurrentWord: () => {
    const state = get()
    if (!state.canSkipCurrentWord) return

    const now = Date.now()

    // Log the skip action
    const currentSentence = state.sentences[state.currentSentenceIndex]
    const sentenceStartIndex = state.currentSentenceIndex * 5
    const wordIndexInSentence = state.currentWordIndex - sentenceStartIndex
    const expectedWord = currentSentence[wordIndexInSentence]?.toLowerCase().replace(/[.,!?;]/g, '') || ''

    const wordStartTime = state.wordStartTime || now
    const newSpeechLog = [...state.speechLog]
    newSpeechLog.push({
      timestamp: new Date().toISOString(),
      sentenceIndex: state.currentSentenceIndex,
      wordIndex: state.currentWordIndex,
      globalWordIndex: state.currentWordIndex,
      expectedWord: expectedWord,
      spokenWord: '[SKIPPED]',
      originalSpoken: '[SKIPPED]',
      isCorrect: false,
      fullTranscript: '[WORD SKIPPED BY USER]',
      wasSkipped: true,
      // Timing data for WPM analysis
      wordStartTime: wordStartTime,
      wordEndTime: now,
      wordDuration: now - wordStartTime,
      sentenceStartTime: state.currentSentenceStartTime,
      testStartTime: state.testStartTime
    })

    const newWordIndex = state.currentWordIndex + 1
    const newWordStatuses = [...state.wordStatuses]
    newWordStatuses[state.currentWordIndex] = 3 // 3 = skipped (yellow)

    set({
      currentWordIndex: newWordIndex,
      canSkipCurrentWord: false, // Hide skip button after skipping
      speechLog: newSpeechLog,
      wordStatuses: newWordStatuses,
      wordStartTime: null // Reset for next word
    })

    console.log(`⏭️ Skipped word ${state.currentWordIndex}, moving to word ${newWordIndex}`)

    // Check if sentence complete after skip
    const wordsInCurrentSentence = newWordIndex - (state.currentSentenceIndex * 5)
    if (wordsInCurrentSentence >= 5) {
      console.log(`✅ Sentence ${state.currentSentenceIndex + 1} complete! Moving to next...`)

      setTimeout(() => {
        const moved = get().moveToNextSentence()
        if (!moved) {
          console.log('🏁 All sentences completed!')
          get().completeAssessment()
        }
      }, 2000)
    }
  },

  moveToNextSentence: () => {
    const state = get()
    if (state.currentSentenceIndex < state.sentences.length - 1) {
      set({
        currentSentenceIndex: state.currentSentenceIndex + 1,
        currentSentenceStartTime: Date.now(), // Reset sentence timing
        wordStartTime: null // Reset word timing
      })
      return true
    }
    return false
  },

  // WPM Calculation Functions
  calculateSentenceWPM: (sentenceIndex) => {
    const state = get()
    const sentenceLogs = state.speechLog.filter(log => log.sentenceIndex === sentenceIndex)
    if (sentenceLogs.length === 0) return 0

    const correctWords = sentenceLogs.filter(log => log.isCorrect).length
    if (correctWords === 0) return 0

    // Get sentence start and end times
    const sentenceStart = sentenceLogs[0]?.sentenceStartTime
    const sentenceEnd = sentenceLogs[sentenceLogs.length - 1]?.wordEndTime

    if (!sentenceStart || !sentenceEnd) return 0

    const durationMinutes = (sentenceEnd - sentenceStart) / (1000 * 60)
    return durationMinutes > 0 ? Math.round((correctWords / durationMinutes) * 10) / 10 : 0
  },

  calculateOverallWPM: () => {
    const state = get()
    const correctLogs = state.speechLog.filter(log => log.isCorrect)
    if (correctLogs.length === 0) return 0

    const testStart = state.testStartTime
    const testEnd = correctLogs[correctLogs.length - 1]?.wordEndTime || Date.now()

    if (!testStart) return 0

    // Calculate total time excluding 2-second sentence delays
    const totalSentences = Math.max(1, state.currentSentenceIndex + 1)
    const sentenceDelays = Math.max(0, totalSentences - 1) * 2000 // 2 seconds per delay
    const totalDuration = (testEnd - testStart) - sentenceDelays
    const durationMinutes = totalDuration / (1000 * 60)

    return durationMinutes > 0 ? Math.round((correctLogs.length / durationMinutes) * 10) / 10 : 0
  },

  calculateDetailedWPMMetrics: () => {
    const state = get()
    const sentenceWPMs = []

    // Calculate per-sentence WPMs
    for (let i = 0; i < state.sentences.length; i++) {
      sentenceWPMs.push(get().calculateSentenceWPM(i))
    }

    const overallWPM = get().calculateOverallWPM()
    const averageWPM = sentenceWPMs.length > 0 ?
      Math.round((sentenceWPMs.reduce((sum, wpm) => sum + wpm, 0) / sentenceWPMs.length) * 10) / 10 : 0

    return {
      overallWPM,
      averageWPM,
      sentenceWPMs,
      totalCorrectWords: state.speechLog.filter(log => log.isCorrect).length,
      totalTestDuration: Date.now() - (state.testStartTime || Date.now()),
      wpmCalculationDetails: {
        testStartTime: state.testStartTime,
        sentenceDelayAdjustment: Math.max(0, (state.currentSentenceIndex)) * 2000,
        wordTimings: state.speechLog.map(log => ({
          word: log.expectedWord,
          duration: log.wordDuration,
          isCorrect: log.isCorrect
        }))
      }
    }
  },

  completeAssessment: () => {
    const state = get()

    // Calculate WPM metrics
    const wpmMetrics = get().calculateDetailedWPMMetrics()

    // Create detailed results object
    const results = {
      fluencyScore: {
        correct: state.totalCorrect,
        total: state.totalWords,
        percentage: Math.round((state.totalCorrect / state.totalWords) * 100)
      },
      wpmMetrics,
      sentences: state.sentences,
      wordStatuses: state.wordStatuses,
      speechLog: state.speechLog,
      errorAnalysis: {
        totalAttempts: state.speechLog.length,
        correctAttempts: state.speechLog.filter(log => log.isCorrect).length,
        incorrectAttempts: state.speechLog.filter(log => !log.isCorrect).length,
        uniqueErrors: state.speechLog.filter(log => !log.isCorrect).map(log => ({
          expected: log.expectedWord,
          spoken: log.spokenWord,
          originalSpoken: log.originalSpoken
        }))
      },
      detailedResults: state.sentences.map((sentence, sentenceIndex) => {
        const startIndex = sentenceIndex * 5
        const sentenceStatuses = state.wordStatuses.slice(startIndex, startIndex + 5)
        const sentenceSpeechLog = state.speechLog.filter(log => log.sentenceIndex === sentenceIndex)
        return {
          sentenceIndex: sentenceIndex + 1,
          words: sentence,
          statuses: sentenceStatuses,
          correct: sentenceStatuses.filter(status => status === 1).length,
          total: sentence.length,
          speechAttempts: sentenceSpeechLog
        }
      }),
      timestamp: new Date().toISOString()
    }

    set({
      isAssessmentActive: false,
      benchmarkCompleted: true,
      benchmarkResults: results
    })

    console.log('Benchmark complete! Results:', results)
  },

  saveResults: () => {
    const state = get()
    if (state.benchmarkResults) {
      // For now, just cache in localStorage
      localStorage.setItem('benchmarkResults', JSON.stringify(state.benchmarkResults))
      console.log('Results saved to localStorage:', state.benchmarkResults)
      alert('Results saved successfully!')
    }
  },

  resetBenchmark: () => {
    set({
      isAssessmentActive: false,
      benchmarkCompleted: false,
      benchmarkResults: null,
      canSkipCurrentWord: false,
      currentSentenceIndex: 0,
      currentWordIndex: 0,
      wordStatuses: [],
      totalCorrect: 0,
      transcript: '',
      interimTranscript: '',
      speechLog: [],
      // Reset timing fields
      testStartTime: null,
      currentSentenceStartTime: null,
      wordStartTime: null
    })
  },

  // Speech recognition management
  setRecognition: (recognition) => set({ recognition }),


  cleanup: () => {
    const { recognition } = get()

    // Cleanup speech recognition
    if (recognition) {
      recognition.abort()
    }

    set({
      recognition: null,
      isListening: false,
      transcript: '',
      interimTranscript: '',
      isAssessmentActive: false
    })
  }
}), {
  name: 'speech-store'
}))

export default useSpeechStore