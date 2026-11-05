export type ListItem = { html: string; sub?: Block[] };

export type Block =
  | { t: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { t: 'p'; html: string }
  | { t: 'caption'; html: string }
  | { t: 'list'; ordered: boolean; start?: number; items: ListItem[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'code'; code: string }
  | { t: 'output'; code: string }
  | { t: 'img'; src: string; w: number; h: number; caption?: string }
  | { t: 'callout'; kind: 'tip' | 'def' | 'warn' | 'example' | 'note'; blocks: Block[] };

export type QuizQ = { n: number; q: string; options: string[]; answer?: number; code?: string };

export type LessonKind = 'intro' | 'lesson' | 'workshop' | 'summary' | 'quiz' | 'practice';

export type Lesson = {
  id: string;
  title: string;
  kind: LessonKind;
  minutes: number;
  hasCode: boolean;
  blocks: Block[];
  quiz?: QuizQ[];
};

export type LessonMeta = { id: string; title: string; kind: LessonKind; minutes: number; hasCode: boolean; quiz: number };

export type Chapter = { n: number; title: string; part: string | null; lessons: Lesson[] };
export type ChapterMeta = { n: number; title: string; part: string | null; lessons: LessonMeta[] };

export type CourseMeta = {
  slug: string;
  title: string;
  chapters: ChapterMeta[];
  stats: { quiz: number; answered: number };
  images: number;
};

export type Route =
  | { name: 'home' }
  | { name: 'course'; slug: string }
  | { name: 'lesson'; slug: string; chapter: number; lesson: number };

export type Program = { title: string; code: string; expected?: string; input?: string };
