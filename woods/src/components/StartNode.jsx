import React, { useState } from 'react';
import './StartNode.css';

const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm, interpretive' },
  gemini: { name: 'Gemini', description: 'Formal, academic' },
};

const LENS_COLORS = {
  clinical: { color: '#00BFA6', name: 'Clinical', icon: '🏥' },
  educational: { color: '#F4C542', name: 'Educational', icon: '📚' },
  empathetic: { color: '#FF8FA3', name: 'Empathetic', icon: '❤️' },
  technical: { color: '#9EA0A6', name: 'Technical', icon: '🔬' },
  cultural: { color: '#A78BFA', name: 'Cultural', icon: '🌍' },
};

function StartNode({ data }) {
  const [selectedAI, setSelectedAI] = useState(null);
  const [selectedLens, setSelectedLens] = useState(null);

  const handleConfirm = () => {
    if (selectedAI && selectedLens && data.onConfirm) {
      data.onConfirm(selectedAI, selectedLens);
    }
  };

  const isConfirmEnabled = selectedAI && selectedLens;

  return (
    <div className="start-node-card">
      <div className="start-header">
        <h3>Start</h3>
        <p className="start-subtext">Your benchmark results are ready for analysis.</p>
      </div>

      <div className="start-divider"></div>

      {/* AI Selection */}
      <div className="selection-section">
        <label className="selection-label">Select AI Model</label>
        <div className="ai-chips">
          {Object.entries(AI_MODELS).map(([key, model]) => (
            <button
              key={key}
              className={`ai-chip ${selectedAI === key ? 'selected' : ''}`}
              onClick={() => setSelectedAI(key)}
            >
              <div className="chip-name">{model.name}</div>
              <div className="chip-desc">{model.description}</div>
            </button>
          ))}
        </div>
        {selectedAI && (
          <div className="selected-indicator">
            ✓ {AI_MODELS[selectedAI].name} selected
          </div>
        )}
      </div>

      {/* Lens Selection */}
      <div className="selection-section">
        <label className="selection-label">Select Lens</label>
        <div className="lens-chips">
          {Object.entries(LENS_COLORS).map(([key, lens]) => (
            <button
              key={key}
              className={`lens-chip ${selectedLens === key ? 'selected' : ''}`}
              onClick={() => setSelectedLens(key)}
              style={{
                borderColor: selectedLens === key ? lens.color : 'rgba(255,255,255,0.2)',
                boxShadow: selectedLens === key ? `0 0 12px ${lens.color}60` : 'none'
              }}
            >
              <span className="lens-icon">{lens.icon}</span>
              <span className="lens-name">{lens.name}</span>
            </button>
          ))}
        </div>
        {selectedLens && (
          <div className="selected-indicator" style={{ color: LENS_COLORS[selectedLens].color }}>
            ✓ {LENS_COLORS[selectedLens].name} selected
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <button
        className={`confirm-button ${isConfirmEnabled ? 'enabled' : 'disabled'}`}
        onClick={handleConfirm}
        disabled={!isConfirmEnabled}
      >
        Confirm and Generate
      </button>
    </div>
  );
}

export default StartNode;
