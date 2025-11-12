import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';
import AnnotatedText from './AnnotatedText';

const AI_MODELS = {
  llama: {
    name: 'Llama',
    color: '#06D6A0',
    icon: '🦙'
  },
  gemini: {
    name: 'Gemini',
    color: '#C77DFF',
    icon: '✨'
  }
};

function ChatInterface({ benchmarkData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);
  const [conversationComplete, setConversationComplete] = useState(false);
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

  const startConversation = () => {
    // Add system message with benchmark data
    const systemMessage = {
      type: 'system',
      content: formatBenchmarkData(benchmarkData),
      timestamp: new Date().toISOString()
    };

    setMessages([systemMessage]);

    // Start with Llama after brief delay
    setTimeout(() => {
      conductTurn('llama', 0);
    }, 1000);
  };

  const formatBenchmarkData = (data) => {
    return `📊 Benchmark Results:
• Fluency: ${data.benchmark1?.fluencyScore?.percentage || 0}%
• Skip Rate: ${data.benchmark2?.skipRate || 0}%
• Words Per Minute: ${data.benchmark2?.wordsPerMinute || 0}
• Comprehension: ${data.benchmark2?.comprehensionLevel || 'Moderate'}`;
  };

  const conductTurn = async (modelKey, turnNumber) => {
    if (turnNumber >= 8) {
      // Stop after 8 turns (4 each)
      setConversationComplete(true);
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

        // Type out the message gradually
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
        content: '',
        fullContent: text,
        annotations,
        isTyping: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, message]);

      // Type gradually
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        charIndex += 2; // Type 2 characters at a time

        if (charIndex >= text.length) {
          clearInterval(typeInterval);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === message.id
                ? { ...msg, content: text, isTyping: false }
                : msg
            )
          );
          resolve();
        } else {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === message.id
                ? { ...msg, content: text.slice(0, charIndex) }
                : msg
            )
          );
        }
      }, 30);
    });
  };

  const restartConversation = () => {
    setMessages([]);
    conversationHistoryRef.current = [];
    setConversationComplete(false);
    startConversation();
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={onClose}>
            ← Back
          </button>
          <h2>Skewed Lenses</h2>
        </div>
        <div className="header-controls">
          <button
            className={`toggle-btn ${showHighlights ? 'active' : ''}`}
            onClick={() => setShowHighlights(!showHighlights)}
          >
            {showHighlights ? '👁 Hide Highlights' : '👁 Show Highlights'}
          </button>
          {conversationComplete && (
            <button className="restart-btn" onClick={restartConversation}>
              🔄 Restart
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, index) => {
          if (msg.type === 'system') {
            return (
              <div key={index} className="message system-message">
                <div className="message-content">
                  {msg.content.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            );
          }

          const aiConfig = AI_MODELS[msg.aiModel];
          const isLlama = msg.aiModel === 'llama';

          return (
            <div
              key={msg.id}
              className={`message ai-message ${msg.aiModel}-message`}
            >
              <div className="message-avatar" style={{ background: aiConfig.color }}>
                {aiConfig.icon}
              </div>
              <div className="message-bubble" style={{ borderColor: aiConfig.color }}>
                <div className="message-header">
                  <span className="ai-name">{aiConfig.name}</span>
                </div>
                <div className="message-content">
                  {msg.isTyping ? (
                    <span>{msg.content}<span className="typing-cursor">|</span></span>
                  ) : (
                    <>
                      {showHighlights && msg.annotations && msg.annotations.length > 0 ? (
                        <AnnotatedText text={msg.content} annotations={msg.annotations} />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </>
                  )}
                </div>
                {!msg.isTyping && showHighlights && msg.annotations && msg.annotations.length > 0 && (
                  <div className="bias-notice">
                    <span className="bias-icon">🔍</span>
                    {msg.annotations.length} phrase{msg.annotations.length !== 1 ? 's' : ''} flagged by{' '}
                    {AI_MODELS[msg.annotations[0].model].name}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      {conversationComplete && (
        <div className="chat-footer">
          <div className="completion-message">
            ✓ Discussion complete. Two perspectives on your reading results.
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
