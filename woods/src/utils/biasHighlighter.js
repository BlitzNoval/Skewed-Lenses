// Linguistic Bias Detection & Highlighting System
// Reveals bias through word choice, sentiment, modality, and certainty

const BIAS_PATTERNS = {
  certainty: {
    color: '#118ab2',
    name: 'Certainty',
    description: 'Overconfident or absolute language',
    patterns: [
      /\b(definitely|clearly|obviously|certainly|without doubt|undoubtedly|absolutely|surely|unmistakably|unquestionably)\b/gi,
      /\b(must be|has to be|cannot be|will be)\b/gi,
      /\b(always|never|every|all|none)\b/gi
    ]
  },
  hedging: {
    color: '#c77dff',
    name: 'Hedging/Ambiguity',
    description: 'Uncertain or cautious language',
    patterns: [
      /\b(might|maybe|perhaps|possibly|could|may|potentially|seems|appears|suggests|indicates)\b/gi,
      /\b(somewhat|rather|fairly|quite|slightly)\b/gi,
      /\b(it seems|it appears|one could argue|it's possible)\b/gi
    ]
  },
  cognitive: {
    color: '#06d6a0',
    name: 'Cognitive Attribution',
    description: 'Attributing thoughts/beliefs to the student',
    patterns: [
      /\b(the student (thinks|believes|feels|understands|knows|realizes|perceives|assumes))\b/gi,
      /\b(they (think|believe|feel|understand|know|realize|perceive|assume))\b/gi,
      /\b(their (thinking|belief|understanding|perception|assumption))\b/gi
    ]
  },
  quantitative: {
    color: '#ffd166',
    name: 'Quantitative Emphasis',
    description: 'Data-driven or reductionist framing',
    patterns: [
      /\b\d+(\.\d+)?%/g, // Percentages
      /\b\d+\/\d+\b/g, // Fractions like 71/100
      /\b(data (shows|indicates|suggests|reveals|demonstrates))\b/gi,
      /\b(statistically|numerically|quantitatively|measurably)\b/gi,
      /\b(score|metric|measurement|rate|ratio)\b/gi
    ]
  },
  affective: {
    color: '#ff5e5e',
    name: 'Affective Language',
    description: 'Emotional or evaluative tone',
    patterns: [
      /\b(impressive|excellent|outstanding|remarkable|exceptional|strong|good|great)\b/gi,
      /\b(concerning|worrying|troubling|poor|weak|struggling|difficult|challenging)\b/gi,
      /\b(unfortunately|sadly|happily|hopefully|encouragingly)\b/gi,
      /\b(success|failure|achievement|problem|issue|difficulty)\b/gi
    ]
  }
};

/**
 * Highlights linguistic bias patterns in text
 * @param {string} text - The AI-generated text to analyze
 * @returns {Array} Array of segments with bias annotations
 */
export function highlightBias(text) {
  if (!text) return [];

  // Create an array to track all matches
  const matches = [];

  // Find all bias patterns
  Object.entries(BIAS_PATTERNS).forEach(([biasType, config]) => {
    config.patterns.forEach(pattern => {
      let match;
      // Reset regex index
      pattern.lastIndex = 0;

      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          biasType,
          color: config.color,
          name: config.name,
          description: config.description
        });
      }
    });
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Merge overlapping matches (keep first match)
  const mergedMatches = [];
  matches.forEach(match => {
    const hasOverlap = mergedMatches.some(m =>
      (match.start >= m.start && match.start < m.end) ||
      (match.end > m.start && match.end <= m.end)
    );
    if (!hasOverlap) {
      mergedMatches.push(match);
    }
  });

  // Build segments array
  const segments = [];
  let currentIndex = 0;

  mergedMatches.forEach(match => {
    // Add plain text before match
    if (currentIndex < match.start) {
      segments.push({
        text: text.slice(currentIndex, match.start),
        type: 'plain'
      });
    }

    // Add highlighted match
    segments.push({
      text: match.text,
      type: 'bias',
      biasType: match.biasType,
      color: match.color,
      name: match.name,
      description: match.description
    });

    currentIndex = match.end;
  });

  // Add remaining plain text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      type: 'plain'
    });
  }

  return segments;
}

/**
 * Analyzes bias distribution in text
 * @param {string} text - The AI-generated text
 * @returns {Object} Bias type counts
 */
export function analyzeBiasDistribution(text) {
  const distribution = {
    certainty: 0,
    hedging: 0,
    cognitive: 0,
    quantitative: 0,
    affective: 0
  };

  Object.entries(BIAS_PATTERNS).forEach(([biasType, config]) => {
    config.patterns.forEach(pattern => {
      pattern.lastIndex = 0;
      const matches = text.match(pattern);
      if (matches) {
        distribution[biasType] += matches.length;
      }
    });
  });

  return distribution;
}

/**
 * Detects if an AI response references another AI by name
 * @param {string} text - The AI response
 * @returns {Array} Names of referenced AIs
 */
export function detectAIReferences(text) {
  const references = [];
  const aiNames = ['Llama', 'OpenRouter', 'GPT', 'Gemini'];

  aiNames.forEach(name => {
    const pattern = new RegExp(`\\b${name}\\b`, 'i');
    if (pattern.test(text)) {
      references.push(name);
    }
  });

  return references;
}

export { BIAS_PATTERNS };
