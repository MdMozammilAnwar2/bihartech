import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, FileCode2, BookOpen, ListChecks, FlaskConical } from 'lucide-react';
import type { CourseMeta } from '../types';
import { COURSE_INFO, lessonHash } from '../data';

type Item = { label: string; sub: string; href: string; kind: string; hay: string };

export default function SearchPalette({ catalog, onClose }: { catalog: CourseMeta[]; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const out: Item[] = [];
    for (const c of catalog) {
      const info = COURSE_INFO[c.slug];
      out.push({ label: `${info.cls} · ${info.short}`, sub: 'Course', href: `#${c.slug}`, kind: 'course', hay: `${info.cls} ${info.short}`.toLowerCase() });
      for (const ch of c.chapters) {
        ch.lessons.forEach((l, li) => {
          out.push({
            label: l.title,
            sub: `${info.cls} · Ch ${ch.n}: ${ch.title}`,
            href: lessonHash(c.slug, ch.n, li + 1),
            kind: l.kind === 'quiz' ? 'quiz' : l.hasCode ? 'code' : l.kind === 'workshop' ? 'lab' : 'read',
            hay: `${l.title} ${ch.title} ${info.cls}`.toLowerCase(),
          });
        });
      }
    }
    return out;
  }, [catalog]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return items.filter((i) => i.kind === 'course').concat(items.filter((i) => /^\d+\.1 /.test(i.label)).slice(0, 8));
    return items.filter((i) => terms.every((t) => i.hay.includes(t))).slice(0, 40);
  }, [q, items]);

  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => setSel(0), [q]);

  const go = (it?: Item) => {
    if (!it) return;
    location.hash = it.href;
    onClose();
  };

  const Icon = (k: string) => (k === 'quiz' ? ListChecks : k === 'code' ? FileCode2 : k === 'lab' ? FlaskConical : BookOpen);

  return (
    <div className="fixed inset-0 z-[60] bg-navy/60 backdrop-blur-[2px] flex items-start justify-center pt-[10vh] px-4" onMouseDown={onClose}>
      <div className="w-full max-w-[640px] bg-white rounded-xl shadow-2xl border-2 border-navy overflow-hidden pop" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Search lessons">
        <div className="flex items-center gap-3 px-4 border-b border-[#e2e3ea]">
          <Search size={18} className="text-ink-mute" />
          <input
            ref={input}
            id="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === 'Enter') go(results[sel]);
            }}
            placeholder="Search topics: loops, binary, SQL, stack, e-commerce…"
            className="flex-1 h-14 outline-none text-[16px] bg-transparent"
          />
          <kbd className="font-mono text-[11px] text-ink-mute border border-[#d6d8e2] rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul className="max-h-[55vh] overflow-auto scroll-thin py-2">
          {results.length === 0 && <li className="px-5 py-8 text-center text-ink-mute">No lessons match “{q}”. Try a shorter word.</li>}
          {results.map((r, i) => {
            const I = Icon(r.kind);
            return (
              <li key={r.href + i}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(r)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 ${i === sel ? 'bg-[#f1edff]' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${r.kind === 'course' ? 'bg-brand-yellow' : 'bg-[#f0f0f4]'}`}>
                    <I size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{r.label}</span>
                    <span className="block text-[13px] text-ink-mute truncate">{r.sub}</span>
                  </span>
                  {i === sel && <CornerDownLeft size={15} className="ml-auto text-ink-mute shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
