import React, { useState } from 'react';
import './StartNode.css';

const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm, interpretive' },
  gemini: { name: 'Gemini', description: 'Formal, academic' },
};

const LENS_COLORS = {
  clinical: { color: '#00BFA6', name: 'Clinical' },
  educational: { color: '#F4C542', name: 'Educational' },
  empathetic: { color: '#FF8FA3', name: 'Empathetic' },
  technical: { color: '#9EA0A6', name: 'Technical' },
  cultural: { color: '#A78BFA', name: 'Cultural' },
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
        <h3>Start Analysis</h3>
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
            {AI_MODELS[selectedAI].name} selected
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
                boxShadow: selectedLens === key ? `0 0 12px ${lens.color}60` : 'none',
                color: selectedLens === key ? lens.color : '#FFFFFF'
              }}
            >
              <span className="lens-name">{lens.name.toUpperCase()}</span>
            </button>
          ))}
        </div>
        {selectedLens && (
          <div className="selected-indicator" style={{ color: LENS_COLORS[selectedLens].color }}>
            {LENS_COLORS[selectedLens].name.toUpperCase()} selected
          </div>
        )}
      </div>

      {/* Confirmation Summary */}
      {isConfirmEnabled && (
        <div className="confirmation-summary">
          <div className="summary-row">
            <span className="summary-label">AI Model:</span>
            <span className="summary-value">{AI_MODELS[selectedAI].name}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Lens:</span>
            <span className="summary-value" style={{ color: LENS_COLORS[selectedLens].color }}>
              {LENS_COLORS[selectedLens].name.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <button
        className={`confirm-button ${isConfirmEnabled ? 'enabled' : 'disabled'}`}
        style={{
          borderColor: isConfirmEnabled ? LENS_COLORS[selectedLens]?.color : 'transparent',
        }}
        onClick={handleConfirm}
        disabled={!isConfirmEnabled}
        title={!isConfirmEnabled ? "Select AI model and lens before generating" : ""}
      >
        Confirm & Generate
      </button>
    </div>
  );
}

export default StartNode;
