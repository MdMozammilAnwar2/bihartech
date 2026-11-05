import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { CourseMeta, Route } from './types';
import { loadCatalog } from './data';
import { SiteFooter, SiteHeader, useHotkey } from './components/Chrome';
import SearchPalette from './components/SearchPalette';
import Home from './pages/Home';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';

function parse(hash: string): Route & { anchor?: string } {
  const h = hash.replace(/^#/, '');
  let m = h.match(/^(class-\d+)-(\d+)-(\d+)$/);
  if (m) return { name: 'lesson', slug: m[1], chapter: +m[2], lesson: +m[3] };
  m = h.match(/^(class-\d+)$/);
  if (m) return { name: 'course', slug: m[1] };
  return { name: 'home', anchor: h || undefined };
}

export default function App() {
  const [route, setRoute] = useState(() => parse(location.hash));
  const [catalog, setCatalog] = useState<CourseMeta[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener('hashchange', on);
    loadCatalog().then(setCatalog, (e) => setErr(String(e.message || e)));
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (route.name === 'home') {
      document.title = 'BiharTech Learn — Computer Science with C++';
      if (route.anchor === 'catalog') setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 50);
      else window.scrollTo({ top: 0 });
    } else if (route.name === 'course') {
      window.scrollTo({ top: 0 });
    }
  }, [route]);

  const openSearch = useCallback(() => setSearch(true), []);
  useHotkey('k', openSearch);

  if (err)
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <p className="font-bold">{err}. Reload the page to try again.</p>
      </div>
    );
  if (!catalog)
    return (
      <div className="h-full flex items-center justify-center gap-2 text-ink-mute">
        <Loader2 className="animate-spin" size={18} /> Loading courses…
      </div>
    );

  const course = 'slug' in route ? catalog.find((c) => c.slug === route.slug) : undefined;

  return (
    <>
      {route.name === 'lesson' && course ? (
        <LessonPage course={course} chapterN={route.chapter} lessonN={route.lesson} onSearch={openSearch} />
      ) : (
        <div className="min-h-full flex flex-col">
          <SiteHeader onSearch={openSearch} />
          <div className="flex-1">{route.name === 'course' && course ? <CoursePage course={course} /> : <Home catalog={catalog} />}</div>
          <SiteFooter />
        </div>
      )}
      {search && <SearchPalette catalog={catalog} onClose={() => setSearch(false)} />}
    </>
  );
}
