import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Center } from '@react-three/drei'
import * as THREE from 'three'

function InteractiveTextSpace({ size = 1, spacing = 1.5, depth = 0, distortion = 0 }) {
  const textGroupRef = useRef()

  const sampleText = "Skewed Lenses helps you see text differently"
  const words = sampleText.split(' ')

  useFrame((state) => {
    if (textGroupRef.current) {
      // Gentle floating animation
      textGroupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={textGroupRef}>
      {words.map((word, wordIndex) => (
        <group key={wordIndex} position={[(wordIndex - words.length/2) * spacing, 0, depth * wordIndex * 0.1]}>
          {word.split('').map((letter, letterIndex) => {
            // Calculate distortion for dyslexic simulation
            const distortionX = distortion * (Math.random() - 0.5) * 0.3
            const distortionY = distortion * (Math.random() - 0.5) * 0.2
            const distortionZ = distortion * (Math.random() - 0.5) * 0.4
            const rotation = distortion * (Math.random() - 0.5) * Math.PI * 0.1

            return (
              <Text
                key={letterIndex}
                fontSize={size * 0.3}
                position={[
                  letterIndex * 0.25 * size + distortionX,
                  distortionY,
                  distortionZ
                ]}
                rotation={[rotation * 0.5, rotation, rotation * 0.3]}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {letter}
              </Text>
            )
          })}
        </group>
      ))}
    </group>
  )
}

function ControlButton({ position, text, outlineColor, onClick }) {
  const buttonRef = useRef()

  const createFlatButton = useMemo(() => {
    const group = new THREE.Group()

    // Main button body - premium square with subtle rounding
    const buttonGeometry = new THREE.BoxGeometry(2.2, 0.4, 1.8, 8, 4, 8)
    const buttonMaterial = new THREE.MeshStandardMaterial({
      color: outlineColor,
      roughness: 0.1,
      metalness: 0.4
    })
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial)
    buttonMesh.castShadow = true
    buttonMesh.receiveShadow = true
    buttonMesh.userData = { clickable: true, action: text }

    // Top surface - slightly smaller
    const topGeometry = new THREE.BoxGeometry(2.0, 0.1, 1.6, 8, 4, 8)
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.2
    })
    const topMesh = new THREE.Mesh(topGeometry, topMaterial)
    topMesh.position.y = 0.25
    topMesh.castShadow = true
    topMesh.receiveShadow = true

    group.add(buttonMesh)
    group.add(topMesh)
    return group
  }, [outlineColor, text])

  return (
    <primitive
      ref={buttonRef}
      object={createFlatButton}
      position={position}
      onClick={onClick}
    />
  )
}

function Scene3D() {
  const [textControls, setTextControls] = React.useState({
    size: 1,
    spacing: 1.5,
    depth: 0,
    distortion: 0
  })

  const handleButtonClick = (action) => {
    setTextControls(prev => {
      switch(action) {
        case 'SIZE':
          return { ...prev, size: prev.size < 2 ? prev.size + 0.2 : 0.6 }
        case 'SPACING':
          return { ...prev, spacing: prev.spacing < 3 ? prev.spacing + 0.3 : 1.0 }
        case 'DEPTH':
          return { ...prev, depth: prev.depth < 2 ? prev.depth + 0.4 : 0 }
        case 'DISTORT':
          return { ...prev, distortion: prev.distortion < 1 ? prev.distortion + 0.2 : 0 }
        default:
          return prev
      }
    })
  }

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Interactive text space */}
      <InteractiveTextSpace {...textControls} />

      {/* Control Buttons */}
      <ControlButton
        position={[-3, -2, 0]}
        text="SIZE"
        outlineColor={0xff9966}
        onClick={() => handleButtonClick('SIZE')}
      />
      <ControlButton
        position={[-1, -2, 0]}
        text="SPACING"
        outlineColor={0xffcc33}
        onClick={() => handleButtonClick('SPACING')}
      />
      <ControlButton
        position={[1, -2, 0]}
        text="DEPTH"
        outlineColor={0xff6699}
        onClick={() => handleButtonClick('DEPTH')}
      />
      <ControlButton
        position={[3, -2, 0]}
        text="DISTORT"
        outlineColor={0xcc66ff}
        onClick={() => handleButtonClick('DISTORT')}
      />
    </group>
  )
}

function GridBackground({ children }) {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        orthographic
        camera={{
          position: [-20, 15, 20],
          zoom: 40,
          up: [0, 1, 0]
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0)
        }}
        shadows
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#000000'
        }}
      >
        <Scene3D />
      </Canvas>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        {children}
      </div>
    </div>
  )
}

export default GridBackground