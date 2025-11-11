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
  clinical: { color: '#00BFA6', name: 'Clinical', icon: '🏥' },
  educational: { color: '#F4C542', name: 'Educational', icon: '📚' },
  empathetic: { color: '#FF8FA3', name: 'Empathetic', icon: '❤️' },
  technical: { color: '#9EA0A6', name: 'Technical', icon: '🔬' },
  cultural: { color: '#A78BFA', name: 'Cultural', icon: '🌍' },
};

// AI Models
const AI_MODELS = {
  llama: { name: 'Llama', description: 'Analytical, neutral' },
  openrouter: { name: 'OpenRouter GPT', description: 'Warm, interpretive' },
  gemini: { name: 'Gemini', description: 'Formal, academic' },
};

// Custom Node Component
function AnalysisNode({ data }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showAISelector, setShowAISelector] = useState(false);
  const [showLensSelector, setShowLensSelector] = useState(false);

  const lensColor = LENS_COLORS[data.lens]?.color || '#FFFFFF';
  const lensIcon = LENS_COLORS[data.lens]?.icon || '';
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
      className={`analysis-node ${isExpanded ? 'expanded' : ''} ${data.isDimmed ? 'dimmed' : ''}`}
      style={{
        borderColor: `rgba(${parseInt(lensColor.slice(1, 3), 16)}, ${parseInt(lensColor.slice(3, 5), 16)}, ${parseInt(lensColor.slice(5, 7), 16)}, 0.6)`,
        boxShadow: isExpanded ? `0 0 20px ${lensColor}40` : 'none'
      }}
    >
      {/* Collapsed View */}
      <div
        className="node-header"
        onClick={handleExpand}
      >
        <div className="node-title">
          <span className="ai-name">{data.aiModel}</span>
          <span className="lens-pill" style={{ background: lensColor }}>
            {lensIcon} {lensName}
          </span>
        </div>
        <div className="node-status">
          {data.status === 'generating' && <span className="status-icon">⏳</span>}
          {data.status === 'complete' && <span className="status-icon">✔️</span>}
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="node-content">
          <div className="node-analysis">
            {data.isTyping ? (
              <>
                {data.analysis}
                <span className="typing-cursor">▊</span>
              </>
            ) : (
              data.analysis || 'No analysis yet...'
            )}
          </div>

          {data.status === 'complete' && !data.isTyping && (
            <div className="node-actions">
              <button
                className="node-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowControls(!showControls);
                }}
              >
                + Branch Analysis
              </button>
            </div>
          )}

          {/* Inline Control Panel */}
          {showControls && (
            <div className="inline-controls" onClick={(e) => e.stopPropagation()}>
              <button
                className="control-option"
                onClick={() => {
                  setShowAISelector(!showAISelector);
                  setShowLensSelector(false);
                }}
              >
                + New AI
              </button>
              <button
                className="control-option"
                onClick={() => {
                  setShowLensSelector(!showLensSelector);
                  setShowAISelector(false);
                }}
              >
                + New Lens
              </button>
            </div>
          )}

          {/* AI Selector Strip */}
          {showAISelector && (
            <div className="selector-strip" onClick={(e) => e.stopPropagation()}>
              {Object.entries(AI_MODELS)
                .filter(([key]) => !data.usedAIs?.includes(key))
                .map(([key, model]) => (
                  <button
                    key={key}
                    className="selector-chip"
                    onClick={() => {
                      data.onSelectAI?.(key);
                      setShowAISelector(false);
                      setShowControls(false);
                    }}
                  >
                    {model.name}
                  </button>
                ))}
            </div>
          )}

          {/* Lens Selector Strip */}
          {showLensSelector && (
            <div className="selector-strip" onClick={(e) => e.stopPropagation()}>
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
                    setShowControls(false);
                  }}
                >
                  {lens.icon} {lens.name}
                </button>
              ))}
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

    // Create new node
    const newNode = {
      id: newNodeId,
      type: 'analysisNode',
      position: { x: 250, y: 250 },
      data: {
        aiModel: AI_MODELS[aiKey].name,
        aiKey: aiKey,
        lens: lensKey,
        analysis: '',
        status: 'generating',
        isTyping: true,
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
              return {
                ...node,
                data: {
                  ...node.data,
                  analysis: fullText.substring(0, index),
                  isTyping: index < fullText.length,
                  status: index < fullText.length ? 'generating' : 'complete'
                }
              };
            }
            return node;
          })
        );
        index += 2; // Type 2 chars at a time
      } else {
        clearInterval(interval);
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
