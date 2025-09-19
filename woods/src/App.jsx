import React from 'react'
import VideoBackground from './components/VideoBackground'
import './App.css'

function App() {
  return (
    <VideoBackground videoSrc="/videos/video1.mp4">
      <div className="App">
        <h1>Fresh Start</h1>
        <p>Your content goes here</p>
      </div>
    </VideoBackground>
  )
}

export default App