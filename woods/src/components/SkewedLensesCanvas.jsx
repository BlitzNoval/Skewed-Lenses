import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './SkewedLensesCanvas.css';
import StartNode from './StartNode';
import AnnotatedText from './AnnotatedText';
import { detectAIReferences } from '../utils/biasHighlighter';

// Lens color palette
const LENS_COLORS = {
  clinical: { color: '#00BFA6', name: 'Clinical' },
  educational: { color: '#F4C542', name: 'Educational' },
  empathetic: { color: '#FF8FA3', name: 'Empathetic' },
  technical: { color: '#9EA0A6', name: 'Technical' },
  cultural: { color: '#A78BFA', name: 'Cultural' },
};

// AI Models
const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm, interpretive' },
  gemini: { name: 'Gemini', description: 'Formal, academic' },
};

// Parse AI response into structured sections
function parseAnalysisText(text) {
  if (!text) return [];

  // Remove all markdown formatting
  let cleanText = text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **
    .replace(/\*(.+?)\*/g, '$1')     // Remove italic *
    .replace(/\_\_(.+?)\_\_/g, '$1') // Remove __
    .replace(/\_(.+?)\_/g, '$1');    // Remove _

  // Split into sections based on common headers
  const sectionPatterns = [
    /^(Overall Assessment|Assessment|Summary):?\s*/im,
    /^(Strengths|Positive Indicators|What Went Well):?\s*/im,
    /^(Areas for Improvement|Considerations|Challenges|Areas to Watch):?\s*/im,
    /^(Recommendations|Next Steps|Suggestions):?\s*/im,
    /^(Encouragement|Support|Final Thoughts|Conclusion):?\s*/im,
  ];

  const sections = [];
  let currentSection = { title: '', content: '' };
  let foundFirstSection = false;

  const lines = cleanText.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    let matchedSection = false;
    for (let pattern of sectionPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (currentSection.content || currentSection.title) {
          sections.push(currentSection);
        }
        currentSection = {
          title: match[1],
          content: line.replace(pattern, '').trim()
        };
        foundFirstSection = true;
        matchedSection = true;
        break;
      }
    }

    if (!matchedSection) {
      if (!foundFirstSection && !currentSection.title) {
        currentSection.title = 'Analysis';
      }
      if (currentSection.content) {
        currentSection.content += '\n' + line;
      } else {
        currentSection.content = line;
      }
    }
  }

  if (currentSection.title || currentSection.content) {
    sections.push(currentSection);
  }

  // Break content into paragraphs
  sections.forEach(section => {
    section.paragraphs = section.content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  });

  return sections;
}

// Rendered Analysis Component
function RenderedAnalysis({ text, lensColor, isTyping, annotations }) {
  if (isTyping) {
    return (
      <div className="analysis-raw">
        {text}
        <span className="typing-cursor">▊</span>
      </div>
    );
  }

  // Use AnnotatedText with AI-to-AI annotations
  return (
    <div className="analysis-rendered">
      <AnnotatedText text={text} annotations={annotations || []} />
    </div>
  );
}

