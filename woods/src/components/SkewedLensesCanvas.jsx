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
function RenderedAnalysis({ text, lensColor, isTyping }) {
  const sections = parseAnalysisText(text);

  if (isTyping) {
    return (
      <div className="analysis-raw">
        {text}
        <span className="typing-cursor">▊</span>
      </div>
    );
  }

  return (
    <div className="analysis-rendered">
      {sections.map((section, idx) => (
        <div key={idx} className="analysis-section" style={{ animationDelay: `${idx * 0.1}s` }}>
          {section.title && (
            <h4 className="section-title" style={{ color: lensColor }}>
              {section.title.toUpperCase()}
            </h4>
          )}
          {section.paragraphs.map((para, pIdx) => {
            // Check if paragraph is a list item
            if (para.match(/^[\-\•\*]\s/)) {
              return (
                <div key={pIdx} className="section-list-item">
                  <span className="list-bullet" style={{ color: lensColor }}>•</span>
                  <span>{para.replace(/^[\-\•\*]\s/, '')}</span>
                </div>
              );
            }
            return <p key={pIdx} className="section-paragraph">{para}</p>;
          })}
          {idx < sections.length - 1 && (
            <div className="section-divider" style={{ background: lensColor, opacity: 0.2 }} />
          )}
        </div>
      ))}
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
              <p>Generating analysis...</p>
              <p className="loading-subtext">Analyzing through the {lensName.toUpperCase()} lens<span className="loading-dots">...</span></p>
            </div>
          )}
          <div className="node-analysis">
            {data.status === 'error' ? (
              <div className="error-state">
                <p className="error-message">Error: {data.error}</p>
                <button
                  className="retry-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onRetry?.();
                  }}
                >
                  Retry Analysis
                </button>
              </div>
            ) : data.analysis ? (
              <RenderedAnalysis
                text={data.analysis}
                lensColor={lensColor}
                isTyping={data.isTyping}
              />
            ) : (
              data.status === 'generating' ? '' : 'No analysis yet...'
            )}
          </div>

          {data.status === 'complete' && !data.isTyping && !showAISelector && !showLensSelector && (
            <div className="branch-buttons-container">
              <button
                className="branch-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewAIClick();
                }}
                title="Add New AI"
              >
                <span className="branch-icon">+</span> New AI
              </button>
              <button
                className="branch-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewLensClick();
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

// Grid Layout Constants
const COLUMN_WIDTH = 500; // Horizontal spacing between columns
const ROW_HEIGHT = 280;   // Vertical spacing between nodes
const START_X = 250;      // Starting X position
const START_Y = 50;       // Starting Y position

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
  const [columnCounts, setColumnCounts] = useState({}); // Track nodes per column
  const reactFlowInstance = React.useRef(null);

  // Calculate grid position for a new node
  const calculateGridPosition = (column) => {
    const rowIndex = columnCounts[column] || 0;
    return {
      x: START_X + (column * COLUMN_WIDTH),
      y: START_Y + (rowIndex * ROW_HEIGHT)
    };
  };

  // Auto-pan to a newly created node
  const panToNode = (nodeId) => {
    setTimeout(() => {
      if (reactFlowInstance.current) {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          reactFlowInstance.current.setCenter(
            node.position.x + 200,
            node.position.y + 100,
            { duration: 800, zoom: 1 }
          );
        }
      }
    }, 100);
  };

  // Initialize with start node
  React.useEffect(() => {
    if (nodes.length === 0) {
      const startNode = {
        id: 'start',
        type: 'startNode',
        position: { x: START_X, y: START_Y },
        data: {
          onConfirm: (aiKey, lensKey) => {
            createFirstAnalysis(aiKey, lensKey);
          }
        },
      };
      setNodes([startNode]);
      setColumnCounts({ 0: 1 }); // Start node is in column 0
    }
  }, []);

  const createFirstAnalysis = (aiKey, lensKey) => {
    setNodeIdCounter((prevCounter) => {
      const newNodeId = `node-${prevCounter}`;
      const column = 1; // First generation is column 1

      // Calculate grid position
      setColumnCounts((prevCounts) => {
        const position = calculateGridPosition(column);
        const updatedCounts = { ...prevCounts, [column]: (prevCounts[column] || 0) + 1 };

        // Create new node at grid position
        const newNode = {
          id: newNodeId,
          type: 'analysisNode',
          position: position,
          data: {
            aiModel: AI_MODELS[aiKey].name,
            aiKey: aiKey,
            lens: lensKey,
            analysis: '',
            status: 'generating',
            isTyping: true,
            isExpanded: true,
            usedAIs: [aiKey],
            column: column, // Store column for children
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

        // Auto-pan to the new node
        panToNode(newNodeId);

        return updatedCounts;
      });

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
          const parentColumn = sourceNode?.data.column || 1;
          const childColumn = parentColumn + 1; // Move one column to the right

          // Calculate grid position based on column
          setColumnCounts((prevCounts) => {
            const newPosition = calculateGridPosition(childColumn);
            const updatedCounts = { ...prevCounts, [childColumn]: (prevCounts[childColumn] || 0) + 1 };

            // Create new node at grid position
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
                column: childColumn, // Store column for future children
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

            // Auto-pan to the new node
            panToNode(newNodeId);

            // Return new nodes array with new node added
            return [...prevNodes, newNode];
          });

          return updatedCounts;
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
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: 'Analysis failed',
                  onRetry: () => performAnalysis(nodeId, aiKey, lensKey, previousAnalysis)
                }
              };
            }
            return node;
          })
        );
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'error',
                error: 'Could not connect to AI',
                onRetry: () => performAnalysis(nodeId, aiKey, lensKey, previousAnalysis)
              }
            };
          }
          return node;
        })
      );
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
        onInit={(instance) => { reactFlowInstance.current = instance; }}
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
