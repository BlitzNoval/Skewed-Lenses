// src/components/ShiftBackground.jsx
import React, { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

/**
 * Exact Codrops "Shift" effect adapted for React.
 * - Uses Float32Array for performance (x,y,vx,vy,life,ttl,radius,hue)
 * - Two canvas layers: buffer (draw circles) and onscreen (blur + composite)
 * - devicePixelRatio scaling for crispness
 * - Proper cleanup for Strict Mode
 */
export default function ShiftBackground() {
  const bufferRef = useRef(null); // canvas where circles are drawn
  const screenRef = useRef(null); // canvas where blur/composite are drawn
  const rafRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double-init if mount/unmount happens quickly in dev StrictMode:
    if (initializedRef.current) return;
    initializedRef.current = true;

    const buffer = bufferRef.current;
    const screen = screenRef.current;
    if (!buffer || !screen) return;

    const ctxBuf = buffer.getContext("2d");
    const ctxScr = screen.getContext("2d");

    const TAU = Math.PI * 2;

    // Config tuned to the original Codrops Shift demo
    const CIRCLE_COUNT = 150;
    const PROPS_PER = 8; // x, y, vx, vy, life, ttl, radius, hue
    const PROPS_LEN = CIRCLE_COUNT * PROPS_PER;

    const BASE_SPEED = 0.1;
    const RANGE_SPEED = 1;
    const BASE_TTL = 150;
    const RANGE_TTL = 200;
    const BASE_RADIUS = 100;
    const RANGE_RADIUS = 200;
    const RANGE_HUE = 120; // Wider range for more color variety

    // noise offsets (control spatial and temporal scale)
    const X_OFF = 0.0015;
    const Y_OFF = 0.0015;
    const Z_OFF = 0.0015;

    const BG_COLOR = "hsla(0,0%,0%,1)"; // background

    // storage
    let propsArray = null; // Float32Array
    let noise3D = createNoise3D();
    let baseHue = 220; // Start in blue range

    // keep track of sizes and DPR to set canvas pixel sizes
    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    // helpers
    const rand = (n) => Math.random() * n;

    // init canvas pixel sizes (call at start and on resize)
    function setCanvasSize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.max(1, window.devicePixelRatio || 1);

      // physical pixel sizes
      buffer.width = Math.round(width * dpr);
      buffer.height = Math.round(height * dpr);
      buffer.style.width = width + "px";
      buffer.style.height = height + "px";

      screen.width = Math.round(width * dpr);
      screen.height = Math.round(height * dpr);
      screen.style.width = width + "px";
      screen.style.height = height + "px";

      // scale contexts so drawing coordinates are in CSS pixels
      ctxBuf.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxScr.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // initialize circle properties array
    function initCircles() {
      propsArray = new Float32Array(PROPS_LEN);
      noise3D = createNoise3D();

      for (let i = 0; i < PROPS_LEN; i += PROPS_PER) {
        initCircle(i);
      }
    }

    // set one circle's initial properties
    function initCircle(i) {
      const i2 = i + 1, i3 = i + 2, i4 = i + 3, i5 = i + 4, i6 = i + 5, i7 = i + 6, i8 = i + 7;

      const x = rand(width);
      const y = rand(height);

      // sample noise for hue variation
      const n = noise3D(x * X_OFF, y * Y_OFF, baseHue * Z_OFF);
      const theta = rand(TAU);
      const speed = BASE_SPEED + rand(RANGE_SPEED);
      const vx = speed * Math.cos(theta);
      const vy = speed * Math.sin(theta);

      const life = 0;
      const ttl = BASE_TTL + rand(RANGE_TTL);
      const radius = BASE_RADIUS + rand(RANGE_RADIUS);
      // Constrain hue to cool colors: blue(240) -> green(120) -> purple(280) -> pink(320)
      let hue = baseHue + n * RANGE_HUE;
      // Wrap to stay in cool color range: 120-340 (green->blue->purple->pink)
      hue = ((hue - 120) % 220) + 120;

      propsArray[i] = x;
      propsArray[i2] = y;
      propsArray[i3] = vx;
      propsArray[i4] = vy;
      propsArray[i5] = life;
      propsArray[i6] = ttl;
      propsArray[i7] = radius;
      propsArray[i8] = hue;
    }

    // fade in/out helper
    function fadeInOut(life, ttl) {
      const half = ttl * 0.5;
      if (life <= half) return life / half;
      return (ttl - life) / half;
    }

    // boundary check (if circle fully out of screen)
    function outOfBounds(x, y, r) {
      return x < -r || x > width + r || y < -r || y > height + r;
    }

    // per-circle update + draw
    function updateCircle(i) {
      const i2 = i + 1, i3 = i + 2, i4 = i + 3, i5 = i + 4, i6 = i + 5, i7 = i + 6, i8 = i + 7;

      let x = propsArray[i];
      let y = propsArray[i2];
      let vx = propsArray[i3];
      let vy = propsArray[i4];
      let life = propsArray[i5];
      let ttl = propsArray[i6];
      const radius = propsArray[i7];
      const hue = propsArray[i8];

      // draw circle to buffer
      const alpha = fadeInOut(life, ttl);
      ctxBuf.save();
      ctxBuf.fillStyle = `hsla(${hue}, 60%, 30%, ${alpha})`;
      ctxBuf.beginPath();
      ctxBuf.arc(x, y, radius, 0, TAU);
      ctxBuf.fill();
      ctxBuf.closePath();
      ctxBuf.restore();

      // increment life and move
      life++;
      x += vx;
      y += vy;

      propsArray[i] = x;
      propsArray[i2] = y;
      propsArray[i5] = life;

      // reset if out of bounds or finished
      if (outOfBounds(x, y, radius) || life > ttl) {
        initCircle(i);
      }
    }

    // all circles update
    function updateCircles() {
      // slowly shift base hue to keep colors moving over time
      baseHue += 0.05;

      for (let i = 0; i < PROPS_LEN; i += PROPS_PER) {
        updateCircle(i);
      }
    }

    // render: blur the buffer onto the screen canvas and composite once more for contrast
    function render() {
      // draw background first (fill the screen canvas)
      ctxScr.save();
      ctxScr.fillStyle = BG_COLOR;
      ctxScr.fillRect(0, 0, width, height);
      ctxScr.restore();

      // blur pass
      ctxScr.save();
      // the Codrops example used strong blur: ~50px in CSS space
      ctxScr.filter = "blur(40px)";
      ctxScr.drawImage(buffer, 0, 0, width, height);
      ctxScr.restore();

      // draw buffer again unblurred on top at low alpha to add definition (Codrops approach)
      ctxScr.save();
      ctxScr.globalCompositeOperation = "lighter";
      ctxScr.globalAlpha = 0.9;
      ctxScr.drawImage(buffer, 0, 0, width, height);
      ctxScr.globalAlpha = 1;
      ctxScr.globalCompositeOperation = "source-over";
      ctxScr.restore();
    }

    // main loop
    function loop() {
      // clear buffer - we draw fresh circles each frame
      ctxBuf.clearRect(0, 0, width, height);

      // update positions + draw to buffer
      updateCircles();

      // composite and blur to screen canvas
      render();

      rafRef.current = requestAnimationFrame(loop);
    }

    // start/resizing
    function start() {
      setCanvasSize();
      initCircles();
      // start loop once — if StrictMode unmounts it will be cleaned up below
      rafRef.current = requestAnimationFrame(loop);
    }

    // handle window resize
    function onResize() {
      // stop animation while resizing to avoid weird artifacts
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setCanvasSize();
      // reinitialize buffers so circles are still in bounds (optional: keep existing props)
      // keep props as-is (they'll be re-positioned naturally); we don't re-init circles
      rafRef.current = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", onResize);

    // start everything
    start();

    // CLEANUP (very important)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      initializedRef.current = false;
    };
  }, []);

  // canvas styles:
  // - position fixed to fill screen
  // - zIndex: -1 ensures other UI sits above it
  // - pointerEvents none so clicks go through to your app
  const canvasStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    pointerEvents: "none",
    filter: "blur(10px)",
  };

  return (
    <>
      {/* buffer draws circles, not visible to user directly */}
      <canvas ref={bufferRef} style={{ ...canvasStyle, zIndex: -2 }} />
      {/* screen shows blurred composite */}
      <canvas ref={screenRef} style={{ ...canvasStyle }} />
    </>
  );
}