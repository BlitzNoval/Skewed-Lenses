import React, { useState, useEffect } from 'react';
import './SessionBrowser.css';

function SessionBrowser({ onSelectSession, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions/list');
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Load sessions error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-browser">
      <div className="browser-header">
        <button className="minimal-back-btn" onClick={onClose}>
          ← BACK
        </button>
        <h2 className="browser-title">ACTIVE DISCUSSIONS</h2>
      </div>

      <div className="sessions-grid">
        {loading ? (
          <div className="loading-state">Loading conversations...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>No active discussions yet.</p>
            <p>Complete a benchmark to start a new conversation.</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className="session-card"
              onClick={() => onSelectSession(session.id)}
            >
              <div className="session-header">
                <h3 className="session-title">{session.title}</h3>
                <span className="session-date">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="session-stats">
                <div className="stat-item">
                  <span className="stat-label">Messages</span>
                  <span className="stat-value">{session.message_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Fluency</span>
                  <span className="stat-value">{session.benchmark_summary.fluency}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Skip Rate</span>
                  <span className="stat-value">{session.benchmark_summary.skipRate}%</span>
                </div>
              </div>

              <button className="join-btn">
                Join Discussion →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SessionBrowser;
