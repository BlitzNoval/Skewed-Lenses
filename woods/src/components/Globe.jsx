import React, { useRef, useEffect } from 'react'

const OneInTen = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // Configuration for 10 dots in a horizontal line
    const dotCount = 10
    const dotSize = 25
    const spacing = 60

    // Center the line of dots
    const totalWidth = (dotCount - 1) * spacing
    const startX = (canvas.width - totalWidth) / 2
    const centerY = canvas.height / 2

    // Create dots - exactly 10 dots
    const dots = []
    for (let i = 0; i < dotCount; i++) {
      dots.push({
        x: startX + i * spacing,
        y: centerY,
        index: i,
        isHighlighted: false,
        opacity: 0.4,
        targetOpacity: 0.4,
        pulsePhase: 0
      })
    }

    // Premium animation variables
    let animationStartTime = Date.now()
    const cycleDuration = 6000 // Slower, more premium timing
    const pauseBetweenDots = 500 // Pause on each dot

    const animate = () => {
      const currentTime = Date.now()
      const elapsed = currentTime - animationStartTime

      // Clear canvas completely
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Premium wave animation - seamless loop
      const totalDuration = dotCount * pauseBetweenDots // No pause at end
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration
      const animationProgress = cycleProgress * totalDuration

      let activeIndex = -1
      let dotIntensity = 0

      // Calculate which dot should be active
      for (let i = 0; i < dotCount; i++) {
        const dotStartTime = i * pauseBetweenDots
        const dotEndTime = dotStartTime + pauseBetweenDots

        if (animationProgress >= dotStartTime && animationProgress < dotEndTime) {
          activeIndex = i
          // Smooth fade in and out within the dot's time
          const dotProgress = (animationProgress - dotStartTime) / pauseBetweenDots
          dotIntensity = Math.sin(dotProgress * Math.PI) // Smooth bell curve
          break
        }
      }

      // Update and render dots
      dots.forEach((dot, i) => {
        // Determine if this dot should be highlighted
        const isActive = i === activeIndex

        if (isActive) {
          dot.targetOpacity = dotIntensity
          dot.isHighlighted = true
        } else {
          dot.targetOpacity = 0.25
          dot.isHighlighted = false
        }

        // Ultra smooth transitions
        dot.opacity += (dot.targetOpacity - dot.opacity) * 0.12

        // Premium rendering with subtle gradients
        ctx.save()

        if (dot.isHighlighted && dot.opacity > 0.3) {
          // Premium glow effect
          const glowRadius = dotSize + 15
          const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, glowRadius)
          gradient.addColorStop(0, `rgba(33, 150, 243, ${dot.opacity * 0.4})`)
          gradient.addColorStop(0.7, `rgba(33, 150, 243, ${dot.opacity * 0.1})`)
          gradient.addColorStop(1, 'rgba(33, 150, 243, 0)')

          ctx.beginPath()
          ctx.arc(dot.x, dot.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        if (dot.isHighlighted) {
          // Clean solid blue for active dot
          ctx.fillStyle = `rgba(33, 150, 243, ${dot.opacity})`
        } else {
          // Clean solid white for inactive dots
          ctx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`
        }

        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2)
        ctx.fill()

        // Subtle border for definition
        if (dot.opacity > 0.1) {
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2)
          ctx.strokeStyle = dot.isHighlighted
            ? `rgba(25, 118, 210, ${dot.opacity * 0.8})`
            : `rgba(255, 255, 255, ${dot.opacity * 0.3})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={700}
      className="one-in-ten-canvas"
      style={{ background: 'transparent' }}
    />
  )
}

export default OneInTen