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
            <h3>Research Data Collection</h3>
            <p>
              This project collects <strong>anonymous data</strong> to study AI bias perception in educational tools.
            </p>
          </div>

          <div className="privacy-section">
            <h3>What We Collect</h3>
            <ul>
              <li>Benchmark test results (anonymous)</li>
              <li>AI conversation transcripts</li>
              <li>Bias annotation votes</li>
              <li>Session metadata (no personal info)</li>
            </ul>
          </div>

          <div className="privacy-section">
            <h3>Your Privacy</h3>
            <ul>
              <li>No personal information</li>
              <li>Anonymous session IDs only</li>
              <li>Secure encrypted storage</li>
              <li>Academic research use only</li>
            </ul>
          </div>

          <div className="privacy-section privacy-highlight">
            <p>
              Accept to contribute to research. Decline to use locally only. Press <kbd>P</kbd> anytime to change.
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
