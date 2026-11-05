import type { Block, Chapter, CourseMeta, Program } from './types';

const BASE = import.meta.env.BASE_URL || './';
let catalogPromise: Promise<CourseMeta[]> | null = null;
const chapterCache = new Map<string, Promise<Chapter>>();

export function asset(path: string) {
  return BASE.endsWith('/') ? BASE + path : BASE + '/' + path;
}

export function loadCatalog(): Promise<CourseMeta[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(asset('data/catalog.json')).then((r) => {
      if (!r.ok) throw new Error('Could not load the course list');
      return r.json();
    });
  }
  return catalogPromise;
}

export function loadChapter(slug: string, n: number): Promise<Chapter> {
  const key = `${slug}/${n}`;
  if (!chapterCache.has(key)) {
    chapterCache.set(
      key,
      fetch(asset(`data/${slug}/ch${n}.json`)).then((r) => {
        if (!r.ok) throw new Error('Could not load this chapter');
        return r.json();
      }),
    );
  }
  return chapterCache.get(key)!;
}

/** Hand-written course descriptions shown in the catalog. */
export const COURSE_INFO: Record<
  string,
  { short: string; cls: string; level: string; blurb: string; skills: string[]; color: string; ink: string; board: string }
> = {
  'class-9': {
    short: 'Computer Science Foundation',
    cls: 'Class 9',
    level: 'Beginner',
    board: 'BSEB · CBSE · State Boards',
    blurb:
      'Start from zero: how computers work, networks and the internet, Windows and office tools, then your first real C++ programs with decisions and loops.',
    skills: ['Computer fundamentals', 'Internet & networks', 'Office tools', 'C++ basics', 'Loops'],
    color: '#FFD300',
    ink: '#10162F',
  },
  'class-10': {
    short: 'Computer Science Foundation',
    cls: 'Class 10',
    level: 'Beginner',
    board: 'BSEB · CBSE · State Boards',
    blurb:
      'Spreadsheets, presentations and picture editing, cyber law and e-commerce, networks and the web — finishing with C++ functions, arrays, strings and a shop-billing project.',
    skills: ['Spreadsheets', 'Cyber law', 'E-commerce', 'C++ functions', 'Arrays & strings'],
    color: '#AEE938',
    ink: '#10162F',
  },
  'class-11': {
    short: 'Computer Science with C++',
    cls: 'Class 11',
    level: 'Intermediate',
    board: 'NCERT syllabus, taught in C++',
    blurb:
      'The NCERT Class 11 syllabus rebuilt around C++: number systems, problem solving, flow of control, functions, strings, arrays and vectors, structures and maps.',
    skills: ['Number systems', 'Problem solving', 'Functions', 'Vectors', 'Maps & structs'],
    color: '#F966FF',
    ink: '#10162F',
  },
  'class-12': {
    short: 'Computer Science with C++',
    cls: 'Class 12',
    level: 'Advanced',
    board: 'NCERT syllabus, taught in C++',
    blurb:
      'Exception and file handling, stacks and queues, sorting and searching, data analysis, databases and SQL, networks, data communication and security.',
    skills: ['Exceptions', 'File handling', 'Stacks & queues', 'Sorting', 'SQL'],
    color: '#3A10E5',
    ink: '#FFFFFF',
  },
};

export function lessonHash(slug: string, ch: number, l: number) {
  return `#${slug}-${ch}-${l}`;
}

/** Collect runnable programs (with main) in a lesson, pairing each with the book's output. */
export function programsOf(blocks: Block[]): Program[] {
  const out: Program[] = [];
  const walk = (bs: Block[]) => {
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.t === 'callout') walk(b.blocks);
      if (b.t === 'code' && /\bint\s+main\s*\(/.test(b.code)) {
        let nxt = bs[i + 1];
        const label = nxt && (nxt.t === 'h4' ? nxt.text : nxt.t === 'p' ? stripHtml(nxt.html) : '');
        if (label && /^(sample |expected )?(output|run)\b/i.test(label.trim()) && label.length < 60) nxt = bs[i + 2];
        const expected = nxt && nxt.t === 'output' ? nxt.code : undefined;
        out.push({ title: programTitle(b.code, out.length + 1), code: b.code, expected, input: expected ? guessInput(b.code, expected) : undefined });
      }
    }
  };
  walk(blocks);
  return out;
}

export function programTitle(code: string, idx: number) {
  const first = code.split('\n').find((l) => l.trim().startsWith('//'));
  if (first) {
    const t = first.replace(/^\s*\/\/\s*/, '').trim();
    if (t.length > 2) return t.length > 70 ? t.slice(0, 68) + '…' : t;
  }
  return `Program ${idx}`;
}

export function fileNameOf(code: string, idx: number) {
  const m = code.match(/\b([\w-]+\.cpp)\b/);
  return m ? m[1] : idx === 1 ? 'main.cpp' : `program${idx}.cpp`;
}

export function stripHtml(h: string) {
  const d = document.createElement('div');
  d.innerHTML = h;
  return d.textContent || '';
}

/** Recover what the user typed in the book's sample run: text after each prompt the program prints. */
export function guessInput(code: string, expected: string): string | undefined {
  if (!/\bcin\b|getline\s*\(/.test(code)) return undefined;
  const prompts: string[] = [];
  const re = /cout\s*<<\s*"((?:\\.|[^"\\])*)"\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const p = m[1].replace(/\\n/g, '\n').split('\n').pop()!.trim();
    if (p.length >= 2 && /[:?>=-]\s*$/.test(m[1].replace(/\\n/g, ''))) prompts.push(p);
  }
  if (!prompts.length) return undefined;
  const vals: string[] = [];
  for (const raw of expected.split('\n')) {
    let line = raw.trim();
    // a line can hold several prompts in a row (e.g. a menu followed by "Choice: 2")
    let guard = 0;
    while (line && guard++ < 6) {
      const p = prompts.filter((x) => line.startsWith(x)).sort((a, b) => b.length - a.length)[0];
      if (!p) break;
      line = line.slice(p.length).trim();
      const next = prompts.map((x) => line.indexOf(x)).filter((i) => i > 0).sort((a, b) => a - b)[0];
      const v = next ? line.slice(0, next).trim() : line;
      if (v) vals.push(v);
      line = next ? line.slice(next) : '';
    }
  }
  return vals.length ? vals.join('\n') + '\n' : undefined;
}