// Custom Node Component
function AnalysisNode({ data }) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  const [showControls, setShowControls] = useState(false);
  const [showAISelector, setShowAISelector] = useState(false);
  const [showLensSelector, setShowLensSelector] = useState(false);
  const [pendingAI, setPendingAI] = useState(null);
  const [pendingLens, setPendingLens] = useState(null);
  const [branchMode, setBranchMode] = useState(null); // 'newAI' or 'newLens'

  const lensColor = LENS_COLORS[data.lens]?.color || '#FFFFFF';
  const lensName = LENS_COLORS[data.lens]?.name || '';

  const handleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (data.onExpand) {
      data.onExpand(data.id, newExpanded);
    }
  };

  const handleNewAIClick = () => {
    setBranchMode('newAI');
    setPendingAI(null);
    setPendingLens(null);
    setShowAISelector(true);
    setShowLensSelector(false);
  };

  const handleNewLensClick = () => {
    setBranchMode('newLens');
    setPendingAI(data.aiKey); // Keep current AI
    setPendingLens(null);
    setShowAISelector(false);
    setShowLensSelector(true);
  };

  const handleAISelected = (aiKey) => {
    setPendingAI(aiKey);
    setShowAISelector(false);
    // Now show lens selector
    setShowLensSelector(true);
  };

  const handleLensSelected = (lensKey) => {
    setPendingLens(lensKey);
    setShowLensSelector(false);

    // Now we have both AI and Lens, trigger generation
    const finalAI = branchMode === 'newAI' ? pendingAI : data.aiKey;
    const finalLens = lensKey;

    if (finalAI && finalLens) {
      if (data.onBranch) {
        data.onBranch(finalAI, finalLens);
      }
    }

    // Reset state
    setBranchMode(null);
    setPendingAI(null);
    setPendingLens(null);
  };

  return (
    <div
      className={`analysis-node ${isExpanded ? 'expanded' : ''} ${data.isDimmed ? 'dimmed' : ''} ${data.status === 'generating' ? 'generating' : ''} ${data.completionFlash ? 'completion-flash' : ''}`}
      style={{
        borderColor: lensColor,
        boxShadow: isExpanded ? `0 0 20px ${lensColor}40` : 'none',
        color: lensColor // For the completion flash animation
      }}
    >
      {/* Collapsed View */}
      <div
        className="node-header"
        onClick={handleExpand}
      >
        <div className="node-title">
          <span className="ai-name">{data.aiModel}</span>
          <span className="node-divider">•</span>
          <span className="lens-name" style={{ color: lensColor }}>
            {lensName.toUpperCase()}
          </span>
        </div>
        <div className="node-status">
          {data.status === 'generating' && (
            <div className="generating-indicator">
              <span className="shimmer-dot"></span>
              <span className="shimmer-dot"></span>
              <span className="shimmer-dot"></span>
            </div>
          )}
          {data.status === 'complete' && <span className="status-checkmark">✓</span>}
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="node-content">
          {data.status === 'generating' && !data.analysis && (
            <div className="loading-feedback">
              <p>Analyzing your benchmark results...</p>
              <p className="loading-subtext">Processing through the {lensName} lens<span className="loading-dots">...</span></p>
            </div>
          )}
          <div className="node-analysis">
            {data.analysis ? (
              <RenderedAnalysis
                text={data.analysis}
                lensColor={lensColor}
                isTyping={data.isTyping}
                annotations={data.annotations}
              />
            ) : (
              data.status === 'generating' ? '' : 'No analysis yet...'
            )}
          </div>

          {/* Branch buttons removed for discussion mode */}

          {/* AI Selector Strip */}
          {showAISelector && (
            <div className="selector-container" onClick={(e) => e.stopPropagation()}>
              <div className="selector-header">
                <span className="selector-title">
                  {branchMode === 'newAI' ? 'Step 1: Select AI Model' : 'Select AI Model'}
                </span>
                <button
                  className="selector-close"
                  onClick={() => {
                    setShowAISelector(false);
                    setBranchMode(null);
                    setPendingAI(null);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="selector-strip">
                {Object.entries(AI_MODELS)
                  .filter(([key]) => !data.usedAIs?.includes(key))
                  .map(([key, model]) => (
                    <button
                      key={key}
                      className="selector-chip"
                      onClick={() => handleAISelected(key)}
                    >
                      {model.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Lens Selector Strip */}
          {showLensSelector && (
            <div className="selector-container" onClick={(e) => e.stopPropagation()}>
              <div className="selector-header">
                <span className="selector-title">
                  {branchMode === 'newAI' ? 'Step 2: Select Lens' : 'Select Lens'}
                </span>
                <button
                  className="selector-close"
                  onClick={() => {
                    setShowLensSelector(false);
                    setBranchMode(null);
                    setPendingAI(null);
                    setPendingLens(null);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="selector-strip">
                {Object.entries(LENS_COLORS).map(([key, lens]) => (
                  <button
                    key={key}
                    className="selector-chip lens-chip"
                    style={{
                      background: lens.color,
                      border: data.lens === key ? '2px solid white' : 'none'
                    }}
                    onClick={() => handleLensSelected(key)}
                  >
                    {lens.name.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Canvas Component
function SkewedLensesCanvas({ benchmarkData, onClose }) {
  const nodeTypes = useMemo(() => ({
    analysisNode: AnalysisNode,
    startNode: StartNode
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [usedAIs, setUsedAIs] = useState([]);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const [selectedLensForNew, setSelectedLensForNew] = useState('clinical');
  const [selectedAIForNew, setSelectedAIForNew] = useState(null);
  const [showInitialStart, setShowInitialStart] = useState(true);

  // AI Discussion state
  const [discussionMode, setDiscussionMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [discussionActive, setDiscussionActive] = useState(false);
  const [discussionComplete, setDiscussionComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const TURN_ORDER = ['llama', 'openrouter', 'gemini'];

  // Initialize AI discussion on load
  React.useEffect(() => {
    if (nodes.length === 0 && !discussionMode) {
      startAIDiscussion();
    }
  }, []);

  // Start AI Discussion - Create 3 anchor nodes
  const startAIDiscussion = () => {
    setDiscussionMode(true);
    setStatusMessage('Three AI systems are now discussing your reading results...');

    // Create 3 AI anchor nodes vertically aligned on the left
    const anchorNodes = Object.entries(AI_MODELS).map(([key, config], index) => ({
      id: `anchor-${key}`,
      type: 'analysisNode',
      position: { x: 50, y: index * 250 + 100 },
      data: {
        aiModel: config.name,
        aiKey: key,
        lens: 'discussion',
        analysis: '',
        status: 'waiting',
        isTyping: false,
        isExpanded: true,
        isAnchor: true,
        color: key === 'llama' ? '#06D6A0' : key === 'openrouter' ? '#3A86FF' : '#C77DFF'
      },
      draggable: false
    }));

    setNodes(anchorNodes);

    // Start the conversation after a brief delay
    setTimeout(() => conductAITurn(0), 1500);
  };

  // Conduct a single AI turn
  const conductAITurn = async (turnNumber) => {
    if (turnNumber >= 9) {
      endAIDiscussion();
      return;
    }

    const modelKey = TURN_ORDER[turnNumber % 3];
    const config = AI_MODELS[modelKey];

    setCurrentSpeaker(modelKey);
    setStatusMessage(`Now speaking: ${config.name}`);

    // Update anchor node to show it's active
    setNodes(prevNodes =>
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: node.id === `anchor-${modelKey}` ? 'generating' : 'waiting'
        }
      }))
    );

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
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

      if (data.success && data.message) {
        const newMessage = {
          role: 'assistant',
          content: data.message,
          model: modelKey,
          turnNumber,
          messageId: `msg-${turnNumber}`
        };

        setConversationHistory(prev => [...prev, newMessage]);

        // Create message node
        const messageNode = {
          id: `msg-${turnNumber}`,
          type: 'analysisNode',
          position: {
            x: 350 + (Math.floor(turnNumber / 3) * 350),
            y: (turnNumber % 3) * 250 + 100
          },
          data: {
            aiModel: config.name,
            aiKey: modelKey,
            lens: 'discussion',
            analysis: data.message,
            status: 'complete',
            isTyping: false,
            isExpanded: true,
            turnNumber,
            color: modelKey === 'llama' ? '#06D6A0' : modelKey === 'openrouter' ? '#3A86FF' : '#C77DFF'
          },
          draggable: true
        };

        setNodes(prev => [...prev, messageNode]);

        // Smart reply detection - build conversation connectors
        const myColor = modelKey === 'llama' ? '#06D6A0' : modelKey === 'openrouter' ? '#3A86FF' : '#C77DFF';
        const conversationEdges = [];

        // 1. Anchor edge (always connect to AI avatar)
        conversationEdges.push({
          id: `anchor-${turnNumber}`,
          source: `anchor-${modelKey}`,
          target: `msg-${turnNumber}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: myColor, strokeWidth: 2, opacity: 0.3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: myColor }
        });

        // 2. Detect direct AI mentions (strongest connection)
        const references = detectAIReferences(data.message);
        const directReplies = new Set();

        references.forEach(refName => {
          const referencedAI =
            refName.toLowerCase().includes('llama') ? 'llama' :
            refName.toLowerCase().includes('gemini') ? 'gemini' :
            refName.toLowerCase().includes('openrouter') || refName.toLowerCase().includes('gpt') ? 'openrouter' : null;

          if (referencedAI && referencedAI !== modelKey) {
            // Find most recent message from that AI
            for (let i = turnNumber - 1; i >= 0; i--) {
              const prevAI = TURN_ORDER[i % 3];
              if (prevAI === referencedAI) {
                directReplies.add(`msg-${i}`);
                conversationEdges.push({
                  id: `direct-${turnNumber}-${i}`,
                  source: `msg-${i}`,
                  target: `msg-${turnNumber}`,
                  type: 'smoothstep',
                  animated: true,
                  style: {
                    stroke: myColor,
                    strokeWidth: 2.5,
                    strokeDasharray: '0', // Solid line for direct mention
                    opacity: 0.8
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: myColor,
                    width: 20,
                    height: 20
                  },
                  label: '💬',
                  labelBgStyle: { fill: 'transparent' }
                });
                break;
              }
            }
          }
        });

        // 3. Sequential reply (responding to immediate previous turn)
        if (turnNumber > 0) {
          const prevMessageId = `msg-${turnNumber - 1}`;
          if (!directReplies.has(prevMessageId)) {
            conversationEdges.push({
              id: `seq-${turnNumber}`,
              source: prevMessageId,
              target: `msg-${turnNumber}`,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: myColor,
                strokeWidth: 1.5,
                strokeDasharray: '5,5', // Dashed for sequential
                opacity: 0.5
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: myColor,
                width: 15,
                height: 15
              }
            });
          }
        }

        // 4. Contextual connections (aware of earlier messages, very subtle)
        if (turnNumber >= 3) {
          const earlyMessageId = `msg-${Math.max(0, turnNumber - 3)}`;
          if (!directReplies.has(earlyMessageId) && earlyMessageId !== `msg-${turnNumber - 1}`) {
            conversationEdges.push({
              id: `context-${turnNumber}`,
              source: earlyMessageId,
              target: `msg-${turnNumber}`,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: myColor,
                strokeWidth: 1,
                strokeDasharray: '2,8', // Dotted for context
                opacity: 0.2
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: myColor,
                width: 10,
                height: 10
              }
            });
          }
        }

        setEdges(prev => [...prev, ...conversationEdges]);

        // Get annotations from the other 2 AIs
        const otherAIs = TURN_ORDER.filter(ai => ai !== modelKey);
        const annotations = [];

        for (const reviewerAI of otherAIs) {
          try {
            const annotationRes = await fetch('/api/annotate-bias', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reviewerModel: reviewerAI,
                targetText: data.message
              })
            });

            const annotationData = await annotationRes.json();
            if (annotationData.success && annotationData.annotations) {
              // Add model info to each annotation
              annotationData.annotations.forEach(ann => {
                annotations.push({ ...ann, model: reviewerAI });
              });
            }
          } catch (err) {
            console.error(`Failed to get annotations from ${reviewerAI}:`, err);
          }
        }

        // Update the message node with annotations
        setNodes(prev =>
          prev.map(node =>
            node.id === `msg-${turnNumber}`
              ? { ...node, data: { ...node.data, annotations } }
              : node
          )
        );

        // Continue to next turn
        setTimeout(() => conductAITurn(turnNumber + 1), 2000);
      } else {
        console.error('Turn error:', data.error);
        setTimeout(() => conductAITurn(turnNumber + 1), 2000);
      }
    } catch (error) {
      console.error('Network error:', error);
      setTimeout(() => conductAITurn(turnNumber + 1), 2000);
    }
  };

  const endAIDiscussion = () => {
    setDiscussionActive(false);
    setDiscussionComplete(true);
    setCurrentSpeaker(null);
    setStatusMessage('Discussion complete. The AIs showed differing perspectives on your results.');

    // Update all anchor nodes to completed state
    setNodes(prevNodes =>
      prevNodes.map(node => {
        if (node.id.startsWith('anchor-')) {
          return {
            ...node,
            data: {
              ...node.data,
              status: 'complete'
            }
          };
        }
        return node;
      })
    );
  };

  const createFirstAnalysis = (aiKey, lensKey) => {
    setNodeIdCounter((prevCounter) => {
      const newNodeId = `node-${prevCounter}`;

      // Create new node - position horizontally beside Start card
      const newNode = {
        id: newNodeId,
        type: 'analysisNode',
        position: { x: 550, y: 50 },
        data: {
          aiModel: AI_MODELS[aiKey].name,
          aiKey: aiKey,
          lens: lensKey,
          analysis: '',
          status: 'generating',
          isTyping: true,
          isExpanded: true, // Auto-expand first node
          usedAIs: [aiKey],
          onBranch: (branchAI, branchLens) => {
            createBranchAnalysis(newNodeId, branchAI, branchLens);
          }
        },
      };

      // Create edge with smooth curve
      const newEdge = {
        id: `edge-start-${newNodeId}`,
        source: 'start',
        target: newNodeId,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: LENS_COLORS[lensKey].color,
          strokeWidth: 2.5
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: LENS_COLORS[lensKey].color,
        },
      };

      // Update nodes: add new node and keep start node visible
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
      setUsedAIs((prev) => [...prev, aiKey]);

      // Perform API call
      performAnalysis(newNodeId, aiKey, lensKey, null);

      return prevCounter + 1;
    });
  };

  const createBranchAnalysis = (sourceNodeId, aiKey, lensKey) => {
    setUsedAIs((prevUsedAIs) => {
      const updatedUsedAIs = [...prevUsedAIs, aiKey];

      setNodeIdCounter((prevCounter) => {
        const newNodeId = `node-${prevCounter}`;

        setNodes((prevNodes) => {
          // Get source node for recursive analysis
          const sourceNode = prevNodes.find(n => n.id === sourceNodeId);
          const previousAnalysis = sourceNode?.data.analysis;

          // Calculate position (below and offset)
          const sourcePosition = sourceNode?.position || { x: 550, y: 50 };
          const newPosition = {
            x: sourcePosition.x + (Math.random() * 200 - 100),
            y: sourcePosition.y + 200
          };

          // Create new node
          const newNode = {
            id: newNodeId,
            type: 'analysisNode',
            position: newPosition,
            data: {
              aiModel: AI_MODELS[aiKey].name,
              aiKey: aiKey,
              lens: lensKey,
              analysis: '',
              status: 'generating',
              isTyping: true,
              isExpanded: true,
              usedAIs: updatedUsedAIs,
              onBranch: (branchAI, branchLens) => {
                createBranchAnalysis(newNodeId, branchAI, branchLens);
              }
            },
          };

          // Create edge with smooth curve and lens color
          const newEdge = {
            id: `edge-${sourceNodeId}-${newNodeId}`,
            source: sourceNodeId,
            target: newNodeId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: LENS_COLORS[lensKey].color,
              strokeWidth: 2.5
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: LENS_COLORS[lensKey].color,
            },
          };

          // Add edge
          setEdges((prevEdges) => [...prevEdges, newEdge]);

          // Perform API call
          performAnalysis(newNodeId, aiKey, lensKey, previousAnalysis);

          // Return new nodes array with new node added
          return [...prevNodes, newNode];
        });

        return prevCounter + 1;
      });

      return updatedUsedAIs;
    });
  };

  const performAnalysis = async (nodeId, aiKey, lensKey, previousAnalysis) => {
    try {
      const response = await fetch('/api/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiModel: aiKey,
          lens: lensKey,
          benchmarkData,
          previousAnalysis: previousAnalysis,
          analyzeBoth: !!previousAnalysis
        })
      });

      const data = await response.json();

      if (data.success) {
        // Type out the analysis
        typeOutAnalysis(nodeId, data.analysis);
      } else {
        updateNodeAnalysis(nodeId, 'Error: Analysis failed', false);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      updateNodeAnalysis(nodeId, 'Error: Could not connect to AI', false);
    }
  };

  const typeOutAnalysis = (nodeId, fullText) => {
    let index = 0;
    const interval = setInterval(() => {
      index += 2; // Type 2 chars at a time

      const isComplete = index >= fullText.length;
      const displayText = isComplete ? fullText : fullText.substring(0, index);

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                analysis: displayText,
                isTyping: !isComplete,
                status: isComplete ? 'complete' : 'generating',
                completionFlash: isComplete
              }
            };
          }
          return node;
        })
      );

      if (isComplete) {
        clearInterval(interval);
        // Remove flash class after animation completes
        setTimeout(() => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    completionFlash: false
                  }
                };
              }
              return node;
            })
          );
        }, 600);
      }
    }, 15);
  };

  const updateNodeAnalysis = (nodeId, analysis, isTyping) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              analysis,
              isTyping: false,
              status: 'complete',
              completionFlash: false
            }
          };
        }
        return node;
      })
    );
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="skewed-canvas-container">
      {/* Top Bar - Back Button Only */}
      <div className="canvas-header">
        <button className="close-btn" onClick={onClose}>
          <span>←</span> Back
        </button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="react-flow-canvas"
      >
        <Background color="#FFFFFF" gap={40} size={1} style={{ opacity: 0.03 }} />
        <Controls />
      </ReactFlow>

      {/* Bottom Status Bar */}
      {statusMessage && (
        <div className="discussion-status-bar">
          <div className="status-content">{statusMessage}</div>
        </div>
      )}
    </div>
  );
}

export default SkewedLensesCanvas;
