import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Search, ListTree, X, BookOpenText, Code2, Loader2 } from 'lucide-react';
import type { Chapter, CourseMeta } from '../types';
import { COURSE_INFO, lessonHash, loadChapter, programsOf } from '../data';
import { progress, useProgress } from '../progress';
import Content, { slugify } from '../components/Content';
import CodePanel from '../components/CodePanel';
import Quiz from '../components/Quiz';
import { kindIcon, kindLabel } from './CoursePage';

type Props = { course: CourseMeta; chapterN: number; lessonN: number; onSearch: () => void };

export default function LessonPage({ course, chapterN, lessonN, onSearch }: Props) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileTab, setMobileTab] = useState<'learn' | 'code'>('learn');
  const [activeProg, setActiveProg] = useState(0);
  const st = useProgress();
  const info = COURSE_INFO[course.slug];
  const chMeta = course.chapters.find((c) => c.n === chapterN);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setChapter(null);
    setError(null);
    loadChapter(course.slug, chapterN)
      .then((c) => live && setChapter(c))
      .catch((e) => live && setError(String(e.message || e)));
    return () => {
      live = false;
    };
  }, [course.slug, chapterN]);

  const lesson = chapter?.lessons[lessonN - 1];
  const programs = useMemo(() => (lesson ? programsOf(lesson.blocks) : []), [lesson]);
  const isCode = programs.length > 0;

  useEffect(() => {
    setActiveProg(0);
    setMobileTab('learn');
    scrollRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    if (lesson) {
      progress.setLast({ slug: course.slug, chapter: chapterN, lesson: lessonN, title: lesson.title, at: Date.now() });
      document.title = `${lesson.title} · ${info.cls} · BiharTech Learn`;
    }
  }, [lesson, course.slug, chapterN, lessonN, info.cls]);

  // neighbours
  const chapters = course.chapters;
  const ci = chapters.findIndex((c) => c.n === chapterN);
  const prevHash = lessonN > 1 ? lessonHash(course.slug, chapterN, lessonN - 1) : ci > 0 ? lessonHash(course.slug, chapters[ci - 1].n, chapters[ci - 1].lessons.length) : null;
  const nextHash = chMeta && lessonN < chMeta.lessons.length ? lessonHash(course.slug, chapterN, lessonN + 1) : ci < chapters.length - 1 ? lessonHash(course.slug, chapters[ci + 1].n, 1) : null;
  const nextTitle = chMeta && lessonN < chMeta.lessons.length ? chMeta.lessons[lessonN].title : ci < chapters.length - 1 ? `Chapter ${chapters[ci + 1].n}: ${chapters[ci + 1].title}` : 'Course complete';

  const done = lesson ? progress.isDone(course.slug, lesson.id) : false;
  const goNext = () => {
    if (lesson) progress.markDone(course.slug, lesson.id);
    location.hash = nextHash ?? `#${course.slug}`;
  };

  const openCode = (code: string) => {
    const idx = programs.findIndex((p) => p.code === code);
    if (idx >= 0) setActiveProg(idx);
    setMobileTab('code');
  };

  const headings = lesson ? lesson.blocks.filter((b) => b.t === 'h2' || b.t === 'h3').map((b) => ('text' in b ? b.text : '')) : [];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* top bar */}
      <header className="h-14 [@media(max-height:500px)]:h-11 shrink-0 bg-navy text-white flex items-center gap-3 px-3 sm:px-4 border-b border-navy-600 z-30">
        <a href="#home" className="w-8 h-8 rounded-[6px] bg-brand-yellow border-2 border-white/0 flex items-center justify-center font-mono font-black text-navy text-[13px] shrink-0" aria-label="Home">
          {'{}'}
        </a>
        <button onClick={() => setDrawer(true)} className="flex items-center gap-2 hover:bg-white/10 rounded px-2 py-1.5 min-w-0" aria-label="Open syllabus">
          <ListTree size={18} className="shrink-0" />
          <span className="min-w-0 text-left">
            <span className="block text-[11px] text-[#9aa0c4] leading-tight truncate">
              {info.cls} · {info.short}
            </span>
            <span className="block text-[14px] font-bold leading-tight truncate max-w-[52vw] sm:max-w-[420px]">
              Ch {chapterN}: {chMeta?.title}
            </span>
          </span>
        </button>
        <div className="hidden lg:flex items-center gap-1 mx-auto" aria-label="Lessons in this chapter">
          {chMeta?.lessons.map((l, i) => {
            const d = !!st.done[`${course.slug}:${l.id}`];
            const cur = i + 1 === lessonN;
            return (
              <a
                key={l.id}
                href={lessonHash(course.slug, chapterN, i + 1)}
                title={l.title}
                className={`h-2 rounded-full transition-all ${cur ? 'w-8 bg-brand-yellow' : d ? 'w-4 bg-[#AEE938]' : 'w-4 bg-navy-500 hover:bg-[#9aa0c4]'}`}
              />
            );
          })}
        </div>
        <button onClick={onSearch} className="ml-auto lg:ml-0 p-2 rounded hover:bg-white/10" aria-label="Search lessons">
          <Search size={18} />
        </button>
        <a href={`#${course.slug}`} className="hidden sm:inline-flex text-[13px] font-semibold px-3 py-1.5 rounded border border-navy-500 hover:border-white">
          Course home
        </a>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 relative">
        {error && (
          <div className="p-10 text-center">
            <p className="font-bold">{error}</p>
            <a className="btn-outline mt-4" href={`#${course.slug}`}>
              Back to the course
            </a>
          </div>
        )}
        {!lesson && !error && (
          <div className="h-full flex items-center justify-center text-ink-mute gap-2">
            <Loader2 className="animate-spin" size={18} /> Loading lesson…
          </div>
        )}
        {lesson && isCode && (
          <div className="h-full flex flex-col lg:flex-row">
            <div className="lg:hidden flex shrink-0 bg-navy-800 border-b border-navy-600">
              {(['learn', 'code'] as const).map((t) => (
                <button key={t} onClick={() => setMobileTab(t)} className={`flex-1 h-11 [@media(max-height:500px)]:h-9 text-sm font-bold flex items-center justify-center gap-2 border-b-2 ${mobileTab === t ? 'text-white border-brand-yellow' : 'text-[#9aa0c4] border-transparent'}`}>
                  {t === 'learn' ? <BookOpenText size={16} /> : <Code2 size={16} />} {t === 'learn' ? 'Learn' : 'Code editor'}
                </button>
              ))}
            </div>
            <div ref={scrollRef} className={`min-w-0 lg:w-[44%] xl:w-[42%] min-h-0 overflow-y-auto scroll-thin bg-navy-800 ${mobileTab === 'learn' ? 'flex-1 lg:flex-none' : 'hidden lg:block'}`}>
              <article className="px-4 sm:px-8 py-6 sm:py-8 max-w-[760px] mx-auto">
                <LessonHeader kind={lesson.kind} hasCode title={lesson.title} n={lessonN} total={chMeta?.lessons.length ?? 0} minutes={lesson.minutes} dark />
                <Content blocks={lesson.blocks} dark onOpenCode={openCode} />
                <NextCard dark title={nextTitle} onNext={goNext} done={done} />
              </article>
            </div>
            <div className={`flex-1 min-h-0 min-w-0 ${mobileTab === 'code' ? 'block' : 'hidden lg:block'}`}>
              <CodePanel programs={programs} active={activeProg} setActive={setActiveProg} storeKey={`${course.slug}:${lesson.id}`} />
            </div>
          </div>
        )}
        {lesson && !isCode && (
          <div ref={scrollRef} className="h-full overflow-y-auto scroll-thin">
            <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-[1fr_250px] gap-12">
              <article className="min-w-0 max-w-[780px] w-full mx-auto xl:mx-0">
                <LessonHeader kind={lesson.kind} hasCode={false} title={lesson.title} n={lessonN} total={chMeta?.lessons.length ?? 0} minutes={lesson.minutes} />
                {lesson.kind === 'quiz' && lesson.quiz ? (
                  <div className="mt-2">
                    <Quiz
                      key={lesson.id}
                      questions={lesson.quiz}
                      best={st.quiz[`${course.slug}:${lesson.id}`]}
                      onFinish={(s, t) => {
                        progress.setQuiz(course.slug, lesson.id, s, t);
                        progress.markDone(course.slug, lesson.id);
                      }}
                    />
                  </div>
                ) : (
                  <Content blocks={lesson.blocks} />
                )}
                <NextCard title={nextTitle} onNext={goNext} done={done} quiz={lesson.kind === 'quiz'} />
              </article>
              {headings.length > 2 && lesson.kind !== 'quiz' && (
                <aside className="hidden xl:block">
                  <div className="sticky top-6">
                    <p className="eyebrow text-ink-mute mb-3">On this page</p>
                    <ul className="space-y-2 border-l-2 border-[#e2e3ea]">
                      {headings.slice(0, 18).map((h, i) => (
                        <li key={i}>
                          <a
                            href={`#${course.slug}-${chapterN}-${lessonN}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(slugify(h))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="block pl-4 -ml-[2px] border-l-2 border-transparent hover:border-brand-hyper text-[14px] text-ink-soft hover:text-navy leading-snug"
                          >
                            {h}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </div>

      {/* bottom bar */}
      <footer className="h-[60px] [@media(max-height:500px)]:h-12 shrink-0 bg-navy text-white flex items-center gap-3 px-3 sm:px-5 border-t border-navy-600">
        {prevHash ? (
          <a href={prevHash} className="btn text-white border-2 border-navy-500 hover:border-white py-2 px-3 sm:px-4">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
          </a>
        ) : (
          <span />
        )}
        <span className="mx-auto text-[13px] text-[#c9cce0] tabular-nums flex items-center gap-2">
          {done && <CheckCircle2 size={15} className="text-brand-mint" />}
          {lessonN}/{chMeta?.lessons.length} <span className="hidden sm:inline">· {lesson ? kindLabel(lesson.kind, isCode) : ''}</span>
        </span>
        <button onClick={goNext} className="btn-yellow py-2 px-4 sm:px-6 !border-brand-yellow">
          {nextHash ? 'Next' : 'Finish course'} <ArrowRight size={16} />
        </button>
      </footer>

      {/* syllabus drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Course syllabus">
          <div className="w-[min(420px,92vw)] h-full bg-white shadow-2xl flex flex-col pop">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#e2e3ea] shrink-0">
              <span className="font-extrabold">
                {info.cls} · Syllabus
              </span>
              <button onClick={() => setDrawer(false)} className="p-2 rounded hover:bg-[#f0f0f4]" aria-label="Close syllabus">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin py-3">
              {course.chapters.map((ch) => (
                <details key={ch.n} open={ch.n === chapterN} className="group">
                  <summary className={`list-none cursor-pointer px-5 py-2.5 flex items-center gap-3 hover:bg-[#f7f7fa] ${ch.n === chapterN ? 'font-extrabold' : 'font-semibold'}`}>
                    <span className="font-mono text-[12px] w-6 text-ink-mute">{ch.n}</span>
                    <span className="flex-1 text-[15px] leading-snug">{ch.title}</span>
                  </summary>
                  <ol className="pb-2">
                    {ch.lessons.map((l, i) => {
                      const I = kindIcon(l.kind, l.hasCode);
                      const cur = ch.n === chapterN && i + 1 === lessonN;
                      const d = !!st.done[`${course.slug}:${l.id}`];
                      return (
                        <li key={l.id}>
                          <a
                            href={lessonHash(course.slug, ch.n, i + 1)}
                            onClick={() => setDrawer(false)}
                            className={`flex items-center gap-2.5 pl-8 sm:pl-14 pr-4 sm:pr-5 py-2 text-[14px] ${cur ? 'bg-[#f1edff] text-brand-hyper font-bold' : 'hover:bg-[#f7f7fa]'}`}
                          >
                            {d ? <CheckCircle2 size={15} className="text-[#5c9a00] shrink-0" /> : <Circle size={15} className="text-[#c9ccd8] shrink-0" />}
                            <I size={14} className="text-ink-mute shrink-0" />
                            <span className="min-w-0 leading-snug">{l.title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              ))}
            </div>
          </div>
          <button className="flex-1 bg-navy/50" onClick={() => setDrawer(false)} aria-label="Close syllabus" />
        </div>
      )}
    </div>
  );
}

function LessonHeader({ kind, hasCode, title, n, total, minutes, dark }: { kind: Parameters<typeof kindLabel>[0]; hasCode: boolean; title: string; n: number; total: number; minutes: number; dark?: boolean }) {
  const I = kindIcon(kind, hasCode);
  return (
    <div className="mb-8">
      <p className={`eyebrow flex items-center gap-2 ${dark ? 'text-brand-yellow' : 'text-brand-hyper'}`}>
        <I size={14} /> {kindLabel(kind, hasCode)} {n} of {total} · {minutes} min
      </p>
      <h1 className={`text-[28px] sm:text-[38px] font-black leading-[1.1] tracking-tight mt-3 ${dark ? 'text-white' : 'text-navy'}`}>{title.replace(/^\d+\.\d+\s+/, '')}</h1>
      {/^\d+\.\d+\s/.test(title) && <p className={`font-mono text-[13px] mt-2 ${dark ? 'text-[#9aa0c4]' : 'text-ink-mute'}`}>Section {title.match(/^\d+\.\d+/)![0]}</p>}
    </div>
  );
}

function NextCard({ title, onNext, done, dark, quiz }: { title: string; onNext: () => void; done: boolean; dark?: boolean; quiz?: boolean }) {
  return (
    <div className={`mt-14 rounded-xl border-2 p-5 flex flex-wrap items-center gap-4 ${dark ? 'border-navy-500 bg-navy' : 'border-navy bg-brand-paleblue'}`}>
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-[#5c9a00] text-white' : dark ? 'bg-navy-600 text-brand-yellow' : 'bg-navy text-brand-yellow'}`}>
        <Check size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] ${dark ? 'text-[#9aa0c4]' : 'text-ink-mute'}`}>{done ? 'Completed · up next' : quiz ? 'Up next after the quiz' : 'Finished reading? Up next'}</p>
        <p className={`font-extrabold truncate ${dark ? 'text-white' : ''}`}>{title}</p>
      </div>
      <button onClick={onNext} className="btn-yellow w-full sm:w-auto">
        {done || quiz ? 'Continue' : 'Mark complete & continue'} <ArrowRight size={16} />
      </button>
    </div>
  );
}
