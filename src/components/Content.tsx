import { useState } from 'react';
import { Check, Copy, Lightbulb, BookMarked, AlertTriangle, Sparkles, Info, Play, Terminal } from 'lucide-react';
import type { Block } from '../types';
import { asset } from '../data';
import { highlightCpp } from './highlight';

type Props = {
  blocks: Block[];
  dark?: boolean;
  onOpenCode?: (code: string) => void;
};

export function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export default function Content({ blocks, dark, onOpenCode }: Props) {
  return (
    <div className={`prose-l ${dark ? 'prose-dark' : ''}`}>
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} dark={dark} onOpenCode={onOpenCode} next={blocks[i + 1]} />
      ))}
    </div>
  );
}

function BlockView({ b, dark, onOpenCode, next }: { b: Block; dark?: boolean; onOpenCode?: (c: string) => void; next?: Block }) {
  switch (b.t) {
    case 'h1':
    case 'h2':
      return <h2 id={slugify(b.text)}>{b.text}</h2>;
    case 'h3':
      return <h3 id={slugify(b.text)}>{b.text}</h3>;
    case 'h4':
      return <h4>{b.text}</h4>;
    case 'p':
      return <p dangerouslySetInnerHTML={{ __html: b.html }} />;
    case 'caption':
      return <p className="text-sm opacity-70" dangerouslySetInnerHTML={{ __html: b.html }} />;
    case 'list':
      return <ListView b={b} dark={dark} onOpenCode={onOpenCode} />;
    case 'table':
      return (
        <div className={`overflow-x-auto scroll-thin rounded-md border ${dark ? 'border-navy-600' : 'border-[#e2e3ea]'}`} style={{ maxWidth: '100%' }}>
          <table className="tbl">
            <thead>
              <tr>
                {b.rows[0].map((c, i) => (
                  <th key={i} dangerouslySetInnerHTML={{ __html: c }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.slice(1).map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} dangerouslySetInnerHTML={{ __html: c }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code':
      return <CodeBlock code={b.code} dark={dark} onOpenCode={onOpenCode} hasOutput={next?.t === 'output'} />;
    case 'output':
      return (
        <div className="rounded-md overflow-hidden border border-[#2c345c] !mt-0 rounded-t-none border-t-0">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0b1024] text-[#9aa0c4] eyebrow !text-[11px]">
            <Terminal size={13} /> Output
          </div>
          <pre className="bg-[#0b1024] text-[#AEE938] px-4 pb-3.5 pt-1 font-mono text-[13.5px] leading-relaxed overflow-x-auto scroll-thin whitespace-pre">{b.code}</pre>
        </div>
      );
    case 'img':
      return (
        <figure className="!mt-6">
          <div className="rounded-lg bg-white p-3 border border-[#e2e3ea]">
            <img src={asset(b.src)} width={b.w} height={b.h} alt={b.caption || 'Figure from the book'} loading="lazy" className="w-full h-auto" />
          </div>
          {b.caption && <figcaption className={`mt-2 text-sm ${dark ? 'text-[#9aa0c4]' : 'text-ink-mute'}`}>{b.caption}</figcaption>}
        </figure>
      );
    case 'callout':
      return <Callout b={b} dark={dark} onOpenCode={onOpenCode} />;
    default:
      return null;
  }
}

function ListView({ b, dark, onOpenCode }: { b: Extract<Block, { t: 'list' }>; dark?: boolean; onOpenCode?: (c: string) => void }) {
  const items = b.items.map((it, i) => (
    <li key={i}>
      <span dangerouslySetInnerHTML={{ __html: it.html }} />
      {it.sub?.map((s, j) => <BlockView key={j} b={s} dark={dark} onOpenCode={onOpenCode} />)}
    </li>
  ));
  return b.ordered ? <ol start={b.start}>{items}</ol> : <ul>{items}</ul>;
}

const CALLOUT = {
  tip: { label: 'Did you know?', icon: Lightbulb, bg: '#FFF0E5', bar: '#FF8C00', dbg: '#2b2440' },
  def: { label: 'Definition', icon: BookMarked, bg: '#EEF0FF', bar: '#3A10E5', dbg: '#1d2050' },
  warn: { label: 'Watch out', icon: AlertTriangle, bg: '#FFF4F3', bar: '#E91C11', dbg: '#33192a' },
  example: { label: 'Example', icon: Sparkles, bg: '#F2FBE3', bar: '#5c8a00', dbg: '#1b2a26' },
  note: { label: 'Note', icon: Info, bg: '#F5FCFF', bar: '#10162F', dbg: '#1a2246' },
} as const;

function Callout({ b, dark, onOpenCode }: { b: Extract<Block, { t: 'callout' }>; dark?: boolean; onOpenCode?: (c: string) => void }) {
  const c = CALLOUT[b.kind] || CALLOUT.note;
  const Icon = c.icon;
  return (
    <aside className="rounded-md px-3.5 sm:px-5 py-4 flex gap-2.5 sm:gap-3.5 !mt-6" style={{ background: dark ? c.dbg : c.bg, borderLeft: `5px solid ${dark && b.kind === 'note' ? '#FFD300' : c.bar}` }}>
      <Icon size={20} className="shrink-0 mt-1" style={{ color: dark ? '#FFD300' : c.bar }} />
      <div className="min-w-0 [&>*+*]:mt-2 text-[16px]">
        {b.blocks.map((x, i) => (
          <BlockView key={i} b={x} dark={dark} onOpenCode={onOpenCode} />
        ))}
      </div>
    </aside>
  );
}

function CodeBlock({ code, dark, onOpenCode, hasOutput }: { code: string; dark?: boolean; onOpenCode?: (c: string) => void; hasOutput?: boolean }) {
  const [copied, setCopied] = useState(false);
  const runnable = /\bint\s+main\s*\(/.test(code);
  const fname = (code.match(/\b([\w-]+\.(cpp|h|sql|txt|csv))\b/) || [])[1] || (/^\s*(SELECT|CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|SHOW|USE|DESCRIBE|DESC)\b/im.test(code) && !/[{};]\s*$/m.test(code.replace(/;\s*(--.*)?$/gm, '')) ? 'query.sql' : runnable ? 'main.cpp' : 'snippet.cpp');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard refused */
    }
  };
  return (
    <div className={`rounded-md overflow-hidden border border-[#2c345c] !mt-5 ${hasOutput ? 'rounded-b-none' : ''}`}>
      <div className="flex items-center justify-between gap-2 bg-[#1C2448] px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0 font-mono text-[12px] text-[#c9cce0]">
          <span className="hidden min-[400px]:flex gap-1 shrink-0">
            <i className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] inline-block" />
            <i className="w-2.5 h-2.5 rounded-full bg-[#febc2e] inline-block" />
            <i className="w-2.5 h-2.5 rounded-full bg-[#28c840] inline-block" />
          </span>
          <span className="truncate">{fname}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={copy} className="text-[#c9cce0] hover:text-white hover:bg-white/10 rounded px-2 py-1 text-xs font-semibold flex items-center gap-1" aria-label="Copy code">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
          {runnable && onOpenCode && (
            <button onClick={() => onOpenCode(code)} className="bg-brand-yellow text-navy rounded-[3px] px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:brightness-95">
              <Play size={12} fill="currentColor" /> Try it
            </button>
          )}
        </div>
      </div>
      <pre
        className="bg-navy text-[#e6e7ef] px-4 py-3.5 font-mono text-[13.5px] leading-relaxed overflow-x-auto scroll-thin whitespace-pre"
        dangerouslySetInnerHTML={{ __html: highlightCpp(code) }}
      />
      {dark ? null : null}
    </div>
  );
}
