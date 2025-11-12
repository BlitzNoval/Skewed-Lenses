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

function ChatInterface({ benchmarkData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [biasVotes, setBiasVotes] = useState({}); // Track user votes on bias flags
  const [stats, setStats] = useState({ llamaFlags: 0, geminiFlags: 0 });
  const messagesEndRef = useRef(null);
  const conversationHistoryRef = useRef([]);

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
      content: 'Two AI models interpret the same benchmark differently. Their conversation below exposes how language itself shapes what AI believes is true.',
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
      const message = {
        id: `msg-${turnNumber}`,
        type: 'ai',
        aiModel: modelKey,
        content: text, // Show full content immediately with fade-up
        fullContent: text,
        annotations,
        isTyping: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, message]);
      resolve();
    });
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

  const handleBiasVote = (messageId, annotationIndex, vote) => {
    const voteKey = `${messageId}-${annotationIndex}`;
    setBiasVotes(prev => ({
      ...prev,
      [voteKey]: vote
    }));
  };

  const getVotePercentage = (messageId, annotationIndex) => {
    // Simulate consensus - in real app would fetch from backend
    return Math.floor(Math.random() * 40) + 50; // 50-90%
  };

  const restartConversation = () => {
    setMessages([]);
    conversationHistoryRef.current = [];
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

        {/* Progressive Stats */}
        {stats.llamaFlags > 0 || stats.geminiFlags > 0 ? (
          <div className="stats-panel">
            <span className="stat-item">Llama Bias Flags: {stats.llamaFlags}</span>
            <span className="stat-divider">|</span>
            <span className="stat-item">Gemini Bias Flags: {stats.geminiFlags}</span>
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

              {/* Voting Mechanic */}
              {!msg.isTyping && showHighlights && msg.annotations && msg.annotations.length > 0 && (
                <div className="bias-validation">
                  {msg.annotations.slice(0, 3).map((ann, annIndex) => {
                    const voteKey = `${msg.id}-${annIndex}`;
                    const userVote = biasVotes[voteKey];

                    return (
                      <div key={annIndex} className="validation-item">
                        <div className="validation-phrase">
                          "{ann.text}" — {ann.reason}
                        </div>
                        {!userVote ? (
                          <div className="validation-prompt">
                            <span className="prompt-text">Is this bias flag valid?</span>
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
                          </div>
                        ) : (
                          <div className="validation-result">
                            You voted: {userVote === 'valid' ? 'Valid' : 'Not Valid'} ({getVotePercentage(msg.id, annIndex)}% agree)
                          </div>
                        )}
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
