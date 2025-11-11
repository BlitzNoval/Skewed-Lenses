import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './AIDiscussionRailway.css';

const AI_CONFIGS = {
  llama: { name: 'Llama', color: '#06D6A0', row: 0 },
  openrouter: { name: 'OpenRouter GPT', color: '#3A86FF', row: 1 },
  gemini: { name: 'Gemini', color: '#C77DFF', row: 2 }
};

const TURN_ORDER = ['llama', 'openrouter', 'gemini'];

const AIDiscussionRailway = ({ benchmarkData, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [discussionActive, setDiscussionActive] = useState(false);
  const [discussionComplete, setDiscussionComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Initialize anchor nodes (AI avatars on the left)
  useEffect(() => {
    const anchorNodes = Object.entries(AI_CONFIGS).map(([key, config], index) => ({
      id: `anchor-${key}`,
      type: 'aiAnchor',
      position: { x: 50, y: index * 200 + 100 },
      data: {
        label: config.name,
        color: config.color,
        isActive: false
      },
      draggable: false
    }));

    setNodes(anchorNodes);
  }, []);

  // Start the discussion
  const startDiscussion = async () => {
    setDiscussionActive(true);
    setDiscussionComplete(false);
    setStatusMessage('Three AI systems are now discussing your reading results...');

    // Start the conversation loop
    await conductTurn(0);
  };

  // Conduct a single turn
  const conductTurn = async (turnNumber) => {
    if (turnNumber >= 10) {
      // End discussion after 10 messages
      endDiscussion();
      return;
    }

    const modelKey = TURN_ORDER[turnNumber % 3];
    const config = AI_CONFIGS[modelKey];

    // Update status
    setCurrentSpeaker(modelKey);
    setStatusMessage(`Now speaking: ${config.name}`);

    // Highlight active speaker
    setNodes(prevNodes =>
      prevNodes.map(node => {
        if (node.id.startsWith('anchor-')) {
          return {
            ...node,
            data: {
              ...node.data,
              isActive: node.id === `anchor-${modelKey}`
            }
          };
        }
        return node;
      })
    );

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Call API
      const response = await fetch('/api/discussion-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelKey,
          conversationHistory,
          benchmarkData,
          turnNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add message to history
        const newMessage = {
          role: 'assistant',
          content: data.message,
          model: modelKey,
          turnNumber
        };

        setConversationHistory(prev => [...prev, newMessage]);

        // Create new message node
        const messageNode = {
          id: `msg-${turnNumber}`,
          type: 'messageNode',
          position: { x: 300 + (turnNumber * 250), y: config.row * 200 + 100 },
          data: {
            label: data.message,
            color: config.color,
            aiName: config.name,
            turnNumber
          },
          draggable: true
        };

        // Create edge from anchor to message
        const newEdge = {
          id: `edge-${turnNumber}`,
          source: `anchor-${modelKey}`,
          target: `msg-${turnNumber}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: config.color, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: config.color,
          }
        };

        setNodes(prev => [...prev, messageNode]);
        setEdges(prev => [...prev, newEdge]);

        // Continue to next turn
        if (data.shouldContinue) {
          setTimeout(() => conductTurn(turnNumber + 1), 2000);
        } else {
          endDiscussion();
        }
      } else {
        // Handle error gracefully
        console.error('Turn error:', data.error);
        setStatusMessage(`${config.name} could not respond. Moving to next AI...`);
        setTimeout(() => conductTurn(turnNumber + 1), 2000);
      }
    } catch (error) {
      console.error('Network error:', error);
      setStatusMessage('Network error. Retrying...');
      setTimeout(() => conductTurn(turnNumber + 1), 2000);
    }
  };

  const endDiscussion = () => {
    setDiscussionActive(false);
    setDiscussionComplete(true);
    setCurrentSpeaker(null);
    setStatusMessage('Discussion complete. The AIs showed differing perspectives on your results.');

    // Remove active states
    setNodes(prevNodes =>
      prevNodes.map(node => ({
        ...node,
        data: { ...node.data, isActive: false }
      }))
    );
  };

  const restartDiscussion = () => {
    // Reset everything
    setConversationHistory([]);
    setTurnIndex(0);
    setDiscussionComplete(false);

    // Clear message nodes and edges
    setNodes(prevNodes => prevNodes.filter(n => n.id.startsWith('anchor-')));
    setEdges([]);

    // Restart
    startDiscussion();
  };

  return (
    <div className="ai-discussion-railway">
      <div className="railway-header">
        <h2>Skewed Lenses • AI Discussion</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="railway-status">
        <p>{statusMessage}</p>
        {currentSpeaker && (
          <div className="typing-indicator" style={{ color: AI_CONFIGS[currentSpeaker].color }}>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>

      <div className="railway-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{
            aiAnchor: AnchorNode,
            messageNode: MessageNode
          }}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#1a1a1f" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => node.data.color || '#666'}
            style={{ background: '#0c0c0f' }}
          />
        </ReactFlow>
      </div>

      <div className="railway-controls">
        {!discussionActive && !discussionComplete && (
          <button className="start-btn" onClick={startDiscussion}>
            Start Discussion
          </button>
        )}
        {discussionComplete && (
          <button className="restart-btn" onClick={restartDiscussion}>
            Restart Discussion
          </button>
        )}
      </div>
    </div>
  );
};

// Custom node component for AI anchors
const AnchorNode = ({ data }) => {
  return (
    <div
      className={`anchor-node ${data.isActive ? 'active' : ''}`}
      style={{
        borderColor: data.color,
        boxShadow: data.isActive ? `0 0 20px ${data.color}` : 'none'
      }}
    >
      <div className="anchor-circle" style={{ background: data.color }}>
        <span>{data.label.charAt(0)}</span>
      </div>
      <div className="anchor-label" style={{ color: data.color }}>
        {data.label}
      </div>
    </div>
  );
};

// Custom node component for messages
const MessageNode = ({ data }) => {
  return (
    <div
      className="message-node"
      style={{ borderLeftColor: data.color }}
    >
      <div className="message-header" style={{ color: data.color }}>
        {data.aiName}
      </div>
      <div className="message-content">
        {data.label}
      </div>
      <div className="message-meta">
        Turn {data.turnNumber + 1}
      </div>
    </div>
  );
};

export default AIDiscussionRailway;
