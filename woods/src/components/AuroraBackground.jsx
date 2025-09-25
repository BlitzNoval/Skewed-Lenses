import React, { useEffect, useRef } from "react";
import { createNoise2D } from "simplex-noise";

const AuroraBackground = () => {
  const canvasRef = useRef(null);
  const simplex = createNoise2D();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const layers = [
      { amplitude: 50, speed: 0.0015, color: "rgba(100, 200, 255, 0.4)" },
      { amplitude: 60, speed: 0.001, color: "rgba(200, 100, 255, 0.3)" },
      { amplitude: 80, speed: 0.0007, color: "rgba(50, 255, 200, 0.2)" },
    ];

    let t = 0;

    const drawLayer = (layer) => {
      const { amplitude, speed, color } = layer;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < width; x += 2) {
        const y =
          height / 2 +
          simplex(x * 0.005, t * speed) * amplitude +
          simplex(x * 0.01, t * speed) * amplitude * 0.5;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      layers.forEach((layer) => drawLayer(layer));

      t++;
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [simplex]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    />
  );
};

export default AuroraBackground;