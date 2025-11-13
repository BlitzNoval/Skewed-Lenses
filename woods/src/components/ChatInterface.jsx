import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import AnnotatedText from './AnnotatedText';

const AI_MODELS = {
  llama: {
    name: 'Llama',
    label: 'LLAMA — 1ST INTERPRETATION',
    color: '#0DD7A3',
    borderOpacity: '0.3'
  },
  gemini: {
    name: 'Gemini',
    label: 'GEMINI — RESPONSE',
    color: '#B48CFF',
    borderOpacity: '0.3'
  }
};

// Get or create user session ID
function getUserSessionId() {
  let sessionId = localStorage.getItem('user_session_id');
  if (!sessionId) {
    sessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_session_id', sessionId);
  }
  return sessionId;
}

function ChatInterface({ benchmarkData, onClose, sessionId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [allVotes, setAllVotes] = useState({}); // Server vote counts
  const [myVotes, setMyVotes] = useState({}); // Current user's votes
  const [stats, setStats] = useState({ llamaFlags: 0, geminiFlags: 0 });
  const [isNewSession, setIsNewSession] = useState(!sessionId);
  const messagesEndRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const userSessionId = useRef(getUserSessionId());

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages if joining existing session
  useEffect(() => {
    if (sessionId && !isNewSession) {
      loadMessages();
      loadVotes();
    }
  }, [sessionId, isNewSession]);

  // Start new conversation if new session
  useEffect(() => {
    if (isNewSession && messages.length === 0) {
      startConversation();
    }
  }, [isNewSession]);

  // Poll for vote updates every 5 seconds
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      loadVotes();
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Calculate stats
  useEffect(() => {
    const llamaFlags = messages
      .filter(m => m.annotations && m.annotations.some(a => a.model === 'llama'))
      .reduce((sum, m) => sum + m.annotations.filter(a => a.model === 'llama').length, 0);

    const geminiFlags = messages
      .filter(m => m.annotations && m.annotations.some(a => a.model === 'gemini'))
      .reduce((sum, m) => sum + m.annotations.filter(a => a.model === 'gemini').length, 0);

    setStats({ llamaFlags, geminiFlags });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/load?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          type: 'ai',
          aiModel: m.aiModel,
          content: m.content,
          annotations: m.annotations,
          isTyping: false
        })));

        // Rebuild conversation history
        conversationHistoryRef.current = data.messages.map(m => ({
          role: 'assistant',
          content: m.content,
          model: AI_MODELS[m.aiModel]?.name
        }));

        if (data.messages.length >= 8) {
          setConversationComplete(true);
          addReflectionMessage();
        }
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const loadVotes = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/votes/get?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setAllVotes(data.voteCounts);
      }
    } catch (error) {
      console.error('Load votes error:', error);
    }
  };

  const startConversation = () => {
    const systemMessage = {
      type: 'system',
      content: 'Two AI models interpret the same benchmark differently. Their conversation below exposes how language itself shapes what AI believes is true.',
      timestamp: new Date().toISOString()
    };

    setMessages([systemMessage]);
    setTimeout(() => conductTurn('llama', 0), 1000);
  };

  const conductTurn = async (modelKey, turnNumber) => {
    if (turnNumber >= 8) {
      setConversationComplete(true);
      addReflectionMessage();
      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch('/api/discussion-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelKey,
          conversationHistory: conversationHistoryRef.current,
          benchmarkData,
          turnNumber
        })
      });

      const data = await response.json();

      if (data.success && data.message) {
        conversationHistoryRef.current.push({
          role: 'assistant',
          content: data.message,
          model: AI_MODELS[modelKey].name
        });

        // Get annotations from other AI
        const otherAI = modelKey === 'llama' ? 'gemini' : 'llama';
        const annotations = await getAnnotations(otherAI, data.message);

        // Save message to server
        const saveResponse = await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            aiModel: modelKey,
            content: data.message,
            turnNumber,
            annotations
          })
        });

        const saveData = await saveResponse.json();

        // Add message to UI
        const message = {
          id: saveData.message.id,
          type: 'ai',
          aiModel: modelKey,
          content: data.message,
          annotations,
          isTyping: false
        };

        setMessages(prev => [...prev, message]);
        setIsTyping(false);

        // Next turn
        const nextAI = modelKey === 'llama' ? 'gemini' : 'llama';
        setTimeout(() => conductTurn(nextAI, turnNumber + 1), 1500);
      } else {
        setIsTyping(false);
        setConversationComplete(true);
      }
    } catch (error) {
      console.error('Turn error:', error);
      setIsTyping(false);
      setConversationComplete(true);
    }
  };

  const getAnnotations = async (reviewerModel, targetText) => {
    try {
      const response = await fetch('/api/annotate-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerModel, targetText })
      });

      const data = await response.json();
      if (data.success && data.annotations) {
        return data.annotations.map(ann => ({ ...ann, model: reviewerModel }));
      }
    } catch (error) {
      console.error('Annotation error:', error);
    }
    return [];
  };

  const addReflectionMessage = () => {
    const reflection = {
      type: 'reflection',
      content: `Both models analyzed the same student benchmark but diverged in tone and reasoning.

Llama framed uncertainty as a lack of data.

Gemini framed uncertainty as cognitive nuance.

These linguistic differences reveal how AI bias lives not in code, but in interpretation.`,
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      setMessages(prev => [...prev, reflection]);
    }, 500);
  };

  const handleBiasVote = async (messageId, annotationIndex, vote) => {
    const voteKey = `${messageId}-${annotationIndex}`;

    // Track user's vote locally
    setMyVotes(prev => ({ ...prev, [voteKey]: vote }));

    // Submit to server
    try {
      const response = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          annotationIndex,
          voteType: vote,
          userSession: userSessionId.current
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update vote counts immediately
        setAllVotes(prev => ({
          ...prev,
          [voteKey]: data.counts
        }));
      }
    } catch (error) {
      console.error('Vote submit error:', error);
    }
  };

  const getVoteStats = (messageId, annotationIndex) => {
    const voteKey = `${messageId}-${annotationIndex}`;
    const votes = allVotes[voteKey] || { valid: 0, invalid: 0 };
    const total = votes.valid + votes.invalid;

    if (total === 0) return { validPercent: 0, total: 0, valid: 0, invalid: 0 };

    return {
      validPercent: Math.round((votes.valid / total) * 100),
      total,
      valid: votes.valid,
      invalid: votes.invalid
    };
  };

  const restartConversation = () => {
    setMessages([]);
    conversationHistoryRef.current = [];
    setConversationComplete(false);
    setMyVotes({});
    setAllVotes({});
    setStats({ llamaFlags: 0, geminiFlags: 0 });
    startConversation();
  };

  return (
    <div className="academic-interface">
      {/* Header */}
      <div className="interface-header">
        <div className="header-top">
          <button className="minimal-back-btn" onClick={onClose}>
            ← BACK
          </button>
          <div className="header-title">SKEWED LENSES</div>
          <div className="header-controls">
            <button
              className={`minimal-toggle ${showHighlights ? 'active' : ''}`}
              onClick={() => setShowHighlights(!showHighlights)}
            >
              {showHighlights ? 'HIDE HIGHLIGHTS' : 'SHOW HIGHLIGHTS'}
            </button>
            {conversationComplete && (
              <button className="minimal-restart" onClick={restartConversation}>
                RESTART
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats.llamaFlags > 0 || stats.geminiFlags > 0 ? (
          <div className="stats-panel">
            <span className="stat-item">Llama Bias Flags: {stats.llamaFlags}</span>
            <span className="stat-divider">|</span>
            <span className="stat-item">Gemini Bias Flags: {stats.geminiFlags}</span>
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="dialogue-stream">
        {messages.map((msg, index) => {
          if (msg.type === 'system') {
            return (
              <div key={index} className="framing-statement">
                {msg.content}
              </div>
            );
          }

          if (msg.type === 'reflection') {
            return (
              <div key={index} className="reflection-panel">
                <div className="reflection-label">SYSTEM SUMMARY</div>
                <div className="reflection-content">
                  {msg.content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            );
          }

          const aiConfig = AI_MODELS[msg.aiModel];
          const turnLabel = index === 1 ? aiConfig.label : aiConfig.label.replace('1ST INTERPRETATION', 'RESPONSE');

          return (
            <div key={msg.id} className="dialogue-card">
              <div className="card-label" style={{ color: `${aiConfig.color}66` }}>
                {turnLabel}
              </div>
              <div
                className="card-content"
                style={{
                  borderColor: `${aiConfig.color}${Math.round(parseFloat(aiConfig.borderOpacity) * 255).toString(16).padStart(2, '0')}`
                }}
              >
                {showHighlights && msg.annotations && msg.annotations.length > 0 ? (
                  <AnnotatedText text={msg.content} annotations={msg.annotations} />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {/* Voting Panel */}
              {!msg.isTyping && showHighlights && msg.annotations && msg.annotations.length > 0 && (
                <div className="voting-panel">
                  <div className="panel-header">COMMUNITY BIAS VALIDATION</div>
                  {msg.annotations.map((ann, annIndex) => {
                    const voteKey = `${msg.id}-${annIndex}`;
                    const userVote = myVotes[voteKey];
                    const stats = getVoteStats(msg.id, annIndex);

                    return (
                      <div key={annIndex} className="vote-item">
                        <div className="vote-phrase">
                          "{ann.text}" — {ann.reason}
                        </div>

                        {/* Vote Stats */}
                        {stats.total > 0 && (
                          <div className="vote-stats">
                            <div className="stats-bar">
                              <div className="bar-valid" style={{ width: `${stats.validPercent}%` }} />
                              <div className="bar-invalid" style={{ width: `${100 - stats.validPercent}%` }} />
                            </div>
                            <div className="stats-text">
                              <span className="stat-valid">{stats.valid} valid</span>
                              <span className="stat-divider">•</span>
                              <span className="stat-invalid">{stats.invalid} not valid</span>
                              <span className="stat-total">({stats.total} total votes)</span>
                            </div>
                          </div>
                        )}

                        {/* Vote Buttons */}
                        <div className="vote-actions">
                          {!userVote ? (
                            <>
                              <span className="vote-prompt">Is this bias flag valid?</span>
                              <button
                                className="vote-btn valid"
                                onClick={() => handleBiasVote(msg.id, annIndex, 'valid')}
                              >
                                ✓ VALID
                              </button>
                              <button
                                className="vote-btn invalid"
                                onClick={() => handleBiasVote(msg.id, annIndex, 'invalid')}
                              >
                                ✗ NOT VALID
                              </button>
                            </>
                          ) : (
                            <span className="user-voted">
                              You voted: {userVote === 'valid' ? '✓ Valid' : '✗ Not Valid'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatInterface;
