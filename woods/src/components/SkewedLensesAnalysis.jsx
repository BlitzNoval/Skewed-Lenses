import React, { useState, useEffect } from 'react';
import './SkewedLensesAnalysis.css';

// AI Models
const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral tone', color: '#4A90E2' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm and interpretive', color: '#E24A90' },
  gemini: { name: 'Gemini', description: 'Formal, academic', color: '#90E24A' }
};

// Lenses
const LENSES = {
  clinical: { name: 'Clinical Lens', icon: '🏥', description: 'Diagnostic, medical perspective' },
  educational: { name: 'Educational Lens', icon: '📚', description: 'Teacher-like, constructive' },
  empathetic: { name: 'Empathetic Lens', icon: '❤️', description: 'Understanding, supportive' },
  technical: { name: 'Technical Lens', icon: '🔬', description: 'Data-driven, objective' },
  cultural: { name: 'Cultural Lens', icon: '🌍', description: 'Western-normed standards' }
};

function SkewedLensesAnalysis({ benchmarkData, onClose }) {
  const [step, setStep] = useState('select-ai'); // 'select-ai', 'select-lens', 'analyzing', 'result', 'change-ai', 'change-lens'
  const [selectedAI, setSelectedAI] = useState(null);
  const [selectedLens, setSelectedLens] = useState(null);
  const [usedAIs, setUsedAIs] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analyzeBothOption, setAnalyzeBothOption] = useState(false);

  // Typing animation effect
  useEffect(() => {
    if (isTyping && currentAnalysis) {
      const text = currentAnalysis;
      let index = 0;
      setCurrentAnalysis('');

      const interval = setInterval(() => {
        if (index < text.length) {
          setCurrentAnalysis(prev => prev + text[index]);
          index++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 20); // Typing speed

      return () => clearInterval(interval);
    }
  }, [isTyping]);

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
    setIsTyping(true);

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
        setCurrentAnalysis(data.analysis);

        // Add to conversation history
        setConversationHistory([...conversationHistory, {
          aiModel: data.aiModel,
          lens: LENSES[lens].name,
          analysis: data.analysis,
          timestamp: data.timestamp
        }]);

        setStep('result');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setCurrentAnalysis('Error: Failed to get analysis. Please try again.');
      setIsTyping(false);
      setStep('result');
    }
  };

  const handleChangeAI = () => {
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

  return (
    <div className="skewed-lenses-container">
      <div className="conversation-chain">
        {conversationHistory.map((entry, index) => (
          <div key={index} className="chain-link">
            <div className="chain-label">
              {entry.aiModel} • {entry.lens}
            </div>
          </div>
        ))}
        {conversationHistory.length > 0 && (
          <div className="chain-link current">→</div>
        )}
      </div>

      <div className="analysis-content">
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
                  style={{ borderColor: model.color }}
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
            <p className="ai-badge">{AI_MODELS[selectedAI]?.name}</p>
          </div>
        )}

        {/* Step 4: Show Result */}
        {step === 'result' && (
          <div className="result-screen">
            <div className="result-header">
              <div className="result-ai">{AI_MODELS[selectedAI]?.name}</div>
              <div className="result-lens">{LENSES[selectedLens]?.icon} {LENSES[selectedLens]?.name}</div>
            </div>

            <div className="chat-window">
              <div className="chat-message">
                <div className="message-text">
                  {currentAnalysis.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                {isTyping && <div className="typing-cursor">▊</div>}
              </div>
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
                    style={{ borderColor: model.color }}
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

      {conversationHistory.length > 0 && (
        <div className="ending-message">
          <p>"There are infinite ways to read a single line."</p>
        </div>
      )}
    </div>
  );
}

export default SkewedLensesAnalysis;
