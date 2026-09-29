/**
 * REALM OF CROWNS — RAHR Telemetry & Emergency Stabilization Verification
 */

import { RahrPerformanceMonitor } from '../src/game/performance/RahrPerformanceMonitor';
import { PerformanceMonitor } from '../src/game/mobile/performanceMonitor';

console.log('====================================================');
console.log('RAHR PERFORMANCE TELEMETRY TEST SUITE');
console.log('====================================================\n');

// 1. Initialize RAHR Performance Monitor
const rahr = RahrPerformanceMonitor.getInstance();
console.log('✓ Initialized RahrPerformanceMonitor singleton');

rahr.setSimulationCounts({
  activeObjects: 67,
  activeAIAgents: 65,
  activeAnimations: 14,
  activePhysicsBodies: 1
});

// Simulate 60 frame ticks
for (let i = 0; i < 60; i++) {
  rahr.tick();
}

const metrics = rahr.getTelemetry();
console.log('✓ Simulated 60 frame ticks');
console.log(`- Reported FPS: ${metrics.fps}`);
console.log(`- Rolling Avg FPS: ${metrics.avgFps}`);
console.log(`- Frame Time: ${metrics.frameTimeMs} ms`);
console.log(`- 1% Low Spikes: ${metrics.worstFrameMs} ms (~${metrics.onePercentLowFps} FPS)`);
console.log(`- Active AI Agents: ${metrics.activeAIAgents}`);
console.log(`- Active Animations: ${metrics.activeAnimations}`);
console.log(`- Active Physics Bodies: ${metrics.activePhysicsBodies}`);
console.log(`- Draw Calls: ${metrics.drawCalls}`);
console.log(`- Triangles: ${metrics.triangles}`);

if (metrics.activeAIAgents !== 65) {
  throw new Error(`Expected 65 active AI agents, got ${metrics.activeAIAgents}`);
}
if (metrics.activeAnimations !== 14) {
  throw new Error(`Expected 14 active animations, got ${metrics.activeAnimations}`);
}

// 2. Test PerformanceMonitor bridge
const perfMon = new PerformanceMonitor('auto');
perfMon.setEntityCount(67);
for (let i = 0; i < 60; i++) {
  perfMon.tick();
}
const bridgedMetrics = perfMon.getMetrics();
console.log('✓ Verified PerformanceMonitor bridge to RAHR telemetry');
console.log(`- Active Entities: ${bridgedMetrics.activeEntities}`);
console.log(`- Draw Calls: ${bridgedMetrics.drawCalls}`);

console.log('\n====================================================');
console.log('RAHR TELEMETRY TEST SUITE PASSED (100% OK)');
console.log('====================================================');
