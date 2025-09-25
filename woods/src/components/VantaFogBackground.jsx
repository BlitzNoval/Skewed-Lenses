import React, { useEffect, useRef } from "react";

export default function VantaFogBackground() {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    // Load Three.js and Vanta scripts dynamically
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initVanta = async () => {
      try {
        // Load Three.js first
        if (!window.THREE) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        }

        // Load Vanta FOG
        if (!window.VANTA) {
          await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');
        }

        // Initialize Vanta effect with your custom settings
        if (vantaRef.current && window.VANTA && window.VANTA.FOG) {
          vantaEffect.current = window.VANTA.FOG({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0xffc300,
            midtoneColor: 0xff1f00,
            lowlightColor: 0x2d00ff,
            baseColor: 0xffebeb,
            blurFactor: 0.6,
            zoom: 1,
            speed: 1
          });
        }
      } catch (error) {
        console.error('Error loading Vanta:', error);
      }
    };

    initVanta();

    // Cleanup
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none"
      }}
    />
  );
}