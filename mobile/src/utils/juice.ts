import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = '@mustafa/juice_muted';

let muted = false;
let loaded = false;
let audioCtx: any = null;

export async function loadJuicePrefs(): Promise<boolean> {
  if (loaded) return muted;
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
  } catch {
    muted = false;
  }
  loaded = true;
  return muted;
}

export function isJuiceMuted(): boolean {
  return muted;
}

export async function setJuiceMuted(value: boolean): Promise<void> {
  muted = value;
  try {
    await AsyncStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {}
}

export function vibrate(pattern: number | number[]): void {
  if (muted) return;
  try {
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      nav?.vibrate?.(pattern);
    } else {
      Vibration.vibrate(pattern as any);
    }
  } catch {}
}

function getAudioCtx(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** Sequência curta de notas (frequência Hz, duração ms). Só no PWA; no app nativo fica só a vibração. */
function playNotes(notes: Array<[number, number]>, type: 'sine' | 'triangle' | 'square' = 'triangle', volume = 0.08) {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, ms] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
      t += ms / 1000;
    }
  } catch {}
}

export const juice = {
  xp() {
    playNotes([[880, 70], [1320, 110]]);
    vibrate(15);
  },
  combo(level: number) {
    const base = 520 + level * 120;
    playNotes([[base, 60], [base * 1.25, 60], [base * 1.5, 120]], 'square', 0.05);
    vibrate([20, 30, 20]);
  },
  chestShake() {
    playNotes([[220, 40], [260, 40], [220, 40], [300, 60]], 'square', 0.04);
    vibrate([30, 40, 30, 40, 30]);
  },
  chestOpen(rarity: 'COMMON' | 'RARE' | 'EPIC') {
    if (rarity === 'EPIC') {
      playNotes([[523, 90], [659, 90], [784, 90], [1047, 140], [1319, 260]], 'triangle', 0.1);
      vibrate([40, 50, 40, 50, 120]);
    } else if (rarity === 'RARE') {
      playNotes([[523, 90], [784, 90], [1047, 200]], 'triangle', 0.09);
      vibrate([30, 40, 60]);
    } else {
      playNotes([[660, 80], [990, 160]]);
      vibrate(40);
    }
  },
  levelUp() {
    playNotes([[392, 100], [523, 100], [659, 100], [784, 160], [1047, 320]], 'triangle', 0.1);
    vibrate([50, 60, 50, 60, 150]);
  },
  achievement() {
    playNotes([[784, 90], [988, 90], [1175, 220]], 'sine', 0.1);
    vibrate([30, 40, 80]);
  },
};
