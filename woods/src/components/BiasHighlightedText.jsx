import React from 'react';
import { highlightBias } from '../utils/biasHighlighter';
import './BiasHighlightedText.css';

/**
 * Renders text with inline bias highlighting
 * Shows linguistic patterns that reveal AI interpretation bias
 */
const BiasHighlightedText = ({ text }) => {
  const segments = highlightBias(text);

  return (
    <div className="bias-highlighted-text">
      {segments.map((segment, index) => {
        if (segment.type === 'plain') {
          return <span key={index}>{segment.text}</span>;
        }

        // Bias-highlighted segment
        return (
          <span
            key={index}
            className={`bias-highlight bias-${segment.biasType}`}
            style={{ color: segment.color }}
            title={`${segment.name}: ${segment.description}`}
            data-bias={segment.biasType}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
};

export default BiasHighlightedText;
