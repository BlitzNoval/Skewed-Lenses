import React, { useState, useEffect } from 'react';
import './DynamicBiasKey.css';

/**
 * Dynamic Bias Key - evolves based on what AIs are actually flagging
 * Not a static taxonomy, but a living glossary of THIS session's bias patterns
 */
const DynamicBiasKey = ({ allAnnotations = [] }) => {
  const [biasThemes, setBiasThemes] = useState([]);

  useEffect(() => {
    if (allAnnotations.length === 0) return;

    // Extract all reasons and find common themes
    const reasons = allAnnotations
      .filter(ann => ann.reason)
      .map(ann => ann.reason);

    // Simple theme extraction - group by key words
    const themes = extractThemes(reasons);
    setBiasThemes(themes);
  }, [allAnnotations]);

  if (biasThemes.length === 0) return null;

  return (
    <div className="dynamic-bias-key">
      <div className="key-header">
        <span className="key-icon">🔍</span>
        How the AIs are defining bias in this discussion
      </div>
      <div className="key-themes">
        {biasThemes.map((theme, idx) => (
          <div key={idx} className="theme-item">
            <span className="theme-icon" style={{ color: theme.color }}>
              {theme.icon}
            </span>
            <div className="theme-content">
              <span className="theme-name">{theme.name}</span>
              <span className="theme-description">{theme.description}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="key-footer">
        Updated live as discussion evolves • {allAnnotations.length} total flags
      </div>
    </div>
  );
};

// Extract common bias themes from reasons
function extractThemes(reasons) {
  const themes = [];
  const counts = {
    certainty: 0,
    reduction: 0,
    projection: 0,
    evaluation: 0
  };

  reasons.forEach(reason => {
    const lower = reason.toLowerCase();
    if (lower.includes('certain') || lower.includes('confidence') || lower.includes('assumes')) {
      counts.certainty++;
    }
    if (lower.includes('reduc') || lower.includes('metric') || lower.includes('number')) {
      counts.reduction++;
    }
    if (lower.includes('student') || lower.includes('mental') || lower.includes('believes') || lower.includes('thinks')) {
      counts.projection++;
    }
    if (lower.includes('subjective') || lower.includes('evaluation') || lower.includes('judgment')) {
      counts.evaluation++;
    }
  });

  // Only include themes that appear at least twice
  if (counts.certainty >= 2) {
    themes.push({
      name: 'Overconfidence',
      description: 'Overly certain phrasing or absolute assumptions',
      icon: '🟣',
      color: '#C77DFF'
    });
  }

  if (counts.reduction >= 2) {
    themes.push({
      name: 'Reductionism',
      description: 'Reducing complexity to metrics over interpretation',
      icon: '🔵',
      color: '#3A86FF'
    });
  }

  if (counts.projection >= 2) {
    themes.push({
      name: 'Cognitive Projection',
      description: 'Assuming student reasoning or mental states',
      icon: '🟢',
      color: '#06D6A0'
    });
  }

  if (counts.evaluation >= 2) {
    themes.push({
      name: 'Subjective Judgment',
      description: 'Imposing evaluative language vs. describing patterns',
      icon: '🟡',
      color: '#ffd166'
    });
  }

  return themes;
}

export default DynamicBiasKey;
