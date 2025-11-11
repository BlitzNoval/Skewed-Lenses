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

// Custom Node Component
function AnalysisNode({ data }) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  const [showControls, setShowControls] = useState(false);
  const [showAISelector, setShowAISelector] = useState(false);
  const [showLensSelector, setShowLensSelector] = useState(false);

  const lensColor = LENS_COLORS[data.lens]?.color || '#FFFFFF';
  const lensName = LENS_COLORS[data.lens]?.name || '';

  const handleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (data.onExpand) {
      data.onExpand(data.id, newExpanded);
    }
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
            {data.isTyping ? (
              <>
                {data.analysis}
                <span className="typing-cursor">▊</span>
              </>
            ) : (
              data.analysis || (data.status === 'generating' ? '' : 'No analysis yet...')
            )}
          </div>

          {data.status === 'complete' && !data.isTyping && !showControls && !showAISelector && !showLensSelector && (
            <div className="branch-buttons-container">
              <button
                className="branch-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAISelector(true);
                }}
                title="Add New AI"
              >
                <span className="branch-icon">+</span> New AI
              </button>
              <button
                className="branch-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLensSelector(true);
                }}
                title="Change Lens"
              >
                <span className="branch-icon">+</span> New Lens
              </button>
            </div>
          )}

          {/* AI Selector Strip */}
          {showAISelector && (
            <div className="selector-container" onClick={(e) => e.stopPropagation()}>
              <div className="selector-header">
                <span className="selector-title">Select AI Model</span>
                <button
                  className="selector-close"
                  onClick={() => setShowAISelector(false)}
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
                      onClick={() => {
                        data.onSelectAI?.(key);
                        setShowAISelector(false);
                      }}
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
                <span className="selector-title">Select Lens</span>
                <button
                  className="selector-close"
                  onClick={() => setShowLensSelector(false)}
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
                    onClick={() => {
                      data.onSelectLens?.(key);
                      setShowLensSelector(false);
                    }}
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

  // Initialize with start node
  React.useEffect(() => {
    if (nodes.length === 0) {
      const startNode = {
        id: 'start',
        type: 'startNode',
        position: { x: 250, y: 50 },
        data: {
          onConfirm: (aiKey, lensKey) => {
            createFirstAnalysis(aiKey, lensKey);
          }
        },
      };
      setNodes([startNode]);
    }
  }, []);

  const createFirstAnalysis = async (aiKey, lensKey) => {
    const newNodeId = `node-${nodeIdCounter}`;
    setNodeIdCounter(nodeIdCounter + 1);
    setUsedAIs([...usedAIs, aiKey]);

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
        onSelectAI: (newAI) => createBranchAnalysis(newNodeId, newAI, lensKey, false),
        onSelectLens: (newLens) => createBranchAnalysis(newNodeId, aiKey, newLens, true)
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

    // Perform API call
    performAnalysis(newNodeId, aiKey, lensKey, null);
  };

  const createBranchAnalysis = async (sourceNodeId, aiKey, lensKey, isSameLens) => {
    const newNodeId = `node-${nodeIdCounter}`;
    setNodeIdCounter(nodeIdCounter + 1);

    // Get source node for recursive analysis
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const previousAnalysis = sourceNode?.data.analysis;

    // Calculate position (below and offset)
    const sourcePosition = sourceNode?.position || { x: 250, y: 250 };
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
        usedAIs: [...usedAIs, aiKey],
        onSelectAI: (newAI) => createBranchAnalysis(newNodeId, newAI, lensKey, false),
        onSelectLens: (newLens) => createBranchAnalysis(newNodeId, aiKey, newLens, true)
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

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setUsedAIs([...usedAIs, aiKey]);

    // Perform API call
    performAnalysis(newNodeId, aiKey, lensKey, previousAnalysis);
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
      if (index <= fullText.length) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              const isComplete = index >= fullText.length;
              return {
                ...node,
                data: {
                  ...node.data,
                  analysis: fullText.substring(0, index),
                  isTyping: !isComplete,
                  status: isComplete ? 'complete' : 'generating',
                  completionFlash: isComplete // Trigger flash on completion
                }
              };
            }
            return node;
          })
        );
        index += 2; // Type 2 chars at a time
      } else {
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
              isTyping,
              status: 'complete'
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
    </div>
  );
}

export default SkewedLensesCanvas;
