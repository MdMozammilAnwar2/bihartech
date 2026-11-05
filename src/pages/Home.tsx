import { ArrowRight, Play, CheckCircle2, Code2, BookOpenText, ListChecks, FlaskConical, Clock } from 'lucide-react';
import type { CourseMeta } from '../types';
import { COURSE_INFO, lessonHash } from '../data';
import { useProgress, courseDone } from '../progress';
import { highlightCpp } from '../components/highlight';

const SAMPLE = `// Program 10.1: My first C++ program
#include <iostream>
using namespace std;

int main() {
    cout << "Namaste, Bihar!" << endl;
    cout << "I am learning C++." << endl;
    return 0;
}`;

export default function Home({ catalog }: { catalog: CourseMeta[] }) {
  const st = useProgress();
  const totals = catalog.reduce(
    (a, c) => {
      a.chapters += c.chapters.length;
      for (const ch of c.chapters)
        for (const l of ch.lessons) {
          a.lessons++;
          a.quiz += l.quiz;
          if (l.hasCode) a.code++;
        }
      return a;
    },
    { chapters: 0, lessons: 0, quiz: 0, code: 0 },
  );
  const last = st.last;
  const lastInfo = last ? COURSE_INFO[last.slug] : null;

  return (
    <main>
      {/* HERO */}
      <section className="bg-navy text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-dots" />
        <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6 py-16 md:py-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <p className="eyebrow text-brand-yellow">Class 9 – 12 · BSEB · CBSE · NCERT</p>
            <h1 className="mt-4 text-[44px] sm:text-[58px] leading-[1.02] font-black tracking-tight">
              Learn computer science.
              <br />
              <span className="relative inline-block">
                Write real C++.
                <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 9 Q 75 2 150 7 T 298 5" stroke="#FFD300" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 text-[19px] leading-relaxed text-[#d4d6e6] max-w-[560px]">
              Four complete textbooks turned into hands-on courses. Read a short lesson, run the program right beside it, then check yourself with the chapter quiz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {last && lastInfo ? (
                <a href={lessonHash(last.slug, last.chapter, last.lesson)} className="btn-yellow text-[17px] px-6 py-3">
                  Resume {lastInfo.cls} <ArrowRight size={18} />
                </a>
              ) : (
                <a href={lessonHash('class-9', 10, 5)} className="btn-yellow text-[17px] px-6 py-3">
                  <Play size={16} fill="currentColor" /> Write your first program
                </a>
              )}
              <a href="#catalog" className="btn-ghost-dark text-[17px] px-6 py-3">
                Browse courses
              </a>
            </div>
            <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-[560px]">
              {[
                [totals.chapters, 'chapters'],
                [totals.lessons, 'lessons'],
                [totals.quiz, 'quiz questions'],
                [totals.code, 'coding lessons'],
              ].map(([n, l]) => (
                <div key={l as string}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-[30px] font-black tabular-nums leading-none">{n}</dd>
                  <dd className="text-[13px] text-[#9aa0c4] mt-1.5">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* mock workspace */}
          <div className="relative">
            <div className="absolute -inset-3 bg-brand-hyper rounded-xl rotate-[1.5deg]" aria-hidden />
            <div className="relative rounded-xl overflow-hidden border-2 border-[#2c345c] bg-[#0E1430] shadow-2xl">
              <div className="flex items-center gap-2 px-4 h-10 bg-navy border-b border-navy-600">
                <span className="flex gap-1.5">
                  <i className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <i className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <i className="w-3 h-3 rounded-full bg-[#28c840]" />
                </span>
                <span className="font-mono text-[12px] text-[#c9cce0] ml-3 border-b-2 border-brand-yellow h-10 flex items-center px-2">main.cpp</span>
              </div>
              <pre className="px-5 py-4 font-mono text-[13.5px] leading-[1.75] text-[#e6e7ef] overflow-x-auto" dangerouslySetInnerHTML={{ __html: highlightCpp(SAMPLE) }} />
              <div className="flex items-center gap-3 px-4 py-2.5 bg-navy border-t border-navy-600">
                <span className="btn-yellow py-1.5 px-4 text-sm pointer-events-none">
                  <Play size={13} fill="currentColor" /> Run
                </span>
                <span className="text-[12px] text-[#9aa0c4]">Compiled in 1.8s</span>
                <span className="ml-auto text-[12px] font-bold text-brand-mint flex items-center gap-1">
                  <CheckCircle2 size={14} /> Matches the book
                </span>
              </div>
              <pre className="bg-[#0b1024] px-5 py-3.5 font-mono text-[13.5px] text-[#e6e7ef] leading-relaxed">
                Namaste, Bihar!{'\n'}I am learning C++.{'\n'}
                <span className="text-[#6c739c]">— finished with exit code 0</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* continue */}
      {last && lastInfo && (
        <section className="max-w-[1240px] mx-auto px-4 sm:px-6 -mt-8 relative z-10">
          <a href={lessonHash(last.slug, last.chapter, last.lesson)} className="group flex flex-wrap items-center gap-5 bg-white border-2 border-navy rounded-xl p-5 shadow-hard hover:-translate-y-0.5 transition-transform">
            <span className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg border-2 border-navy" style={{ background: lastInfo.color, color: lastInfo.ink }}>
              {lastInfo.cls.split(' ')[1]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-ink-mute">Continue where you left off · {lastInfo.cls}</p>
              <p className="font-extrabold text-[19px] truncate">{last.title}</p>
            </div>
            <span className="btn-yellow">
              Resume <ArrowRight size={16} />
            </span>
          </a>
        </section>
      )}

      {/* how it works */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-20">
        <p className="eyebrow text-brand-hyper">How every chapter works</p>
        <h2 className="text-[34px] sm:text-[40px] font-black tracking-tight mt-2 max-w-[700px] leading-tight">Read it. Run it. Prove you know it.</h2>
        <div className="mt-10 grid md:grid-cols-4 gap-5">
          {[
            { icon: BookOpenText, t: 'Short lessons', d: 'Each chapter is split into bite-size sections with the book’s diagrams, tables and Indian everyday examples.', c: '#FFF0E5' },
            { icon: Code2, t: 'Run real C++', d: 'Every program opens in an editor beside the lesson. Change it, press Run, and compare your output with the book.', c: '#F5FCFF' },
            { icon: FlaskConical, t: 'Workshops', d: 'Hands-on lab activities to do on a school computer or at home, step by step.', c: '#F2FBE3' },
            { icon: ListChecks, t: 'Chapter quizzes', d: `${totals.quiz} multiple-choice questions with instant feedback, plus 2, 5 and 10-mark practice questions.`, c: '#F7EEFF' },
          ].map(({ icon: I, t, d, c }) => (
            <div key={t} className="rounded-xl border-2 border-navy p-6" style={{ background: c }}>
              <span className="w-11 h-11 rounded-lg bg-navy text-brand-yellow flex items-center justify-center">
                <I size={21} />
              </span>
              <h3 className="font-extrabold text-[19px] mt-4">{t}</h3>
              <p className="mt-2 text-ink-soft leading-relaxed text-[15px]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* catalog */}
      <section id="catalog" className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-24 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-brand-hyper">Course catalog</p>
            <h2 className="text-[34px] sm:text-[40px] font-black tracking-tight mt-2">Pick your class</h2>
          </div>
          <p className="text-ink-soft max-w-[460px]">Start at Class 9 if you have never programmed. Each course stands on its own, so you can also jump straight to your class.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {catalog.map((c) => (
            <CourseCard key={c.slug} c={c} doneCount={courseDone(st, c.slug, c.chapters.flatMap((ch) => ch.lessons.map((l) => l.id)))} />
          ))}
        </div>
      </section>

      {/* path */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-24">
        <div className="rounded-2xl bg-brand-beige border-2 border-navy p-8 md:p-12">
          <p className="eyebrow text-brand-hyper">Career path</p>
          <h2 className="text-[32px] font-black tracking-tight mt-2">From first click to data structures</h2>
          <ol className="mt-10 grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-5 left-[6%] right-[6%] h-[3px] bg-navy" aria-hidden />
            {catalog.map((c, i) => {
              const info = COURSE_INFO[c.slug];
              const firstCode = c.chapters.find((ch) => /C\+\+/.test(ch.title)) || c.chapters.find((ch) => ch.lessons.some((l) => l.hasCode));
              return (
                <li key={c.slug} className="relative">
                  <span className="relative z-10 w-10 h-10 rounded-full border-2 border-navy flex items-center justify-center font-black" style={{ background: info.color, color: info.ink }}>
                    {i + 1}
                  </span>
                  <h3 className="font-extrabold text-[18px] mt-4">{info.cls}</h3>
                  <p className="text-[15px] text-ink-soft mt-1 leading-relaxed">{info.skills.slice(0, 3).join(' · ')}</p>
                  {firstCode && <p className="text-[13px] mt-2 font-mono text-ink-mute">C++ from Ch {firstCode.n}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </main>
  );
}

export function CourseCard({ c, doneCount }: { c: CourseMeta; doneCount: number }) {
  const info = COURSE_INFO[c.slug];
  const lessons = c.chapters.reduce((a, ch) => a + ch.lessons.length, 0);
  const hours = Math.round(c.chapters.reduce((a, ch) => a + ch.lessons.reduce((b, l) => b + l.minutes, 0), 0) / 60);
  const pct = lessons ? Math.round((doneCount / lessons) * 100) : 0;
  return (
    <a href={`#${c.slug}`} className="group flex flex-col rounded-xl border-2 border-navy bg-white overflow-hidden hover:shadow-hard hover:-translate-x-1 hover:-translate-y-1 transition-all">
      <div className="px-6 pt-5 pb-14 relative" style={{ background: info.color, color: info.ink }}>
        <div className="flex items-center justify-between">
          <span className="eyebrow font-bold">{info.level} · Course</span>
          <span className="font-mono text-[12px] opacity-80">{info.board}</span>
        </div>
        <span className="absolute right-5 bottom-[-28px] w-[76px] h-[76px] rounded-full bg-white border-2 border-navy flex flex-col items-center justify-center text-navy">
          <span className="text-[11px] font-bold leading-none">CLASS</span>
          <span className="text-[30px] font-black leading-none">{info.cls.split(' ')[1]}</span>
        </span>
      </div>
      <div className="px-6 pt-5 pb-6 flex-1 flex flex-col">
        <h3 className="text-[23px] font-black leading-tight pr-20">
          {info.short} {!info.short.includes('C++') && <span className="text-ink-mute font-bold">with C++</span>}
        </h3>
        <p className="mt-3 text-ink-soft text-[15px] leading-relaxed">{info.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {info.skills.map((s) => (
            <span key={s} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[#f0f0f4]">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-6 flex items-center gap-4 text-[13px] text-ink-soft font-semibold">
          <span>{c.chapters.length} chapters</span>
          <span>{lessons} lessons</span>
          <span className="flex items-center gap-1">
            <Clock size={13} /> ~{hours} h
          </span>
          <span className="ml-auto flex items-center gap-1 text-navy group-hover:text-brand-hyper">
            {pct > 0 ? 'Continue' : 'Start'} <ArrowRight size={15} />
          </span>
        </div>
        {pct > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-[#eceef4] overflow-hidden">
              <div className="h-full bg-brand-hyper" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[12px] font-bold tabular-nums">{pct}%</span>
          </div>
        )}
      </div>
    </a>
  );
}
