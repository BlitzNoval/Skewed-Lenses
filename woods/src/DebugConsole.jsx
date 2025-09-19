import { useState, useEffect } from 'react'
import './DebugConsole.css'

const DebugConsole = () => {
  const [logs, setLogs] = useState([])
  const [backendStatus, setBackendStatus] = useState('checking...')
  const [collapsed, setCollapsed] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }].slice(-50)) // Keep last 50 logs
  }

  const checkBackendHealth = async () => {
    try {
      addLog('checking backend health...', 'info')
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'
      const response = await fetch(`${API_URL}/health`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBackendStatus('online')
        addLog(`backend online: ${data.model}`, 'success')
      } else {
        setBackendStatus('error')
        addLog(`backend error: ${response.status}`, 'error')
      }
    } catch (error) {
      setBackendStatus('offline')
      addLog(`backend offline: ${error.message}`, 'error')
    }
  }

  useEffect(() => {
    checkBackendHealth()
    const interval = setInterval(checkBackendHealth, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Expose addLog to window for global access
  useEffect(() => {
    window.debugLog = addLog
  }, [])

  const clearLogs = () => {
    setLogs([])
    addLog('console cleared', 'info')
  }

  return (
    <div className={`debug-console ${collapsed ? 'collapsed' : ''}`}>
      <div className="debug-header" onClick={() => setCollapsed(!collapsed)}>
        <span>debug console</span>
        <span className={`status ${backendStatus}`}>
          backend: {backendStatus}
        </span>
        <span className="toggle">{collapsed ? '+' : '-'}</span>
      </div>
      
      {!collapsed && (
        <>
          <div className="debug-controls">
            <button onClick={checkBackendHealth}>ping backend</button>
            <button onClick={clearLogs}>clear</button>
          </div>
          
          <div className="debug-logs">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="timestamp">{log.timestamp}</span>
                <span className="message">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="log-entry info">
                <span className="message">console ready</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DebugConsole