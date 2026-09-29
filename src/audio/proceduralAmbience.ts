/**
 * Realm of Crowns - Procedural Environmental Ambience Engine
 * Generates layered medieval atmospheric soundscapes (wind, birdsong, water, distant anvil).
 * 100% procedural Web Audio API synthesis with zero external dependencies.
 */

export type AmbienceType = 'citadel' | 'world_plains' | 'world_forest' | 'world_water' | 'world_mountain' | 'none';

export class ProceduralAmbienceEngine {
  private ctx: AudioContext;
  private ambientGain: GainNode;
  private currentEnv: AmbienceType = 'none';

  // Active Sound Nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLfo: OscillatorNode | null = null;

  private waterSource: AudioBufferSourceNode | null = null;
  private waterGain: GainNode | null = null;

  private birdTimer: number | null = null;
  private anvilTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(ctx: AudioContext, destination: GainNode) {
    this.ctx = ctx;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.ambientGain.connect(destination);
    this.generateNoiseBuffer();
  }

  public getEnvironment(): AmbienceType {
    return this.currentEnv;
  }

  public setEnvironment(env: AmbienceType, crossfadeSec = 1.5): void {
    if (this.currentEnv === env) return;
    this.currentEnv = env;

    // Smoothly fade down
    const now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeSec * 0.4);

    setTimeout(() => {
      this.teardownLayers();
      if (env !== 'none') {
        this.setupLayers(env);
        const resumeTime = this.ctx.currentTime;
        this.ambientGain.gain.cancelScheduledValues(resumeTime);
        this.ambientGain.gain.setValueAtTime(0.0001, resumeTime);
        this.ambientGain.gain.linearRampToValueAtTime(1.0, resumeTime + crossfadeSec * 0.6);
      }
    }, crossfadeSec * 0.4 * 1000);
  }

  public stop(): void {
    this.setEnvironment('none', 0.5);
  }

  private generateNoiseBuffer(): void {
    const bufferSize = this.ctx.sampleRate * 3; // 3-second noise loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink noise approximation (1/f filter)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buffer;
  }

  private setupLayers(env: AmbienceType): void {
    if (!this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // 1. Wind Bed (Customized per environment)
    if (env === 'citadel' || env === 'world_plains' || env === 'world_forest' || env === 'world_mountain') {
      const windSource = this.ctx.createBufferSource();
      windSource.buffer = this.noiseBuffer;
      windSource.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';

      const windGain = this.ctx.createGain();

      // Configure frequencies according to terrain
      const baseFreq = env === 'world_mountain' ? 520 : env === 'world_forest' ? 320 : 400;
      const baseVol = env === 'world_mountain' ? 0.07 : env === 'citadel' ? 0.035 : 0.05;

      windFilter.frequency.setValueAtTime(baseFreq, now);
      windFilter.Q.setValueAtTime(1.8, now);
      windGain.gain.setValueAtTime(baseVol, now);

      // Slow LFO for organic wind gusts
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, now);
      lfoGain.gain.setValueAtTime(env === 'world_mountain' ? 220 : 120, now);
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.ambientGain);

      windSource.start(now);
      lfo.start(now);

      this.windSource = windSource;
      this.windFilter = windFilter;
      this.windGain = windGain;
      this.windLfo = lfo;
    }

    // 2. Flowing Water / Coastal Shoreline
    if (env === 'world_water' || env === 'citadel') {
      const waterSource = this.ctx.createBufferSource();
      waterSource.buffer = this.noiseBuffer;
      waterSource.loop = true;

      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = 'lowpass';
      waterFilter.frequency.setValueAtTime(env === 'world_water' ? 650 : 380, now);

      const waterGain = this.ctx.createGain();
      waterGain.gain.setValueAtTime(env === 'world_water' ? 0.22 : 0.06, now);

      // Gentle wave swell LFO
      const waveLfo = this.ctx.createOscillator();
      const waveLfoGain = this.ctx.createGain();
      waveLfo.frequency.setValueAtTime(0.18, now);
      waveLfoGain.gain.setValueAtTime(env === 'world_water' ? 0.08 : 0.02, now);
      waveLfo.connect(waveLfoGain);
      waveLfoGain.connect(waterGain.gain);

      waterSource.connect(waterFilter);
      waterFilter.connect(waterGain);
      waterGain.connect(this.ambientGain);

      waterSource.start(now);
      waveLfo.start(now);

      this.waterSource = waterSource;
      this.waterGain = waterGain;
    }

    // 3. Birdsong Periodic Generator
    if (env === 'citadel' || env === 'world_forest' || env === 'world_plains') {
      const birdInterval = env === 'world_forest' ? 3200 : 5500;
      this.birdTimer = window.setInterval(() => {
        if (Math.random() > 0.3) {
          this.triggerBirdChirp();
        }
      }, birdInterval);
    }

    // 4. Distant Citadel Blacksmith Anvil Ping
    if (env === 'citadel') {
      this.anvilTimer = window.setInterval(() => {
        if (Math.random() > 0.4) {
          this.triggerDistantAnvil();
        }
      }, 7500);
    }
  }

  private triggerBirdChirp(): void {
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const startFreq = 2600 + Math.random() * 800;
      const endFreq = startFreq + (Math.random() > 0.5 ? 600 : -500);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  private triggerDistantAnvil(): void {
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  private teardownLayers(): void {
    if (this.birdTimer) {
      clearInterval(this.birdTimer);
      this.birdTimer = null;
    }
    if (this.anvilTimer) {
      clearInterval(this.anvilTimer);
      this.anvilTimer = null;
    }

    if (this.windSource) {
      try {
        this.windSource.stop();
        this.windSource.disconnect();
      } catch {}
      this.windSource = null;
    }
    if (this.windLfo) {
      try {
        this.windLfo.stop();
        this.windLfo.disconnect();
      } catch {}
      this.windLfo = null;
    }
    if (this.waterSource) {
      try {
        this.waterSource.stop();
        this.waterSource.disconnect();
      } catch {}
      this.waterSource = null;
    }
  }
}
