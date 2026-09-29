/**
 * Realm of Crowns - Audio Settings Modal
 * Sliders and mute toggles for Master, Music, SFX, and Ambient channels with live preview tests.
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Radio,
  Sparkles,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { AudioSettings, DEFAULT_AUDIO_SETTINGS } from '../../audio/audioSettings';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => soundEngine.getSettings());

  useEffect(() => {
    return soundEngine.onSettingsChange((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<AudioSettings>) => {
    soundEngine.updateSettings(partial);
  };

  const handleResetDefaults = () => {
    soundEngine.updateSettings(DEFAULT_AUDIO_SETTINGS);
    soundEngine.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-amber-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-amber-200">Acoustic & Audio Sanctuary</h2>
              <p className="text-xs text-slate-400">Manage sovereign soundtracks, ambience &amp; tactical SFX</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Channel Sliders */}
        <div className="space-y-3.5">
          {/* 1. Master Channel */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdate({ masterMuted: !settings.masterMuted });
                    soundEngine.playClick();
                  }}
                  className={`p-1.5 rounded-lg border transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                    settings.masterMuted
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-400'
                      : 'bg-amber-950/80 border-amber-600/60 text-amber-400'
                  }`}
                  title={settings.masterMuted ? 'Unmute Master' : 'Mute Master'}
                >
                  {settings.masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div>
                  <span className="font-extrabold text-xs text-slate-200">Master Volume</span>
                  <span className="text-[10px] text-slate-500 block">Overall application audio</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                {settings.masterMuted ? 'MUTED' : `${Math.round(settings.masterVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.masterMuted ? 0 : settings.masterVolume}
              onChange={(e) => handleUpdate({ masterVolume: parseFloat(e.target.value), masterMuted: false })}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* 2. Soundtrack Music Channel */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdate({ musicMuted: !settings.musicMuted });
                    soundEngine.playClick();
                  }}
                  className={`p-1.5 rounded-lg border transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                    settings.musicMuted
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-400'
                      : 'bg-indigo-950/80 border-indigo-600/60 text-indigo-400'
                  }`}
                  title={settings.musicMuted ? 'Unmute Music' : 'Mute Music'}
                >
                  {settings.musicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                </button>
                <div>
                  <span className="font-extrabold text-xs text-slate-200">Music Soundtrack</span>
                  <span className="text-[10px] text-slate-500 block">Citadel, World Map &amp; War themes</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-400">
                {settings.musicMuted ? 'MUTED' : `${Math.round(settings.musicVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.musicMuted ? 0 : settings.musicVolume}
              onChange={(e) => handleUpdate({ musicVolume: parseFloat(e.target.value), musicMuted: false })}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* 3. Ambient Atmosphere Channel */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdate({ ambientMuted: !settings.ambientMuted });
                    soundEngine.playClick();
                  }}
                  className={`p-1.5 rounded-lg border transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                    settings.ambientMuted
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-400'
                      : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-400'
                  }`}
                  title={settings.ambientMuted ? 'Unmute Ambience' : 'Mute Ambience'}
                >
                  {settings.ambientMuted ? <VolumeX className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                </button>
                <div>
                  <span className="font-extrabold text-xs text-slate-200">Environmental Ambience</span>
                  <span className="text-[10px] text-slate-500 block">Wind, birdsong, water &amp; settlement life</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {settings.ambientMuted ? 'MUTED' : `${Math.round(settings.ambientVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.ambientMuted ? 0 : settings.ambientVolume}
              onChange={(e) => handleUpdate({ ambientVolume: parseFloat(e.target.value), ambientMuted: false })}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* 4. Tactical SFX & UI Channel */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdate({ sfxMuted: !settings.sfxMuted });
                    soundEngine.playClick();
                  }}
                  className={`p-1.5 rounded-lg border transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                    settings.sfxMuted
                      ? 'bg-rose-950/80 border-rose-600/60 text-rose-400'
                      : 'bg-amber-950/80 border-amber-600/60 text-amber-400'
                  }`}
                  title={settings.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                >
                  {settings.sfxMuted ? <VolumeX className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </button>
                <div>
                  <span className="font-extrabold text-xs text-slate-200">Sound Effects (SFX)</span>
                  <span className="text-[10px] text-slate-500 block">Combat, harvesting, horns, construction</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                {settings.sfxMuted ? 'MUTED' : `${Math.round(settings.sfxVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.sfxMuted ? 0 : settings.sfxVolume}
              onChange={(e) => handleUpdate({ sfxVolume: parseFloat(e.target.value), sfxMuted: false })}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Live Audio Acoustic Verification Bar */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Acoustic Verification Checks
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => soundEngine.playPrimaryAction()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] font-bold"
            >
              <Play className="w-3 h-3 text-amber-400" />
              <span>UI Ring</span>
            </button>
            <button
              onClick={() => soundEngine.playCoins()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] font-bold"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Gold Clink</span>
            </button>
            <button
              onClick={() => soundEngine.playMarchHorn()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] font-bold"
            >
              <Play className="w-3 h-3 text-rose-400" />
              <span>War Horn</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <button
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playPrimaryAction();
              onClose();
            }}
            className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-lg cursor-pointer transition min-h-[40px]"
          >
            Confirm &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
