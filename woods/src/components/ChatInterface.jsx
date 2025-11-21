import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import AnnotatedText from './AnnotatedText';
import { saveConversationMessage, saveAnnotationBatch, submitVote, generateConversationId } from '../lib/supabase';
import { generateConversationId as generateId } from '../hooks/useSessionTracking';

const AI_MODELS = {
  llama: {
    name: 'Llama',
    label: 'LLAMA — 1ST INTERPRETATION',
    color: '#0DD7A3',
    lightColor: '#1FFFC4',
    borderOpacity: '0.3',
    thinkingPhrases: [
      'crunching the numbers...',
      'running stats through the matrix...',
      'debugging my assumptions...',
      'compiling evidence...',
      'while(true) { think(); }',
      'checking for off-by-one errors...',
      'parsing data like it\'s JSON...',
      'calculating confidence intervals...',
      'console.log("thinking...")...',
      'trying to optimize this argument...'
    ]
  },
  gemini: {
    name: 'Gemini',
    label: 'GEMINI — RESPONSE',
    color: '#B48CFF',
    lightColor: '#D4B3FF',
    borderOpacity: '0.3',
    thinkingPhrases: [
      'reading between the lines...',
      'contemplating the human element...',
      'try { understand(); } catch...',
      'considering alternative perspectives...',
      'questioning my own biases...',
      'thinking outside the dataset...',
      'refactoring my interpretation...',
      'awaiting deeper insights...',
      'git commit -m "rethinking this"...',
      'deploying empathy.exe...'
    ]
  }
};

// Vote storage helper functions
const VOTES_STORAGE_KEY = 'skewed_lenses_votes';

const loadVotesFromStorage = () => {
  try {
    const stored = localStorage.getItem(VOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load votes:', error);
    return {};
  }
};

const saveVotesToStorage = (votes) => {
  try {
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
  } catch (error) {
    console.error('Failed to save votes:', error);
  }
};

// Animated counter component
function AnimatedCounter({ value, duration = 1400 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    let end = value;
    let startTime = null;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuad = progress * (2 - progress);
      const current = Math.floor(start + (end - start) * easeOutQuad);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (value !== displayValue) {
      requestAnimationFrame(animate);
    }
  }, [value]);

  return <>{displayValue}</>;
}

