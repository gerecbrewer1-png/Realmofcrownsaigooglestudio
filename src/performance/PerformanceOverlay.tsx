import React, { useEffect, useState } from 'react';
import { PerformanceMonitor } from './PerformanceMonitor';

export function PerformanceOverlay() {
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      PerformanceMonitor.update();
      if (PerformanceMonitor.frameCount % 30 === 0) {
        setStats({ ...(window as any).perfStats });
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  if (!window.location.search.includes('perf=1')) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: '10px', zIndex: 9999, fontFamily: 'monospace', fontSize: '12px' }}>
      <div>FPS: {stats.fps?.toFixed(1) || 0}</div>
      <div>Worst Frame: {stats.worst?.toFixed(1) || 0} ms</div>
      <div>Entities: {stats.entities}</div>
      <div>Draw Calls: {stats.drawCalls}</div>
      <div>Triangles: {stats.triangles}</div>
      <hr style={{ borderColor: '#333' }} />
      <div>>16.67ms: {stats.buckets?.under25 + stats.buckets?.under33 + stats.buckets?.under50 + stats.buckets?.under100 + stats.buckets?.over100 || 0}</div>
      <div>>33.33ms: {stats.buckets?.under50 + stats.buckets?.under100 + stats.buckets?.over100 || 0}</div>
      <div>>50ms: {stats.buckets?.under100 + stats.buckets?.over100 || 0}</div>
      <div>>100ms: {stats.buckets?.over100 || 0}</div>
    </div>
  );
}
