import React from 'react';
import './BiasSummaryCard.css';

const AI_COLORS = {
  llama: { color: '#06D6A0', name: 'Llama', icon: '🟢' },
  openrouter: { color: '#3A86FF', name: 'OpenRouter', icon: '🔵' },
  gemini: { color: '#C77DFF', name: 'Gemini', icon: '🟣' }
};

/**
 * Shows how OTHER AIs interpreted THIS AI's reasoning
 * Displays 2-3 most common bias themes found by reviewers
 */
const BiasSummaryCard = ({ aiModel, annotations = [] }) => {
  if (!annotations || annotations.length === 0) {
    return null;
  }

  // Group annotations by reviewer AI
  const byReviewer = {};
  annotations.forEach(ann => {
    if (!byReviewer[ann.model]) {
      byReviewer[ann.model] = [];
    }
    byReviewer[ann.model].push(ann);
  });

  // Summarize each reviewer's perspective
  const reviews = Object.entries(byReviewer).map(([reviewerModel, anns]) => {
    // Get the most representative reason (longest or first)
    const topReason = anns.reduce((best, curr) =>
      curr.reason && curr.reason.length > (best.reason?.length || 0) ? curr : best
    , anns[0]);

    return {
      reviewer: reviewerModel,
      name: AI_COLORS[reviewerModel].name,
      icon: AI_COLORS[reviewerModel].icon,
      color: AI_COLORS[reviewerModel].color,
      count: anns.length,
      summary: topReason.reason || 'Marked multiple biased phrases'
    };
  });

  return (
    <div className="bias-summary-card">
      <div className="summary-header">
        <span className="summary-icon">👁</span>
        How others interpreted this AI's reasoning
      </div>
      <div className="summary-reviews">
        {reviews.map(review => (
          <div key={review.reviewer} className="review-item">
            <span className="reviewer-icon" style={{ color: review.color }}>
              {review.icon}
            </span>
            <div className="review-content">
              <span className="reviewer-name" style={{ color: review.color }}>
                {review.name}
              </span>
              <span className="review-summary">{review.summary}</span>
              <span className="review-count">({review.count} flagged)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiasSummaryCard;
