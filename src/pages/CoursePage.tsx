import { useState } from 'react';
import { ChevronDown, CheckCircle2, Circle, FileCode2, BookOpenText, ListChecks, FlaskConical, ScrollText, PenLine, ArrowRight, Clock, Layers, Trophy } from 'lucide-react';
import type { CourseMeta, LessonKind } from '../types';
import { COURSE_INFO, lessonHash } from '../data';
import { useProgress, courseDone } from '../progress';

export function kindIcon(kind: LessonKind, hasCode: boolean) {
  if (kind === 'quiz') return ListChecks;
  if (kind === 'workshop') return FlaskConical;
  if (kind === 'summary') return ScrollText;
  if (kind === 'practice') return PenLine;
  if (hasCode) return FileCode2;
  return BookOpenText;
}
export function kindLabel(kind: LessonKind, hasCode: boolean) {
  if (kind === 'quiz') return 'Quiz';
  if (kind === 'workshop') return 'Workshop';
  if (kind === 'summary') return 'Summary';
  if (kind === 'practice') return 'Practice';
  if (kind === 'intro') return 'Overview';
  return hasCode ? 'Code lesson' : 'Lesson';
}

export default function CoursePage({ course }: { course: CourseMeta }) {
  const info = COURSE_INFO[course.slug];
  const st = useProgress();
  const allIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
  const done = courseDone(st, course.slug, allIds);
  const pct = Math.round((done / allIds.length) * 100);
  const [open, setOpen] = useState<Record<number, boolean>>(() => {
    // open first chapter with unfinished lessons
    const first = course.chapters.find((ch) => ch.lessons.some((l) => !st.done[`${course.slug}:${l.id}`]));
    return { [first?.n ?? 1]: true };
  });

  // next lesson to resume
  let next = { ch: 1, l: 1 };
  outer: for (const ch of course.chapters)
    for (let i = 0; i < ch.lessons.length; i++)
      if (!st.done[`${course.slug}:${ch.lessons[i].id}`]) {
        next = { ch: ch.n, l: i + 1 };
        break outer;
      }
  const minutes = course.chapters.reduce((a, ch) => a + ch.lessons.reduce((b, l) => b + l.minutes, 0), 0);
  const quizCount = course.chapters.reduce((a, ch) => a + ch.lessons.reduce((b, l) => b + l.quiz, 0), 0);
  const codeCount = course.chapters.reduce((a, ch) => a + ch.lessons.filter((l) => l.hasCode).length, 0);
  let lastPart: string | null = null;

  return (
    <main>
      <section className="bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-dots" />
        <div className="absolute right-[-70px] top-[-70px] w-[170px] h-[170px] lg:right-[-80px] lg:top-[-80px] lg:w-[340px] lg:h-[340px] rounded-full opacity-90" style={{ background: info.color }} aria-hidden />
        <div className="absolute right-[60px] top-[70px] text-[150px] font-black leading-none text-navy/90 hidden lg:block select-none" aria-hidden>
          {info.cls.split(' ')[1]}
        </div>
        <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6 py-10 md:py-14">
          <nav className="text-[14px] text-[#9aa0c4] flex gap-2" aria-label="Breadcrumb">
            <a href="#catalog" className="hover:text-white">
              Catalog
            </a>
            <span>/</span>
            <span className="text-white">{info.cls}</span>
          </nav>
          <p className="eyebrow text-brand-yellow mt-6">
            {info.level} course · {info.board}
          </p>
          <h1 className="text-[clamp(1.9rem,7.5vw,3.125rem)] font-black leading-[1.05] tracking-tight mt-3 max-w-[720px]">
            {info.short.replace(' with C++', '')} — {info.cls} <span className="text-brand-yellow">with C++</span>
          </h1>
          <p className="mt-5 text-[17px] sm:text-[18px] text-[#d4d6e6] max-w-[640px] leading-relaxed">{info.blurb}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={lessonHash(course.slug, next.ch, next.l)} className="btn-yellow text-[17px] px-6 py-3">
              {done > 0 ? 'Resume course' : 'Start course'} <ArrowRight size={18} />
            </a>
            {done > 0 && (
              <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[220px]">
                <div className="flex-1 h-2.5 rounded-full bg-navy-600 overflow-hidden">
                  <div className="h-full bg-brand-yellow" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {done}/{allIds.length} · {pct}%
                </span>
              </div>
            )}
          </div>
          <p className="mt-6 text-[14px] text-[#9aa0c4]">By Er M M Anwar · Bihar Tech Publications, Patna</p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
        <section aria-labelledby="syllabus" className="min-w-0">
          <h2 id="syllabus" className="text-[30px] font-black tracking-tight">
            Syllabus
          </h2>
          <p className="text-ink-soft mt-1">
            {course.chapters.length} chapters · {allIds.length} lessons · click a chapter to see its lessons
          </p>
          <div className="mt-6 space-y-3">
            {course.chapters.map((ch) => {
              const showPart = ch.part && ch.part !== lastPart;
              lastPart = ch.part ?? lastPart;
              const ids = ch.lessons.map((l) => l.id);
              const d = courseDone(st, course.slug, ids);
              const complete = d === ids.length;
              const isOpen = !!open[ch.n];
              return (
                <div key={ch.n}>
                  {showPart && <p className="eyebrow text-brand-hyper mt-8 mb-3">{ch.part}</p>}
                  <div className={`rounded-xl border-2 ${isOpen ? 'border-navy' : 'border-[#d6d8e2]'} bg-white overflow-hidden`}>
                    <button className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-left hover:bg-[#fafafc]" onClick={() => setOpen({ ...open, [ch.n]: !isOpen })} aria-expanded={isOpen}>
                      <span
                        className={`w-11 h-11 shrink-0 rounded-lg flex items-center justify-center font-black text-[17px] border-2 ${complete ? 'bg-[#5c9a00] border-[#5c9a00] text-white' : 'border-navy'}`}
                        style={!complete ? { background: d > 0 ? info.color : '#fff', color: d > 0 ? info.ink : '#10162F' } : undefined}
                      >
                        {complete ? <CheckCircle2 size={20} /> : ch.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold text-[17px] sm:text-[18px] leading-snug">{ch.title}</span>
                        <span className="block text-[13px] text-ink-mute mt-0.5">
                          {ch.lessons.length} lessons · {ch.lessons.reduce((a, l) => a + l.minutes, 0)} min
                          {ch.lessons.some((l) => l.hasCode) && ' · includes C++ code'}
                          {d > 0 && !complete && ` · ${d} done`}
                        </span>
                      </span>
                      <ChevronDown size={20} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <ol className="border-t border-[#e2e3ea]">
                        {ch.lessons.map((l, i) => {
                          const I = kindIcon(l.kind, l.hasCode);
                          const isDone = !!st.done[`${course.slug}:${l.id}`];
                          const q = st.quiz[`${course.slug}:${l.id}`];
                          return (
                            <li key={l.id}>
                              <a href={lessonHash(course.slug, ch.n, i + 1)} className="flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-5 py-3 hover:bg-[#f5f3ff] group border-b border-[#f0f0f4] last:border-0">
                                {isDone ? <CheckCircle2 size={19} className="text-[#5c9a00] shrink-0" /> : <Circle size={19} className="text-[#c9ccd8] shrink-0" />}
                                <I size={17} className="text-ink-mute shrink-0" />
                                <span className="flex-1 min-w-0 sm:truncate leading-snug font-medium group-hover:text-brand-hyper">{l.title}</span>
                                {q && (
                                  <span className="text-[12px] font-bold bg-[#f0fadf] text-[#3d7000] rounded px-1.5 py-0.5 tabular-nums">
                                    {q.best}/{q.total}
                                  </span>
                                )}
                                <span className="text-[12px] text-ink-mute hidden sm:inline">{kindLabel(l.kind, l.hasCode)}</span>
                                <span className="text-[12px] text-ink-mute tabular-nums w-12 shrink-0 text-right">{l.minutes} min</span>
                              </a>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 items-start lg:sticky lg:top-24 min-w-0">
          <div className="rounded-xl border-2 border-navy p-6 bg-white shadow-hard">
            <h2 className="font-extrabold text-[19px]">About this course</h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              <li className="flex items-center gap-3">
                <Layers size={18} className="text-brand-hyper" /> {course.chapters.length} chapters, {allIds.length} lessons
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="text-brand-hyper" /> About {Math.round(minutes / 60)} hours of learning
              </li>
              <li className="flex items-center gap-3">
                <FileCode2 size={18} className="text-brand-hyper" /> {codeCount} lessons with runnable C++
              </li>
              <li className="flex items-center gap-3">
                <Trophy size={18} className="text-brand-hyper" /> {quizCount} quiz questions with answers
              </li>
            </ul>
            <h3 className="font-bold mt-6 text-[15px]">Skills you will build</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {info.skills.map((s) => (
                <span key={s} className="text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: info.color, color: info.ink }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-brand-beige border-2 border-navy p-6">
            <h2 className="font-extrabold text-[17px]">Study tip from the author</h2>
            <p className="text-[15px] text-ink-soft mt-2 leading-relaxed">Type every program yourself instead of copying it, change the numbers and see what happens. A mistake you make and fix teaches you more than ten pages of reading.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
