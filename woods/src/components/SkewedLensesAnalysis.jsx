import React, { useState, useEffect, useRef } from 'react';
import './SkewedLensesAnalysis.css';

// AI Models with lens colors
const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral tone' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm and interpretive' },
  gemini: { name: 'Gemini', description: 'Formal, academic' }
};

// Lenses with colors
const LENSES = {
  clinical: { name: 'Clinical Lens', icon: '🏥', description: 'Diagnostic, medical perspective', color: 'clinical' },
  educational: { name: 'Educational Lens', icon: '📚', description: 'Teacher-like, constructive', color: 'educational' },
  empathetic: { name: 'Empathetic Lens', icon: '❤️', description: 'Understanding, supportive', color: 'empathetic' },
  technical: { name: 'Technical Lens', icon: '🔬', description: 'Data-driven, objective', color: 'technical' },
  cultural: { name: 'Cultural Lens', icon: '🌍', description: 'Western-normed standards', color: 'cultural' }
};

function SkewedLensesAnalysis({ benchmarkData, onClose }) {
  const [step, setStep] = useState('select-ai');
  const [selectedAI, setSelectedAI] = useState(null);
  const [selectedLens, setSelectedLens] = useState(null);
  const [usedAIs, setUsedAIs] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analyzeBothOption, setAnalyzeBothOption] = useState(false);
  const scrollContainerRef = useRef(null);

  // Typing animation effect
  useEffect(() => {
    if (isTyping && currentAnalysis) {
      const fullText = currentAnalysis;
      let index = 0;
      setCurrentAnalysis('');

      const interval = setInterval(() => {
        if (index < fullText.length) {
          setCurrentAnalysis(prev => prev + fullText[index]);
          index++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 15); // Faster typing speed

      return () => clearInterval(interval);
    }
  }, [isTyping]);

  // Auto-scroll to latest response
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [conversationHistory, currentAnalysis]);

  const handleAISelection = (aiKey) => {
    setSelectedAI(aiKey);
    setUsedAIs([...usedAIs, aiKey]);
    setStep('select-lens');
  };

  const handleLensSelection = (lensKey) => {
    setSelectedLens(lensKey);
    setStep('analyzing');
    performAnalysis(selectedAI, lensKey);
  };

  const performAnalysis = async (aiModel, lens) => {
    const previousAnalysis = conversationHistory.length > 0
      ? conversationHistory[conversationHistory.length - 1].analysis
      : null;

    try {
      const response = await fetch('/api/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModel,
          lens,
          benchmarkData,
          previousAnalysis: analyzeBothOption ? previousAnalysis : null,
          analyzeBoth: analyzeBothOption && previousAnalysis !== null
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add to conversation history
        const newEntry = {
          aiModel: data.aiModel,
          aiKey: aiModel,
          lens: LENSES[lens].name,
          lensKey: lens,
          analysis: data.analysis,
          timestamp: data.timestamp
        };

        setConversationHistory(prev => [...prev, newEntry]);
        setCurrentAnalysis(data.analysis);
        setIsTyping(true);
        setStep('result');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setCurrentAnalysis('Error: Failed to get analysis. Please check your API keys and try again.');
      setIsTyping(false);
      setStep('result');
    }
  };

  const handleChangeAI = () => {
    setAnalyzeBothOption(false);
    setStep('change-ai');
  };

  const handleChangeLens = () => {
    setStep('change-lens');
  };

  const handleEndConversation = () => {
    onClose();
  };

  const getAvailableAIs = () => {
    return Object.keys(AI_MODELS).filter(ai => !usedAIs.includes(ai));
  };

  const showGridBackground = step === 'select-ai' || step === 'change-ai';

  return (
    <div className="skewed-lenses-container">
      {showGridBackground && <div className="grid-background"></div>}

      <div className="analysis-content">
        {/* Conversation Chain */}
        {conversationHistory.length > 0 && (
          <div className="conversation-chain">
            {conversationHistory.map((entry, index) => (
              <div key={index} className="chain-link">
                {entry.aiModel} • {entry.lens}
              </div>
            ))}
            {step !== 'result' && <div className="chain-link current">→</div>}
          </div>
        )}

        {/* Step 1: Select AI Model */}
        {step === 'select-ai' && (
          <div className="selection-screen">
            <h2>Choose your AI model</h2>
            <p className="subtitle">Each AI has different training and perspective</p>
            <div className="ai-grid">
              {Object.entries(AI_MODELS).map(([key, model]) => (
                <button
                  key={key}
                  className="ai-card"
                  onClick={() => handleAISelection(key)}
                >
                  <div className="ai-name">{model.name}</div>
                  <div className="ai-desc">{model.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Lens */}
        {(step === 'select-lens' || step === 'change-lens') && (
          <div className="selection-screen">
            <h2>How should this AI look at your results?</h2>
            <p className="subtitle">Each lens reveals different interpretations</p>
            <div className="lens-grid">
              {Object.entries(LENSES).map(([key, lens]) => (
                <button
                  key={key}
                  className="lens-card"
                  data-lens={key}
                  onClick={() => handleLensSelection(key)}
                >
                  <div className="lens-icon">{lens.icon}</div>
                  <div className="lens-name">{lens.name}</div>
                  <div className="lens-desc">{lens.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Analyzing */}
        {step === 'analyzing' && (
          <div className="analyzing-screen">
            <div className="loading-spinner"></div>
            <h2>Analyzing through {LENSES[selectedLens]?.name}...</h2>
            <div className="ai-badge">{AI_MODELS[selectedAI]?.name}</div>
          </div>
        )}

        {/* Step 4: Show Result(s) */}
        {step === 'result' && (
          <div className="result-screen">
            <div className="scroll-container" ref={scrollContainerRef}>
              {conversationHistory.map((entry, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <div className="connection-line"></div>}
                  <div className="response-card">
                    <div className="card-header">
                      <div className="card-ai-name">{entry.aiModel}</div>
                      <div className={`lens-chip ${entry.lensKey}`}>
                        {LENSES[entry.lensKey]?.icon} {entry.lens}
                      </div>
                    </div>
                    <div className="card-body">
                      {index === conversationHistory.length - 1 && isTyping ? (
                        <>
                          {currentAnalysis}
                          <span className="typing-cursor"></span>
                        </>
                      ) : (
                        entry.analysis
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {!isTyping && (
              <div className="action-buttons">
                <div className="primary-actions">
                  <button
                    className="action-btn primary"
                    onClick={handleChangeAI}
                    disabled={getAvailableAIs().length === 0}
                  >
                    {getAvailableAIs().length > 0
                      ? 'Use Different AI'
                      : 'All AIs Used'}
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={handleChangeLens}
                  >
                    Change Lens
                  </button>
                  <button
                    className="action-btn tertiary"
                    onClick={handleEndConversation}
                  >
                    End Session
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Change AI (with analyze options) */}
        {step === 'change-ai' && (
          <div className="selection-screen">
            <h2>Choose a new AI model</h2>
            <p className="subtitle">This AI will review your results</p>

            <div className="analyze-options">
              <label className="option-card">
                <input
                  type="radio"
                  name="analyzeOption"
                  value="results-only"
                  checked={!analyzeBothOption}
                  onChange={() => setAnalyzeBothOption(false)}
                />
                <div className="option-content">
                  <div className="option-title">📊 Analyze results only</div>
                  <div className="option-desc">Fresh perspective on your data</div>
                </div>
              </label>

              <label className="option-card">
                <input
                  type="radio"
                  name="analyzeOption"
                  value="results-and-previous"
                  checked={analyzeBothOption}
                  onChange={() => setAnalyzeBothOption(true)}
                />
                <div className="option-content">
                  <div className="option-title">🔍 Analyze previous AI + results</div>
                  <div className="option-desc">Compare interpretations, spot bias</div>
                </div>
              </label>
            </div>

            <div className="ai-grid">
              {getAvailableAIs().map((key) => {
                const model = AI_MODELS[key];
                return (
                  <button
                    key={key}
                    className="ai-card"
                    onClick={() => handleAISelection(key)}
                  >
                    <div className="ai-name">{model.name}</div>
                    <div className="ai-desc">{model.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {conversationHistory.length > 0 && step === 'result' && !isTyping && (
        <div className="ending-message">
          "There are infinite ways to read a single line."
        </div>
      )}
    </div>
  );
}

export default SkewedLensesAnalysis;
