/**
 * Session Tracking Hook
 *
 * Manages anonymous user sessions with persistent UUID tracking.
 * Each user gets a unique session ID stored in localStorage that persists across visits.
 * All data collection is tied to this anonymous session ID.
 */

import { useState, useEffect } from 'react';
import { createSession, updateSession } from '../lib/supabase';

// Generate a random UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate a unique conversation ID
export function generateConversationId() {
  return generateUUID();
}

/**
 * Hook for managing anonymous session tracking
 */
export function useSessionTracking() {
  const [sessionId, setSessionId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    try {
      // Check if user has consented to tracking
      const consentStatus = localStorage.getItem('skewed_lenses_consent');
      setHasConsented(consentStatus === 'accepted');

      // Get or create session ID
      let storedSessionId = localStorage.getItem('skewed_lenses_session_id');

      if (!storedSessionId) {
        // First time visitor - generate new session ID
        storedSessionId = generateUUID();
        localStorage.setItem('skewed_lenses_session_id', storedSessionId);

        // Only create session in database if user has consented
        if (consentStatus === 'accepted') {
          await createSession(storedSessionId, {
            first_visit: new Date().toISOString(),
            page_url: window.location.href,
          });
        }
      } else {
        // Returning visitor - update session metadata
        if (consentStatus === 'accepted') {
          await updateSession(storedSessionId, {
            last_visit: new Date().toISOString(),
            visit_count: (await getVisitCount()) + 1,
          });
        }
      }

      setSessionId(storedSessionId);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing session:', error);
      // Fallback: still set session ID even if database fails
      const fallbackId = localStorage.getItem('skewed_lenses_session_id') || generateUUID();
      localStorage.setItem('skewed_lenses_session_id', fallbackId);
      setSessionId(fallbackId);
      setIsInitialized(true);
    }
  }

  async function getVisitCount() {
    const count = localStorage.getItem('skewed_lenses_visit_count') || '0';
    return parseInt(count, 10);
  }

  function updateConsent(accepted) {
    const consentValue = accepted ? 'accepted' : 'declined';
    localStorage.setItem('skewed_lenses_consent', consentValue);
    setHasConsented(accepted);

    // If user just accepted, create session in database
    if (accepted && sessionId) {
      createSession(sessionId, {
        consent_given: new Date().toISOString(),
        page_url: window.location.href,
      });
    }
  }

  return {
    sessionId,
    isInitialized,
    hasConsented,
    updateConsent,
  };
}

export default useSessionTracking;
