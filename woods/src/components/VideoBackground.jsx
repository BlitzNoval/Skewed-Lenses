import React from 'react'
import './VideoBackground.css'

function VideoBackground({ videoSrc, children }) {
  return (
    <div className="video-background-container">
      <video
        className="video-background"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="video-overlay">
        {children}
      </div>
    </div>
  )
}

export default VideoBackground