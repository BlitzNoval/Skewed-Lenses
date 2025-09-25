import React, { useEffect, useRef } from "react";

export default function VantaTrunkBackground() {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    // Load p5.js and Vanta scripts dynamically
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
        // Load p5.js first
        if (!window.p5) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js');
        }

        // Load Vanta TRUNK
        if (!window.VANTA) {
          await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.trunk.min.js');
        }

        // Initialize Vanta effect with your custom settings (blue instead of red)
        if (vantaRef.current && window.VANTA && window.VANTA.TRUNK) {
          vantaEffect.current = window.VANTA.TRUNK({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            backgroundColor: 0xffffff, // White background
            color: 0x000000, // Black trunk lines
            spacing: 0,
            chaos: 1
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
        right: 0,
        width: "60%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none"
      }}
    />
  );
}