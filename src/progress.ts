import { useSyncExternalStore } from 'react';

type State = {
  done: Record<string, number>; // "class-9:1-3" -> timestamp
  quiz: Record<string, { best: number; total: number }>;
  last?: { slug: string; chapter: number; lesson: number; title: string; at: number };
  code: Record<string, string>; // saved editor drafts
};

const KEY = 'bt-learn-progress-v1';
let state: State = { done: {}, quiz: {}, code: {} };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...state, ...JSON.parse(raw) };
} catch {
  /* storage unavailable: progress lives in memory only */
}
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  markDone(slug: string, lessonId: string) {
    const k = `${slug}:${lessonId}`;
    if (state.done[k]) return;
    state = { ...state, done: { ...state.done, [k]: Date.now() } };
    save();
  },
  unmark(slug: string, lessonId: string) {
    const done = { ...state.done };
    delete done[`${slug}:${lessonId}`];
    state = { ...state, done };
    save();
  },
  isDone: (slug: string, lessonId: string) => !!state.done[`${slug}:${lessonId}`],
  setQuiz(slug: string, lessonId: string, score: number, total: number) {
    const k = `${slug}:${lessonId}`;
    const prev = state.quiz[k];
    if (prev && prev.best >= score) return;
    state = { ...state, quiz: { ...state.quiz, [k]: { best: score, total } } };
    save();
  },
  setLast(last: State['last']) {
    state = { ...state, last };
    save();
  },
  saveCode(key: string, code: string) {
    state = { ...state, code: { ...state.code, [key]: code } };
    save();
  },
  clearCode(key: string) {
    const code = { ...state.code };
    delete code[key];
    state = { ...state, code };
    save();
  },
  reset() {
    state = { done: {}, quiz: {}, code: {} };
    save();
  },
};

export function useProgress() {
  return useSyncExternalStore(progress.subscribe, progress.get);
}

export function courseDone(st: State, slug: string, ids: string[]) {
  return ids.filter((id) => st.done[`${slug}:${id}`]).length;
}
