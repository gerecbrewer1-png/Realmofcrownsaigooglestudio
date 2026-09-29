/**
 * REALM OF CROWNS — PlayCanvas Tactical Battle Canvas Component
 * Encapsulates the WebGL2/WebGPU canvas, lifecycle, and resize management.
 */

import React, { useEffect, useRef } from 'react';
import { PlayCanvasApp } from './PlayCanvasApp';

interface PlayCanvasBattleCanvasProps {
  onAppReady?: (app: PlayCanvasApp) => void;
  className?: string;
}

export const PlayCanvasBattleCanvas: React.FC<PlayCanvasBattleCanvasProps> = ({
  onAppReady,
  className = 'w-full h-full'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PlayCanvasApp | null>(null);
  const onAppReadyRef = useRef(onAppReady);
  onAppReadyRef.current = onAppReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent default context menu and touch gesture zooms
    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    // Initialize PlayCanvas Tactical Engine
    const app = new PlayCanvasApp(canvas);
    appRef.current = app;
    (window as any).__PLAYCANVAS_APP__ = app;

    if (onAppReadyRef.current) {
      onAppReadyRef.current(app);
    }

    // Window resize observer
    const handleResize = () => {
      app.handleResize();
    };
    window.addEventListener('resize', handleResize);

    // Immediate resize reflow
    const timer = setTimeout(() => {
      app.handleResize();
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('touchmove', preventDefaultTouch);
      app.destroy();
      appRef.current = null;
    };
  }, []); // Run ONCE on mount

  return (
    <div className={`relative w-full h-full overflow-hidden select-none touch-none ${className}`}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        autoFocus
        onClick={(e) => e.currentTarget.focus()}
        className="w-full h-full absolute inset-0 block outline-none cursor-pointer"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
