import { useMemo, useState } from 'react';
import { Check, X, RotateCcw, Trophy, ArrowRight } from 'lucide-react';
import type { QuizQ } from '../types';
import { highlightCpp } from './highlight';

type Props = { questions: QuizQ[]; onFinish: (score: number, total: number) => void; best?: { best: number; total: number } };

export default function Quiz({ questions, onFinish, best }: Props) {
  const qs = useMemo(() => questions.filter((q) => q.answer !== undefined), [questions]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() => qs.map(() => null));
  const [done, setDone] = useState(false);

  const score = answers.filter((a, k) => a !== null && a === qs[k].answer).length;

  if (!qs.length) return <p>No questions in this quiz.</p>;

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const msg = pct >= 90 ? 'Outstanding! Board-exam ready.' : pct >= 70 ? 'Great work — revise the ones you missed.' : pct >= 40 ? 'Good effort. Re-read the lessons and try again.' : 'Keep going — go back through the chapter and retry.';
    return (
      <div className="pop">
        <div className="rounded-xl bg-navy text-white p-5 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 grid-dots opacity-60" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-28 h-28 rounded-full border-[6px] border-brand-yellow flex flex-col items-center justify-center shrink-0">
              <span className="text-3xl font-black">{score}</span>
              <span className="text-xs text-[#c9cce0]">of {qs.length}</span>
            </div>
            <div>
              <p className="eyebrow text-brand-yellow flex items-center gap-2">
                <Trophy size={14} /> Quiz complete · {pct}%
              </p>
              <h3 className="text-2xl font-extrabold mt-1">{msg}</h3>
              {best && <p className="text-sm text-[#c9cce0] mt-1">Your best so far: {Math.max(best.best, score)} / {qs.length}</p>}
            </div>
          </div>
        </div>
        <h4 className="font-bold text-lg mt-8 mb-3">Review your answers</h4>
        <ol className="space-y-3">
          {qs.map((q, k) => {
            const ok = answers[k] === q.answer;
            return (
              <li key={k} className="flex gap-3 rounded-lg border border-[#e2e3ea] p-4">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-[#e6f7d1] text-[#2f6b00]' : 'bg-[#ffe3e0] text-[#b3150c]'}`}>{ok ? <Check size={15} /> : <X size={15} />}</span>
                <div className="text-[15px] min-w-0">
                  <p className="font-semibold">
                    {k + 1}. {q.q}
                  </p>
                  <p className="mt-1 text-ink-soft">
                    Correct answer: <strong className="text-ink">({'abcd'[q.answer!]}) {q.options[q.answer!]}</strong>
                    {!ok && answers[k] !== null && (
                      <span className="text-[#b3150c]">
                        {' '}
                        · you chose ({'abcd'[answers[k]!]}) {q.options[answers[k]!]}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <button
          className="btn-outline mt-6"
          onClick={() => {
            setI(0);
            setPicked(null);
            setChecked(false);
            setAnswers(qs.map(() => null));
            setDone(false);
          }}
        >
          <RotateCcw size={16} /> Retake quiz
        </button>
      </div>
    );
  }

  const q = qs[i];
  const correct = checked && picked === q.answer;
  const check = () => {
    if (picked === null) return;
    setChecked(true);
    const a = [...answers];
    a[i] = picked;
    setAnswers(a);
  };
  const next = () => {
    if (i + 1 >= qs.length) {
      setDone(true);
      const s = answers.filter((a, k) => a !== null && a === qs[k].answer).length;
      onFinish(s, qs.length);
      return;
    }
    setI(i + 1);
    setPicked(null);
    setChecked(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="eyebrow text-ink-mute whitespace-nowrap">
          Question {i + 1} of {qs.length}
        </span>
        <div className="flex-1 flex gap-1">
          {qs.map((_, k) => {
            const a = answers[k];
            const c = a === null ? (k === i ? '#10162F' : '#e2e3ea') : a === qs[k].answer ? '#5c9a00' : '#E91C11';
            return <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />;
          })}
        </div>
        <span className="text-sm font-bold tabular-nums whitespace-nowrap">{score} ✓</span>
      </div>
      <h3 className="text-[19px] sm:text-[22px] font-extrabold leading-snug" key={i}>
        {q.q}
      </h3>
      {q.code && <pre className="mt-4 bg-navy text-[#e6e7ef] rounded-md px-4 py-3 font-mono text-[13.5px] overflow-x-auto" dangerouslySetInnerHTML={{ __html: highlightCpp(q.code) }} />}
      <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Answer options">
        {q.options.map((o, k) => {
          const isPicked = picked === k;
          const isAnswer = checked && k === q.answer;
          const isWrong = checked && isPicked && k !== q.answer;
          return (
            <button
              key={k}
              role="radio"
              aria-checked={isPicked}
              disabled={checked}
              onClick={() => setPicked(k)}
              className={`text-left flex items-start gap-3.5 rounded-lg border-2 px-4 py-3.5 transition-all ${
                isAnswer
                  ? 'border-[#5c9a00] bg-[#f0fadf]'
                  : isWrong
                    ? 'border-[#E91C11] bg-[#fff1ef]'
                    : isPicked
                      ? 'border-brand-hyper bg-[#f1edff] shadow-[3px_3px_0_0_#3A10E5]'
                      : 'border-[#d6d8e2] hover:border-navy bg-white'
              }`}
            >
              <span
                className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center font-mono text-[13px] font-bold ${
                  isAnswer ? 'bg-[#5c9a00] border-[#5c9a00] text-white' : isWrong ? 'bg-[#E91C11] border-[#E91C11] text-white' : isPicked ? 'bg-brand-hyper border-brand-hyper text-white' : 'border-[#b9bccb] text-ink-soft'
                }`}
              >
                {isAnswer ? <Check size={15} /> : isWrong ? <X size={15} /> : 'abcd'[k]}
              </span>
              <span className="pt-0.5 text-[16px] min-w-0">{o}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4 min-h-[48px]">
        {!checked ? (
          <button className="btn-yellow disabled:opacity-40 disabled:pointer-events-none" disabled={picked === null} onClick={check}>
            Check answer
          </button>
        ) : (
          <>
            <div className={`flex items-center gap-2 font-bold pop ${correct ? 'text-[#3d7000]' : 'text-[#b3150c]'}`}>
              {correct ? <Check size={20} /> : <X size={20} />}
              {correct ? 'Correct!' : `Not quite. The answer is (${'abcd'[q.answer!]}) ${q.options[q.answer!]}.`}
            </div>
            <button className="btn-yellow ml-auto" onClick={next}>
              {i + 1 >= qs.length ? 'See results' : 'Next question'} <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
