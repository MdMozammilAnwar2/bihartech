import { useEffect, useState } from 'react';
import { Search, Menu, X } from 'lucide-react';

export const BRAND = 'BiharTech Learn';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="#home" className="flex items-center gap-2.5 shrink-0" aria-label={`${BRAND} home`}>
      <span className="w-8 h-8 rounded-[6px] bg-brand-yellow border-2 border-navy flex items-center justify-center font-mono font-black text-navy text-[13px]">{'{}'}</span>
      <span className={`font-extrabold text-[19px] tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
        BiharTech<span className={light ? 'text-brand-yellow' : 'text-brand-hyper'}>Learn</span>
      </span>
    </a>
  );
}

export function SiteHeader({ onSearch, dark = false }: { onSearch: () => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const link = `font-semibold text-[15px] px-3 py-2 rounded hover:${dark ? 'bg-white/10' : 'bg-[#f0f0f4]'}`;
  return (
    <header className={`sticky top-0 z-40 ${dark ? 'bg-navy text-white border-b border-navy-600' : 'bg-white text-navy border-b border-[#e2e3ea]'}`}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Logo light={dark} />
        <nav className="hidden lg:flex items-center gap-1 ml-2 xl:ml-6" aria-label="Main">
          <a className={link} href="#catalog">
            Catalog
          </a>
          <a className={link} href="#class-9">
            Class 9
          </a>
          <a className={link} href="#class-10">
            Class 10
          </a>
          <a className={link} href="#class-11">
            Class 11
          </a>
          <a className={link} href="#class-12">
            Class 12
          </a>
        </nav>
        <button
          onClick={onSearch}
          className={`ml-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm w-[44px] shrink-0 sm:w-[240px] lg:w-[44px] xl:w-[240px] ${dark ? 'border-navy-500 text-[#c9cce0] hover:border-white' : 'border-[#c9ccd8] text-ink-mute hover:border-navy'}`}
          aria-label="Search lessons"
        >
          <Search size={16} className="shrink-0" />
          <span className="hidden sm:inline lg:hidden xl:inline">Search 700+ lessons</span>
          <kbd className="hidden sm:inline lg:hidden xl:inline ml-auto font-mono text-[11px] opacity-70">Ctrl K</kbd>
        </button>
        <a href="#catalog" className="btn-yellow hidden sm:inline-flex py-2">
          Start learning
        </a>
        <button className="lg:hidden p-2 shrink-0" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className={`lg:hidden px-4 pb-4 flex flex-col ${dark ? 'bg-navy' : 'bg-white'}`} onClick={() => setOpen(false)}>
          {['catalog', 'class-9', 'class-10', 'class-11', 'class-12'].map((s) => (
            <a key={s} href={`#${s}`} className="py-2.5 font-semibold border-b border-current/10 capitalize">
              {s.replace('-', ' ')}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-[#c9cce0] mt-16 md:mt-24">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 md:py-14 grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed">
            Interactive computer science for Classes 9 to 12, built from the books by Er M M Anwar (Bihar Tech Publications, Patna). Read, run real C++ in your browser, and test yourself.
          </p>
        </div>
        <div>
          <p className="eyebrow text-brand-yellow mb-3">Courses</p>
          <ul className="space-y-2 text-[15px]">
            <li>
              <a className="hover:text-white" href="#class-9">Class 9 · Foundation with C++</a>
            </li>
            <li>
              <a className="hover:text-white" href="#class-10">Class 10 · Foundation with C++</a>
            </li>
            <li>
              <a className="hover:text-white" href="#class-11">Class 11 · Computer Science with C++</a>
            </li>
            <li>
              <a className="hover:text-white" href="#class-12">Class 12 · Computer Science with C++</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-brand-yellow mb-3">About</p>
          <p className="text-[15px] leading-relaxed">
            Progress is saved in this browser. Programs compile with Clang running inside the page, so no account or internet compiler is needed after the first load.
          </p>
        </div>
      </div>
      <div className="border-t border-navy-600">
        <p className="max-w-[1240px] mx-auto px-4 sm:px-6 py-5 text-[13px]">© 2026 Er M M Anwar · Bihar Tech Publications, Patna. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function useHotkey(key: string, fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [key, fn]);
}
