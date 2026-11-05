import { useSyncExternalStore } from 'react';
import { asset } from './data';

export type RunResult = {
  output: string;
  errors: string[];
  exitCode: number | null;
  compileMs?: number;
  runMs?: number | null;
  timedOut?: boolean;
  failure?: string;
};

type Status = { phase: 'idle' | 'loading' | 'ready' | 'compiling' | 'running' | 'unavailable'; progress: number };

let worker: Worker | null = null;
let status: Status = { phase: 'idle', progress: 0 };
let loaded = false;
const listeners = new Set<() => void>();
let pending: { id: number; resolve: (r: RunResult) => void; timer: number } | null = null;
let seq = 0;

function set(s: Partial<Status>) {
  status = { ...status, ...s };
  listeners.forEach((l) => l());
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(asset('cpp-worker.js'));
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m.type === 'progress') set({ phase: loaded ? status.phase : 'loading', progress: m.value });
    else if (m.type === 'ready') {
      loaded = true;
      if (status.phase === 'loading') set({ phase: 'ready', progress: 1 });
    } else if (m.type === 'compiling') {
      loaded = true;
      set({ phase: 'compiling', progress: 1 });
    } else if ((m.type === 'result' || m.type === 'error') && pending && m.id === pending.id) {
      window.clearTimeout(pending.timer);
      const p = pending;
      pending = null;
      set({ phase: 'ready' });
      if (m.type === 'result') p.resolve({ output: m.output, errors: m.errors, exitCode: m.exitCode, compileMs: m.compileMs, runMs: m.runMs });
      else p.resolve({ output: '', errors: [], exitCode: null, failure: m.message });
    }
  };
  worker.onerror = () => {
    if (pending) {
      window.clearTimeout(pending.timer);
      pending.resolve({ output: '', errors: [], exitCode: null, failure: 'The C++ compiler could not start in this browser.' });
      pending = null;
    }
    set({ phase: 'idle', progress: 0 });
    worker = null;
  };
  return worker;
}

// The compiler files are optional: a deployment without public/clang shows the book's output instead.
let availability: Promise<boolean> | null = null;
export function compilerAvailable() {
  if (!availability)
    availability = fetch(asset('clang/runtime-manifest.v1.json'), { method: 'GET' })
      .then((r) => r.ok)
      .catch(() => false)
      .then((ok) => {
        if (!ok) set({ phase: 'unavailable' });
        return ok;
      });
  return availability;
}

export const runner = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => status,
  async warmup() {
    if (!(await compilerAvailable())) return;
    if (loaded || status.phase === 'loading') return;
    set({ phase: 'loading', progress: 0 });
    ensureWorker().postMessage({ type: 'warmup' });
  },
  run(code: string, stdin: string): Promise<RunResult> {
    const w = ensureWorker();
    if (pending) return Promise.resolve({ output: '', errors: [], exitCode: null, failure: 'A program is already running.' });
    const id = ++seq;
    set({ phase: loaded ? 'compiling' : 'loading' });
    return new Promise((resolve) => {
      // first run includes the one-time download, so allow longer
      const limit = loaded ? 25000 : 120000;
      const timer = window.setTimeout(() => {
        if (!pending || pending.id !== id) return;
        pending = null;
        w.terminate();
        worker = null;
        loaded = false;
        set({ phase: 'idle', progress: 0 });
        resolve({ output: '', errors: [], exitCode: null, timedOut: true });
      }, limit);
      pending = { id, resolve, timer };
      w.postMessage({ type: 'run', id, code, stdin });
    });
  },
  stop() {
    if (!pending || !worker) return;
    window.clearTimeout(pending.timer);
    pending.resolve({ output: '', errors: [], exitCode: null, failure: 'Stopped.' });
    pending = null;
    worker.terminate();
    worker = null;
    loaded = false;
    set({ phase: 'idle', progress: 0 });
  },
};

export function useRunner() {
  return useSyncExternalStore(runner.subscribe, runner.get);
}
