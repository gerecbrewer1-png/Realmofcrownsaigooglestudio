/**
 * Realm of Crowns - Procedural Medieval Music Engine
 * Uses Web Audio API synthesis to produce non-repetitive, modal medieval soundtrack themes.
 * Zero external audio files required. 100% royalty-free original procedural music.
 */

export type MusicTrackId = 'main' | 'citadel' | 'world' | 'combat' | 'none';

interface NoteEvent {
  note: number; // Frequency in Hz
  timeOffset: number; // seconds from bar start
  duration: number; // seconds
  velocity: number; // 0.0 to 1.0
  type?: 'lute' | 'flute' | 'bass' | 'horn' | 'drum';
}

export class ProceduralMusicEngine {
  private ctx: AudioContext;
  private musicGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private currentTrackGain: GainNode | null = null;
  private currentTrack: MusicTrackId = 'none';
  private loopTimer: number | null = null;
  private barStartTime: number = 0;
  private barIndex: number = 0;
  private isPlaying: boolean = false;

  constructor(ctx: AudioContext, destination: GainNode) {
    this.ctx = ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Warm master compressor prevents clipping while keeping delicate lute & flutes present
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    this.compressor.knee.setValueAtTime(8, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.005, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.2, ctx.currentTime);

    this.musicGain.connect(this.compressor);
    this.compressor.connect(destination);
  }

  public getTrack(): MusicTrackId {
    return this.currentTrack;
  }