function ChatInterface({ benchmarkData, onClose, sessionId, hasConsented }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [allVotes, setAllVotes] = useState(() => loadVotesFromStorage()); // All votes from all users
  const [conversationId] = useState(() => generateId()); // Generate unique conversation ID once
  const [myVotes, setMyVotes] = useState({}); // Current user's votes
  const [stats, setStats] = useState({ llamaFlags: 0, geminiFlags: 0 });
  const messagesEndRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const usedPhrasesRef = useRef({ llama: [], gemini: [] }); // Track used phrases per AI

  // Auto-scroll to newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start conversation on mount
  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
  }, []);

  // Calculate stats when messages update
  useEffect(() => {
    const llamaFlags = messages
      .filter(m => m.annotations && m.annotations.some(a => a.model === 'llama'))
      .reduce((sum, m) => sum + m.annotations.filter(a => a.model === 'llama').length, 0);

    const geminiFlags = messages
      .filter(m => m.annotations && m.annotations.some(a => a.model === 'gemini'))
      .reduce((sum, m) => sum + m.annotations.filter(a => a.model === 'gemini').length, 0);

    setStats({ llamaFlags, geminiFlags });
  }, [messages]);

  const startConversation = () => {
    // Add system message with framing statement
    const systemMessage = {
      type: 'system',
      content: 'Two AIs debate the same student reading data. After they finish, vote on which interpretations show bias.',
      timestamp: new Date().toISOString()
    };

    setMessages([systemMessage]);

    // Start with Llama after brief delay
    setTimeout(() => {
      conductTurn('llama', 0);
    }, 1000);
  };

  const formatBenchmarkData = (data) => {
    return `📊 BENCHMARK RESULTS:
• Fluency: ${data.benchmark1?.fluencyScore?.percentage || 0}%
• Skip Rate: ${data.benchmark2?.skipRate || 0}%
• Words Per Minute: ${data.benchmark2?.wordsPerMinute || 0}
• Comprehension: ${data.benchmark2?.comprehensionLevel || 'Moderate'}`;
  };

  const conductTurn = async (modelKey, turnNumber) => {
    if (turnNumber >= 8) {
      // Stop after 8 turns and show reflection
      setConversationComplete(true);
      addReflectionMessage();
      return;
    }

    setIsTyping(true);

    try {
      // Call API
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
        // Add to conversation history
        conversationHistoryRef.current.push({
          role: 'assistant',
          content: data.message,
          model: AI_MODELS[modelKey].name
        });

        // Get annotations from the OTHER AI
        const otherAI = modelKey === 'llama' ? 'gemini' : 'llama';
        const annotations = await getAnnotations(otherAI, data.message);

        // Type out the message with fade-up animation
        await typeMessage(modelKey, data.message, annotations, turnNumber);

        setIsTyping(false);

        // Next turn - alternate between AIs
        const nextAI = modelKey === 'llama' ? 'gemini' : 'llama';
        setTimeout(() => {
          conductTurn(nextAI, turnNumber + 1);
        }, 1500);
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

  const typeMessage = (modelKey, text, annotations, turnNumber) => {
    return new Promise((resolve) => {
      const aiConfig = AI_MODELS[modelKey];
      const phrases = aiConfig.thinkingPhrases;

      // Pick a random thinking phrase that hasn't been used yet
      const usedPhrases = usedPhrasesRef.current[modelKey];
      const availablePhrases = phrases.filter(p => !usedPhrases.includes(p));

      // If all phrases have been used, reset for this AI
      const phrasesToChooseFrom = availablePhrases.length > 0 ? availablePhrases : phrases;
      if (availablePhrases.length === 0) {
        usedPhrasesRef.current[modelKey] = [];
      }

      const thinkingPhrase = phrasesToChooseFrom[Math.floor(Math.random() * phrasesToChooseFrom.length)];

      // Mark this phrase as used
      usedPhrasesRef.current[modelKey].push(thinkingPhrase);

      // First, add a typing indicator with thinking phrase
      const typingMessage = {
        id: `typing-${turnNumber}`,
        type: 'ai',
        aiModel: modelKey,
        content: '',
        fullContent: text,
        annotations,
        isTyping: true,
        thinkingPhrase,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, typingMessage]);

      // Longer typing delay - 2.5 to 4 seconds
      const typingDuration = Math.min(text.length * 20, 4000) + 1000;

      setTimeout(async () => {
        // Replace typing indicator with full message
        setMessages(prev =>
          prev.map(msg =>
            msg.id === `typing-${turnNumber}`
              ? {
                  ...msg,
                  id: `msg-${turnNumber}`,
                  content: text,
                  isTyping: false,
                  showTypingAnimation: true
                }
              : msg
          )
        );

        // Save to Supabase if user consented
        if (hasConsented && sessionId) {
          await saveConversationMessage(sessionId, {
            conversation_id: conversationId,
            turn_number: turnNumber,
            model: modelKey,
            role: 'assistant',
            content: text,
            metadata: { annotations }
          });

          // Save annotations to database
          if (annotations && annotations.length > 0) {
            const annotationsToSave = annotations.map((ann, idx) => ({
              annotation_id: `${conversationId}-turn${turnNumber}-ann${idx}`,
              conversation_id: conversationId,
              flagged_text: ann.text || ann.phrase || '',
              explanation: ann.reason || ann.explanation || 'Bias detected',
              bias_type: ann.category || 'general',
              flagged_by_model: modelKey,
              original_model: modelKey === 'llama' ? 'gemini' : 'llama',
              turn_number: turnNumber
            }));

            await saveAnnotationBatch(sessionId, conversationId, annotationsToSave);
          }
        }

        resolve();
      }, typingDuration);
    });
  };

  const addReflectionMessage = () => {
    const reflection = {
      type: 'reflection',
      content: `Both models analyzed the same student benchmark but diverged in tone and reasoning.

Llama framed uncertainty as a lack of data.

Gemini framed uncertainty as cognitive nuance.`,
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      setMessages(prev => [...prev, reflection]);
      // Auto-enable highlights when conversation completes
      setShowHighlights(true);
    }, 500);
  };

  const handleBiasVote = async (messageId, annotationIndex, vote) => {
    const voteKey = `${messageId}-${annotationIndex}`;

    // Track this user's vote
    setMyVotes(prev => ({
      ...prev,
      [voteKey]: vote
    }));

    // Add to aggregate votes
    setAllVotes(prev => {
      const updated = { ...prev };
      if (!updated[voteKey]) {
        updated[voteKey] = { valid: 0, invalid: 0 };
      }

      updated[voteKey][vote === 'valid' ? 'valid' : 'invalid'] += 1;

      // Save to localStorage
      saveVotesToStorage(updated);
      return updated;
    });

    // Save to Supabase if user consented
    if (hasConsented && sessionId) {
      const annotationId = `${conversationId}-turn${messageId.replace('msg-', '')}-ann${annotationIndex}`;
      await submitVote(sessionId, annotationId, vote);
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
    usedPhrasesRef.current = { llama: [], gemini: [] }; // Reset used phrases
    setConversationComplete(false);
    setBiasVotes({});
    setStats({ llamaFlags: 0, geminiFlags: 0 });
    startConversation();
  };

  return (
    <div className="academic-interface">
      {/* Interpretive Header */}
      <div className="interface-header">
        <div className="header-top">
          <button className="minimal-back-btn" onClick={onClose}>
            ← BACK
          </button>
          <div className="header-title">THE AI'S PERSPECTIVE</div>
          <div className="header-controls-right">
            {conversationComplete && (
              <>
                <button
                  className={`control-btn ${showHighlights ? 'active' : ''}`}
                  onClick={() => setShowHighlights(!showHighlights)}
                >
                  {showHighlights ? 'HIDE FLAGS' : 'SHOW FLAGS'}
                </button>
                <button className="control-btn" onClick={restartConversation}>
                  REPROMPT
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progressive Stats - Top Right Corner */}
        {stats.llamaFlags > 0 || stats.geminiFlags > 0 ? (
          <div className="stats-corner">
            <div className="stat-counter llama-counter">
              <span className="counter-label">LLAMA FLAGS</span>
              <span className="counter-value">
                <AnimatedCounter value={stats.llamaFlags} duration={600} />
              </span>
            </div>
            <div className="stat-counter gemini-counter">
              <span className="counter-label">GEMINI FLAGS</span>
              <span className="counter-value">
                <AnimatedCounter value={stats.geminiFlags} duration={600} />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dialogue Stream */}
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
              <div className="card-label" style={{ color: aiConfig.lightColor }}>
                {turnLabel}
              </div>
              <div
                className={`card-content ${msg.showTypingAnimation ? 'typing-animation' : ''}`}
                style={{
                  borderColor: `${aiConfig.color}${Math.round(parseFloat(aiConfig.borderOpacity) * 255).toString(16).padStart(2, '0')}`
                }}
              >
                {msg.isTyping ? (
                  <div className="typing-container">
                    <div className="typing-indicator">
                      <span className="dot" style={{ backgroundColor: aiConfig.lightColor }}></span>
                      <span className="dot" style={{ backgroundColor: aiConfig.lightColor }}></span>
                      <span className="dot" style={{ backgroundColor: aiConfig.lightColor }}></span>
                    </div>
                    <p className="thinking-phrase" style={{ color: aiConfig.lightColor }}>
                      {msg.thinkingPhrase}
                    </p>
                  </div>
                ) : showHighlights && msg.annotations && msg.annotations.length > 0 ? (
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

                        {/* Vote Stats Bar */}
                        {stats.total > 0 && (
                          <div className="vote-stats">
                            <div className="stats-bar">
                              <div
                                className="bar-valid"
                                style={{ width: `${stats.validPercent}%` }}
                              />
                              <div
                                className="bar-invalid"
                                style={{ width: `${100 - stats.validPercent}%` }}
                              />
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
