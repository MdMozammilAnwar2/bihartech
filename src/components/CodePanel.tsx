import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Square, CheckCircle2, XCircle, Keyboard, ChevronDown, Loader2, BookOpen } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { runner, useRunner, type RunResult } from '../runner';
import { progress } from '../progress';
import { fileNameOf } from '../data';
import type { Program } from '../types';

type Props = { programs: Program[]; active: number; setActive: (i: number) => void; storeKey: string };

const norm = (s: string) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

export default function CodePanel({ programs, active, setActive, storeKey }: Props) {
  const prog = programs[active];
  const key = `${storeKey}#${active}`;
  const [code, setCode] = useState(() => progress.get().code[key] ?? prog.code);
  const [stdin, setStdin] = useState(prog.input ?? '');
  const [result, setResult] = useState<RunResult | null>(null);
  const [stdinUsed, setStdinUsed] = useState('');
  const [view, setView] = useState<'output' | 'book'>(prog.expected ? 'book' : 'output');
  const [menu, setMenu] = useState(false);
  const st = useRunner();
  const unavailable = st.phase === 'unavailable';
  const busy = st.phase === 'loading' || st.phase === 'compiling' || st.phase === 'running';
  const needsInput = /\bcin\s*>>|getline\s*\(\s*cin/.test(code);

  useEffect(() => {
    setCode(progress.get().code[key] ?? prog.code);
    setResult(null);
    setStdin(prog.input ?? '');
    setView(prog.expected && runner.get().phase === 'unavailable' ? 'book' : 'output');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    runner.warmup();
  }, []);

  useEffect(() => {
    if (unavailable && prog.expected) setView('book');
  }, [unavailable, prog.expected]);

  const onChange = (v: string) => {
    setCode(v);
    if (v === prog.code) progress.clearCode(key);
    else progress.saveCode(key, v);
  };

  const run = async () => {
    if (busy || unavailable) return;
    setView('output');
    setResult(null);
    setStdinUsed(stdin);
    const r = await runner.run(code, stdin);
    setResult(r);
    if (prog.expected && r.errors.some((e) => /exceptions disabled|file not found/.test(e))) setView('book');
  };

  const reset = () => {
    progress.clearCode(key);
    setCode(prog.code);
    setResult(null);
  };

  const matches = useMemo(() => {
    if (!result || !prog.expected || result.errors.length || result.exitCode === null) return null;
    const a = norm(result.output);
    const b = norm(prog.expected);
    if (a === b) return true;
    if (stdinUsed) {
      // the book's sample run shows what the user typed; the terminal does not echo it
      let e = prog.expected;
      let pos = 0;
      for (const v of stdinUsed.split(/\s+/).filter(Boolean)) {
        const i = e.indexOf(v, pos);
        if (i < 0) continue;
        e = e.slice(0, i) + e.slice(i + v.length);
        pos = i;
      }
      if (e.replace(/\s+/g, '') === result.output.replace(/\s+/g, '')) return true;
    }
    // programs that read input echo prompts differently; compare lines that don't depend on input
    return null;
  }, [result, prog.expected, stdinUsed]);

  const statusText =
    st.phase === 'loading'
      ? `Loading the C++ compiler… ${Math.round(st.progress * 100)}%`
      : st.phase === 'compiling'
        ? 'Compiling and running…'
        : st.phase === 'ready'
          ? 'Compiler ready · Clang 22, C++17'
          : 'Compiler starts on first run';

  return (
    <div className="h-full flex flex-col bg-[#0E1430] text-white min-h-0">
      {/* tabs / program picker */}
      <div className="flex items-center justify-between gap-2 border-b border-navy-600 bg-navy pl-2 pr-2 h-11 shrink-0">
        <div className="relative min-w-0">
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 h-11 px-3 border-b-2 border-brand-yellow font-mono text-[13px] text-white min-w-0"
            aria-haspopup="listbox"
            aria-expanded={menu}
          >
            <span className="truncate max-w-[240px]">{fileNameOf(prog.code, active + 1)}</span>
            {programs.length > 1 && (
              <>
                <span className="text-[#9aa0c4] text-[11px] font-sans font-semibold">
                  {active + 1}/{programs.length}
                </span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
          {menu && programs.length > 1 && (
            <ul role="listbox" className="absolute z-30 left-0 top-11 w-[min(440px,80vw)] bg-[#1C2448] border border-navy-500 rounded-md shadow-2xl py-1 max-h-80 overflow-auto scroll-thin">
              {programs.map((p, i) => (
                <li key={i}>
                  <button
                    role="option"
                    aria-selected={i === active}
                    onClick={() => {
                      setActive(i);
                      setMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[13px] hover:bg-white/10 flex gap-2 ${i === active ? 'text-brand-yellow' : 'text-[#e6e7ef]'}`}
                  >
                    <span className="font-mono text-[#9aa0c4] w-5 shrink-0">{i + 1}</span>
                    <span className="truncate">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={reset} className="text-[#c9cce0] hover:text-white hover:bg-white/10 rounded px-2 py-1.5 text-xs font-semibold flex items-center gap-1.5" title="Restore the book's version">
            <RotateCcw size={14} /> <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* editor */}
      <div className="flex-1 min-h-[180px] relative">
        <div className="absolute inset-0">
          <CodeEditor value={code} onChange={onChange} onRun={run} />
        </div>
      </div>

      {/* run bar */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-navy border-t border-navy-600 shrink-0">
        {unavailable ? (
          <span className="text-[12.5px] text-[#ffd27a] leading-snug">
            Preview mode: this copy of the site doesn’t include the C++ compiler files, so Run is off. You can still edit the code and see the book’s output. The full site (with the compiler) runs every program.
          </span>
        ) : busy ? (
          <button onClick={() => runner.stop()} className="btn bg-white text-navy py-2 px-4 border-2 border-white">
            <Square size={14} fill="currentColor" /> Stop
          </button>
        ) : (
          <button onClick={run} className="btn-yellow py-2 px-5">
            <Play size={15} fill="currentColor" /> Run
          </button>
        )}
        <span className={`text-[12px] text-[#9aa0c4] flex items-center gap-1.5 ${unavailable ? 'hidden' : ''}`}>
          {busy && <Loader2 size={13} className="animate-spin" />}
          {statusText}
        </span>
        <span className={`ml-auto text-[11px] text-[#6c739c] font-mono ${unavailable ? 'hidden' : 'hidden md:inline'}`}>Ctrl + Enter to run</span>
      </div>
      {st.phase === 'loading' && (
        <div className="h-1 bg-navy-700 shrink-0">
          <div className="h-full bg-brand-yellow transition-all" style={{ width: `${Math.max(4, st.progress * 100)}%` }} />
        </div>
      )}

      {/* stdin */}
      {needsInput && !unavailable && (
        <div className="px-3 py-2 bg-[#141b3b] border-t border-navy-600 shrink-0">
          <label htmlFor="stdin" className="flex items-center gap-1.5 text-[12px] font-semibold text-[#c9cce0] mb-1.5">
            <Keyboard size={14} className="text-brand-yellow" /> This program reads input. {prog.input ? 'Pre-filled with the values from the book’s sample run — change them and run again.' : 'Type the values here before you run it.'}
          </label>
          <textarea
            id="stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            placeholder="e.g.  45 38   (separate values with spaces or new lines)"
            className="w-full bg-[#0b1024] border border-navy-500 rounded px-2.5 py-1.5 font-mono text-[13px] text-white placeholder:text-[#5b6390] focus:border-brand-yellow outline-none resize-y"
          />
        </div>
      )}

      {/* output */}
      <div className="h-[34%] min-h-[150px] flex flex-col border-t border-navy-600 bg-[#0b1024] shrink-0">
        <div className="flex items-center gap-1 px-2 h-9 border-b border-navy-700 shrink-0">
          <button onClick={() => setView('output')} className={`px-3 h-9 text-[12px] font-bold border-b-2 ${view === 'output' ? 'border-brand-yellow text-white' : 'border-transparent text-[#9aa0c4]'}`}>
            Terminal
          </button>
          {prog.expected && (
            <button onClick={() => setView('book')} className={`px-3 h-9 text-[12px] font-bold border-b-2 flex items-center gap-1.5 ${view === 'book' ? 'border-brand-yellow text-white' : 'border-transparent text-[#9aa0c4]'}`}>
              <BookOpen size={13} /> Book's output
            </button>
          )}
          {matches === true && view === 'output' && (
            <span className="ml-auto flex items-center gap-1.5 text-[12px] font-bold text-brand-mint pr-2 pop">
              <CheckCircle2 size={15} /> Matches the book
            </span>
          )}
        </div>
        <pre className="flex-1 overflow-auto scroll-thin px-4 py-3 font-mono text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {view === 'book' ? (
            <span className="text-[#c9cce0]">{prog.expected}</span>
          ) : result ? (
            <TerminalView r={result} />
          ) : (
            <span className="text-[#5b6390]">{busy ? '' : 'Press Run to compile and run this program. Output appears here.'}</span>
          )}
        </pre>
      </div>
    </div>
  );
}

function TerminalView({ r }: { r: RunResult }) {
  if (r.timedOut)
    return (
      <span className="text-[#ff8a80]">
        <XCircle size={14} className="inline -mt-0.5 mr-1" />
        The program took too long and was stopped. Check for a loop that never ends, or a program waiting for more input.
      </span>
    );
  if (r.failure) return <span className="text-[#ff8a80]">{r.failure}</span>;
  if (r.errors.some((e) => /exceptions disabled/.test(e)))
    return (
      <span className="text-[#ffd27a]">
        This program uses try / throw / catch. The in-browser compiler is built without exception support, so it cannot run here. Open the “Book's output” tab to see what it prints, and run it in Code::Blocks, Dev-C++ or g++ on your computer.
      </span>
    );
  if (r.errors.some((e) => /mysql|cppconn/i.test(e)))
    return (
      <span className="text-[#ffd27a]">
        This program connects to a MySQL server through MySQL Connector/C++, which is not available in the browser. Build it on a computer that has MySQL and the connector installed.
      </span>
    );
  if (r.errors.length)
    return (
      <>
        <span className="text-[#ff8a80] font-bold">Compilation failed</span>
        {'\n'}
        <span className="text-[#ffb4ab]">{r.errors.join('\n')}</span>
      </>
    );
  return (
    <>
      <span className="text-[#e6e7ef]">{r.output || ''}</span>
      {'\n'}
      <span className={r.exitCode === 0 ? 'text-[#6c739c]' : 'text-[#ffb86b]'}>
        {r.output ? '' : '(no output)\n'}— finished with exit code {r.exitCode}
        {r.compileMs ? ` · compiled in ${(r.compileMs / 1000).toFixed(1)}s` : ''}
      </span>
    </>
  );
}
