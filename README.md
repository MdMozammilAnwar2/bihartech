# BiharTech Learn — Computer Science with C++ (Class 9–12)

An interactive, Codecademy-style learning site built from the four textbooks by Er M M Anwar
(Bihar Tech Publications, Patna).

## What's inside

- **4 courses · 55 chapters · ~680 lessons**, converted from the books: text, tables, diagrams,
  "Did you know?" boxes, workshops, summaries and practice questions.
- **885 quiz questions** with the book's answer keys, one question at a time with instant feedback,
  a results screen and best-score tracking.
- **Real C++ in the browser.** Every program with `main()` opens in a CodeMirror editor and is
  compiled by Clang 22 (WebAssembly, `@live-codes/clang-wasm`) inside a Web Worker. No server.
  Output is compared with the book's printed output ("Matches the book").
- Progress, quiz scores and edited code are saved in the browser (localStorage).
- Search across all lessons (Ctrl/Cmd + K), syllabus drawer, mobile layout with Learn / Code tabs.

## Tech stack

React 18 + TypeScript + Vite 5 + Tailwind CSS 3 · CodeMirror 6 · lucide-react ·
Clang/LLD compiled to WebAssembly · Python + PyMuPDF for the PDF → JSON conversion.

## Project layout

```
tools/convert.py        PDF → JSON converter (headings, lists, tables, code, outputs, figures, quizzes)
public/data/            generated course data: catalog.json, <course>/chN.json, img/*.webp
public/clang/           compiler runtime (clang.wasm, lld.wasm, sysroot) — ~28 MB, loaded on first Run
public/cpp-worker.js    Web Worker that compiles and runs programs
src/pages/              Home (catalog), CoursePage (syllabus), LessonPage (workspace)
src/components/         Content renderer, CodePanel, CodeEditor, Quiz, SearchPalette
```

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ — upload anywhere (Netlify, Vercel, Hostinger, S3…)
```

To regenerate the course data after editing the books:

```bash
pip install pymupdf pillow
python3 tools/convert.py public/data      # reads the PDFs listed in BOOKS at the top of the script
```

To refresh the compiler runtime:

```bash
npx --package @live-codes/clang-wasm clang-wasm-copy-assets public/clang
cp node_modules/@live-codes/clang-wasm/dist/clang-wasm.global.js public/clang/
```

Routes use the URL hash: `#class-9` (course), `#class-9-10-5` (Class 9, chapter 10, lesson 5).
