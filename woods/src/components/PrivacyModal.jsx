/**
 * Privacy & Data Collection Disclosure Modal
 *
 * Triggered by pressing 'P' key on homepage
 * Informs users about data collection and tracking
 */

import React, { useEffect, useState } from 'react';
import './PrivacyModal.css';

export default function PrivacyModal({ isOpen, onClose, onAccept, onDecline }) {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  if (!isVisible) return null;

  function handleAccept() {
    onAccept();
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade animation
  }

  function handleDecline() {
    onDecline();
    setIsVisible(false);
    setTimeout(onClose, 300);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }
  }

  return (
    <div
      className={`privacy-modal-backdrop ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`privacy-modal ${isVisible ? 'visible' : ''}`}>
        <div className="privacy-modal-header">
          <h2>Privacy & Data Collection Notice</h2>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="privacy-modal-content">
          <div className="privacy-section">
            <h3>🔬 Research Purpose</h3>
            <p>
              This project collects <strong>anonymous data</strong> to study how people perceive
              AI bias in educational assessment tools. Your participation helps advance research
              on AI ethics and digital coloniality.
            </p>
          </div>

          <div className="privacy-section">
            <h3>📊 What We Track</h3>
            <ul>
              <li>
                <strong>Benchmark Results:</strong> Your reading fluency and typing pace scores
                (anonymous performance data)
              </li>
              <li>
                <strong>AI Conversations:</strong> The full debate between AI models about your
                results
              </li>
              <li>
                <strong>Bias Annotations:</strong> AI-generated flags for potentially biased
                language
              </li>
              <li>
                <strong>Your Votes:</strong> Whether you agree/disagree with bias flags (community
                consensus data)
              </li>
              <li>
                <strong>Session Metadata:</strong> Timestamps, browser type, and usage patterns
                (no IP addresses or personal info)
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>🔐 How We Protect Your Privacy</h3>
            <ul>
              <li>
                <strong>No personal information collected</strong> - no names, emails, or
                identifiable data
              </li>
              <li>
                <strong>Anonymous session IDs</strong> - random UUIDs that can't be traced back to
                you
              </li>
              <li>
                <strong>No cross-site tracking</strong> - data only collected within this
                application
              </li>
              <li>
                <strong>Secure storage</strong> - all data encrypted in transit and at rest
                (Supabase cloud)
              </li>
              <li>
                <strong>Research use only</strong> - data used for academic analysis and
                educational purposes
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>🌍 Data Storage</h3>
            <p>
              All data is stored securely in an <strong>online cloud database (Supabase)</strong>.
              This allows researchers to:
            </p>
            <ul>
              <li>Analyze patterns across thousands of sessions</li>
              <li>Study how communities collectively perceive AI bias</li>
              <li>Export anonymized datasets for academic research</li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>✅ Your Rights</h3>
            <ul>
              <li>You can decline data collection (app still works, but votes won't be saved)</li>
              <li>You can change your mind anytime by pressing <kbd>P</kbd> again</li>
              <li>Your data is anonymous - we can't identify or delete specific user data</li>
              <li>This project is for educational purposes (DIGA4002A coursework)</li>
            </ul>
          </div>

          <div className="privacy-section privacy-highlight">
            <p>
              <strong>By accepting, you consent to anonymous data collection</strong> for research
              on AI bias perception. You're contributing to meaningful academic research on how
              people interpret AI-generated assessments.
            </p>
          </div>
        </div>

        <div className="privacy-modal-footer">
          <button className="privacy-btn privacy-btn-decline" onClick={handleDecline}>
            Decline (Local Only)
          </button>
          <button className="privacy-btn privacy-btn-accept" onClick={handleAccept}>
            Accept & Contribute to Research
          </button>
        </div>

        <div className="privacy-modal-meta">
          <p>
            <small>
              Press <kbd>P</kbd> anytime to view this notice again. Data collected under academic
              research guidelines.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
}