  public setTrack(track: MusicTrackId, crossfadeDuration = 2.0): void {
    if (this.currentTrack === track) return;
    const now = this.ctx.currentTime;

    // Fade out previous track gain if active
    if (this.currentTrackGain) {
      const oldGain = this.currentTrackGain;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeDuration);
      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {}
      }, (crossfadeDuration + 0.2) * 1000);
    }

    this.currentTrack = track;
    if (track === 'none') {
      this.stop();
      return;
    }

    // Create fresh track gain node and fade in
    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0.0001, now);
    newGain.gain.linearRampToValueAtTime(1.0, now + crossfadeDuration);
    newGain.connect(this.musicGain);
    this.currentTrackGain = newGain;

    this.barStartTime = this.ctx.currentTime + 0.05;
    this.barIndex = 0;
    this.isPlaying = true;

    if (!this.loopTimer) {
      this.startScheduler();
    }
  }

  public stop(): void {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.currentTrackGain) {
      const now = this.ctx.currentTime;
      this.currentTrackGain.gain.cancelScheduledValues(now);
      this.currentTrackGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
      const old = this.currentTrackGain;
      setTimeout(() => {
        try {
          old.disconnect();
        } catch {}
      }, 600);
      this.currentTrackGain = null;
    }
    this.currentTrack = 'none';
    this.isPlaying = false;
  }

  private startScheduler(): void {
    this.loopTimer = window.setInterval(() => {
      if (!this.isPlaying || this.currentTrack === 'none' || !this.currentTrackGain) return;
      const now = this.ctx.currentTime;
      const barDuration = this.getBarDuration(this.currentTrack);

      // Look ahead up to 0.4 seconds
      while (this.barStartTime < now + 0.4) {
        this.scheduleBar(this.currentTrack, this.barStartTime, this.barIndex, this.currentTrackGain);
        this.barStartTime += barDuration;
        this.barIndex++;
      }
    }, 150);
  }

  private getBarDuration(track: MusicTrackId): number {
    switch (track) {
      case 'combat':
        return 2.4; // 100 BPM 4/4
      case 'citadel':
        return 4.0; // 60 BPM 4/4
      case 'world':
        return 3.6; // 66 BPM 4/4
      case 'main':
      default:
        return 3.2; // 75 BPM 4/4
    }
  }

  private scheduleBar(track: MusicTrackId, barStart: number, barIdx: number, targetGain: GainNode): void {
    const notes = this.generateBarNotes(track, barIdx);
    for (const n of notes) {
      const startTime = barStart + n.timeOffset;
      if (startTime >= this.ctx.currentTime - 0.05) {
        this.playVoice(n, startTime, targetGain);
      }
    }
  }

  private generateBarNotes(track: MusicTrackId, barIdx: number): NoteEvent[] {
    const events: NoteEvent[] = [];

    // Frequencies (Hz)
    const D2 = 73.42, A2 = 110.0, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0, A3 = 220.0, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0;
    const E2 = 82.41, B2 = 123.47;

    if (track === 'citadel') {
      // Serene Medieval Court in D Dorian (D - F - A - C - G)
      const chordRoots = [D3, G3, A3, D3];
      const root = chordRoots[barIdx % chordRoots.length];
      const bassFreq = barIdx % 2 === 0 ? D2 : A2;

      // 1. Gentle sustained cello/bass drone
      events.push({
        note: bassFreq,
        timeOffset: 0,
        duration: 3.8,
        velocity: 0.38,
        type: 'bass',
      });

      // 2. Plucked medieval lute arpeggios (8th notes)
      const luteScale = [root, root * 1.189, root * 1.498, root * 1.782, root * 2.0];
      const pattern = [0, 2, 1, 3, 2, 4, 1, 2];
      pattern.forEach((pIdx, step) => {
        const freq = luteScale[pIdx % luteScale.length];
        events.push({
          note: freq,
          timeOffset: step * 0.48,
          duration: 0.42,
          velocity: step % 2 === 0 ? 0.36 : 0.26,
          type: 'lute',
        });
      });

      // 3. Occasional sweet wooden flute melody
      if (barIdx % 2 === 1) {
        const fluteNotes = [
          { f: A4, t: 0.5, d: 0.9 },
          { f: G4, t: 1.5, d: 0.8 },
          { f: F4, t: 2.4, d: 1.2 },
        ];
        for (const fn of fluteNotes) {
          events.push({
            note: fn.f,
            timeOffset: fn.t,
            duration: fn.d,
            velocity: 0.32,
            type: 'flute',
          });
        }
      }
    } else if (track === 'world') {
      // Grand Exploration & Strategic Horizons in E Aeolian / G Major
      const roots = [E2, G3, B2, E2];
      const curRoot = roots[barIdx % roots.length];

      // Bass drone with slow swell
      events.push({
        note: curRoot,
        timeOffset: 0,
        duration: 3.4,
        velocity: 0.40,
        type: 'bass',
      });

      // Marching open fifths rhythm
      const fifth = curRoot * 1.5;
      [0, 0.9, 1.8, 2.7].forEach((t, i) => {
        events.push({
          note: i % 2 === 0 ? curRoot * 2 : fifth,
          timeOffset: t,
          duration: 0.75,
          velocity: 0.32,
          type: 'lute',
        });
      });

      // Distant heraldic horn motif
      if (barIdx % 3 === 0) {
        events.push(
          { note: E3 * 2, timeOffset: 0.2, duration: 0.8, velocity: 0.34, type: 'horn' },
          { note: G3 * 2, timeOffset: 1.1, duration: 0.7, velocity: 0.34, type: 'horn' },
          { note: B3 * 2, timeOffset: 1.9, duration: 1.3, velocity: 0.36, type: 'horn' }
        );
      }
    } else if (track === 'combat') {
      // Driving Battle in D Minor with rhythmic war percussion & urgent brass
      // War drum heartbeat (quarter notes)
      [0, 0.6, 1.2, 1.8].forEach((t) => {
        events.push({
          note: 55,
          timeOffset: t,
          duration: 0.35,
          velocity: 0.45,
          type: 'drum',
        });
      });

      // Syncopated percussion clicks
      [0.3, 0.9, 1.5, 2.1].forEach((t) => {
        events.push({
          note: 180,
          timeOffset: t,
          duration: 0.12,
          velocity: 0.28,
          type: 'drum',
        });
      });

      // Urgent staccato brass stabs
      const brassStabs = [
        { n: D3, t: 0.0, d: 0.28 },
        { n: F3, t: 0.6, d: 0.25 },
        { n: A3, t: 0.9, d: 0.25 },
        { n: D4, t: 1.2, d: 0.45 },
      ];
      for (const b of brassStabs) {
        events.push({
          note: b.n,
          timeOffset: b.t,
          duration: b.d,
          velocity: 0.36,
          type: 'horn',
        });
      }
    } else if (track === 'main') {
      // Sovereign Coronation / Welcome theme
      const chords = [C4, G3, A3, F3];
      const c = chords[barIdx % chords.length];
      events.push({
        note: c * 0.5,
        timeOffset: 0,
        duration: 3.0,
        velocity: 0.34,
        type: 'bass',
      });
      events.push(
        { note: c, timeOffset: 0.0, duration: 0.6, velocity: 0.32, type: 'lute' },
        { note: c * 1.25, timeOffset: 0.4, duration: 0.6, velocity: 0.30, type: 'lute' },
        { note: c * 1.5, timeOffset: 0.8, duration: 0.8, velocity: 0.34, type: 'lute' },
        { note: c * 2, timeOffset: 1.4, duration: 1.2, velocity: 0.34, type: 'flute' }
      );
    }

    return events;
  }

  private playVoice(note: NoteEvent, startTime: number, outputGain: GainNode): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const vel = note.velocity;
    const dur = note.duration;

    switch (note.type) {
      case 'lute': {
        // Plucked acoustic string: triangle + quick decay lowpass filter
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.note, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, startTime);
        filter.frequency.exponentialRampToValueAtTime(420, startTime + dur);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(vel * 0.9, startTime + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        break;
      }
      case 'flute': {
        // Wooden pastoral flute: warm sine wave with gentle breath
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.note, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, startTime);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(vel * 0.8, startTime + 0.1);
        noteGain.gain.setValueAtTime(vel * 0.68, startTime + dur - 0.1);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + dur);
        break;
      }
      case 'bass': {
        // Warm medieval cello drone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.note, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, startTime);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(vel * 0.72, startTime + 0.25);
        noteGain.gain.setValueAtTime(vel * 0.62, startTime + dur - 0.25);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + dur);
        break;
      }
      case 'horn': {
        // Regal brass / war horn
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.note, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, startTime);
        filter.Q.setValueAtTime(2.2, startTime);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(vel * 0.82, startTime + 0.06);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        break;
      }
      case 'drum': {
        // Deep war drum impact
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.note * 2.2, startTime);
        osc.frequency.exponentialRampToValueAtTime(38, startTime + dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, startTime);

        noteGain.gain.setValueAtTime(vel * 1.1, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        break;
      }
      default: {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.note, startTime);
        noteGain.gain.setValueAtTime(vel * 0.6, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      }
    }

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(outputGain);

    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }
}
