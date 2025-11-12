import React from 'react';
import './AnnotatedText.css';

/**
 * Renders text with multi-AI annotation overlays
 * Each AI's highlights appear as colored glows/halos
 * Overlapping highlights blend like light
 */

const AI_COLORS = {
  llama: { color: '#06D6A0', name: 'Llama', opacity: 0.5 },
  openrouter: { color: '#3A86FF', name: 'OpenRouter GPT', opacity: 0.4 },
  gemini: { color: '#C77DFF', name: 'Gemini', opacity: 0.6 }
};

const AnnotatedText = ({ text, annotations = [] }) => {
  console.log('📝 AnnotatedText rendering:', {
    textLength: text?.length,
    annotationsCount: annotations?.length,
    annotations: annotations
  });

  if (!annotations || annotations.length === 0) {
    console.log('   → No annotations, showing plain text');
    return <div className="annotated-text-plain">{text}</div>;
  }

  console.log('   → Rendering with', annotations.length, 'AI-marked biases');

  // Group overlapping annotations
  const segments = buildSegments(text, annotations);

  return (
    <div className="annotated-text-container">
      {segments.map((segment, index) => {
        if (segment.annotations.length === 0) {
          // Plain text
          return <span key={index}>{segment.text}</span>;
        }

        // Annotated segment - stack highlights
        const models = segment.annotations.map(a => a.model);
        const uniqueModels = [...new Set(models)];

        // Build rich tooltip with reasons
        const tooltipText = segment.annotations.map(ann =>
          `${AI_COLORS[ann.model].name}: ${ann.reason || 'Marked as biased'}`
        ).join('\n');

        return (
          <span
            key={index}
            className="annotated-segment"
            data-models={uniqueModels.join(',')}
            title={tooltipText}
            style={{
              position: 'relative',
              background: blendColors(uniqueModels),
              textShadow: uniqueModels.map(model => `0 0 8px ${AI_COLORS[model].color}`).join(', ')
            }}
          >
            {segment.text}
            {/* Glow layers */}
            {uniqueModels.map((model, i) => (
              <span
                key={i}
                className="glow-layer"
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  borderRadius: '3px',
                  border: `1px solid ${AI_COLORS[model].color}`,
                  opacity: AI_COLORS[model].opacity,
                  pointerEvents: 'none',
                  zIndex: -1 - i
                }}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
};

// Build text segments with annotation metadata
function buildSegments(text, annotations) {
  const points = [];

  // Collect all start/end points
  annotations.forEach(ann => {
    points.push({ index: ann.start, type: 'start', annotation: ann });
    points.push({ index: ann.end, type: 'end', annotation: ann });
  });

  // Sort by index
  points.sort((a, b) => a.index - b.index);

  const segments = [];
  let currentIndex = 0;
  let activeAnnotations = [];

  points.forEach(point => {
    // Add segment before this point
    if (point.index > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, point.index),
        annotations: [...activeAnnotations]
      });
      currentIndex = point.index;
    }

    // Update active annotations
    if (point.type === 'start') {
      activeAnnotations.push(point.annotation);
    } else {
      activeAnnotations = activeAnnotations.filter(a => a !== point.annotation);
    }
  });

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      annotations: []
    });
  }

  return segments;
}

// Blend multiple AI colors
function blendColors(models) {
  if (models.length === 0) return 'transparent';
  if (models.length === 1) {
    return `${AI_COLORS[models[0]].color}15`; // Light tint
  }

  // Multiple models - create gradient
  const colors = models.map(m => `${AI_COLORS[m].color}20`);
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}

export default AnnotatedText;
