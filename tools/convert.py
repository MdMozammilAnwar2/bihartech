"""Convert the four textbook PDFs into structured lesson JSON for the web app."""
import json, os, re, sys, html, io
import pymupdf as fitz
from PIL import Image

UP = '/mnt/user-data/uploads/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/app/public/data'
BOOKS = [
    ('class-9', 'd186173c-Computer_Science_Foundation_Class_9_with_CPP.pdf'),
    ('class-10', '449e67d0-Computer_Science_Foundation_Class_10_with_CPP.pdf'),
    ('class-11', '80f9ebac-Computer_Science_with_CPP_Class_11.pdf'),
    ('class-12', 'a904a79f-Computer_Science_with_CPP_Class_12.pdf'),
]

CODE_FILL = (0.9725, 0.9725, 0.9647)
INLINE_FILL = (0.9529, 0.9451, 0.9255)
BAR_FILL = (0.8588, 0.851, 0.8314)


def near(c, t, eps=0.01):
    return c is not None and len(c) == 3 and all(abs(a - b) < eps for a, b in zip(c, t))


def esc(s):
    return html.escape(s, quote=False)


def inside(r, x, y, pad=1.5):
    return r[0] - pad <= x <= r[2] + pad and r[1] - pad <= y <= r[3] + pad


def fmt_spans(spans):
    """Spans -> inline HTML with <strong>, <em>, <code>."""
    out = []
    cur = None
    buf = ''
    def flush():
        nonlocal buf
        if not buf:
            return
        if cur == 'code':
            out.append('<code>' + esc(buf.strip()) + '</code>' if buf.strip() else esc(buf))
        elif cur == 'b':
            st = buf.strip()
            if st:
                lead = buf[:len(buf) - len(buf.lstrip())]
                trail = buf[len(buf.rstrip()):]
                out.append(esc(lead) + '<strong>' + esc(st) + '</strong>' + esc(trail))
            else:
                out.append(esc(buf))
        elif cur == 'i':
            out.append('<em>' + esc(buf) + '</em>')
        else:
            out.append(esc(buf))
        buf = ''
    for s in spans:
        f = s['font']
        kind = 'code' if 'Mono' in f else ('b' if ('Semib' in f or 'Bold' in f) else ('i' if (s['flags'] & 2 or 'Ital' in f) else None))
        if kind != cur:
            flush()
            cur = kind
        buf += s['text']
    flush()
    h = ''.join(out)
    h = re.sub(r'</code>(\s*)<code>', r'\1', h) if False else h
    return re.sub(r'\s+', ' ', h).strip()


def span_text(spans):
    return ''.join(s['text'] for s in spans)


def _open_string(line):
    n = 0
    i = 0
    in_s = False
    while i < len(line):
        c = line[i]
        if not in_s and line.startswith('//', i):
            return False
        if c == '\\':
            i += 2
            continue
        if c == '"':
            in_s = not in_s
        i += 1
    return in_s


def unwrap(lines):
    """Re-join code lines the book wrapped at the page edge (continuations start at column 0)."""
    out = []
    for ln in lines:
        if out and ln and '//' in out[-1] and not ln[0].isspace() and re.fullmatch(r"[a-z][A-Za-z0-9 ,.'()\-]*", ln) and not re.match(r'^(int|void|double|bool|char|string|float|long|struct|class|using|template|const|namespace|return)\b', ln) and not re.search(r'\w\s*\(', ln):
            out[-1] = out[-1].rstrip() + ' ' + ln
            continue
        if out and ln and not ln[0].isspace() and out[-1].startswith((' ', '\t')) and not ln.startswith(('#', '}', '{')):
            prev = out[-1]
            if _open_string(prev) or ('//' in prev and not re.match(r'^(int|void|double|bool|char|string|float|long|struct|class|using|template|const|namespace)\b', ln)):
                out[-1] = prev.rstrip() + ' ' + ln
                continue
        out.append(ln)
    return out


class Book:
    def __init__(self, slug, path):
        self.slug = slug
        self.doc = fitz.open(path)
        self.imgdir = os.path.join(OUT, 'img')
        os.makedirs(self.imgdir, exist_ok=True)
        self.imgcount = 0

    # ---------- page -> element stream ----------
    def page_elements(self, pno):
        page = self.doc[pno]
        H = page.rect.height
        draws = page.get_drawings()
        code_boxes, bars, bullets = [], [], []
        for d in draws:
            r = d['rect']
            if near(d.get('fill'), CODE_FILL) and r.width > 200 and r.height > 10:
                code_boxes.append(tuple(r))
            elif r.width < 4 and r.height > 12 and d.get('fill') and not near(d.get('fill'), (0.9098, 0.898, 0.8627)) and d.get('fill')[0] < 0.9:
                bars.append(tuple(r))
            elif d['items'] and d['items'][0][0] == 'c' and r.width < 6 and r.height < 6:
                bullets.append((r.x0, (r.y0 + r.y1) / 2, d.get('fill') is not None))
        # merge overlapping code boxes (some pages draw duplicates)
        code_boxes = sorted(set(code_boxes), key=lambda r: r[1])
        merged = []
        for r in code_boxes:
            if merged and abs(merged[-1][1] - r[1]) < 1 and abs(merged[-1][3] - r[3]) < 1:
                continue
            merged.append(r)
        code_boxes = merged

        els = []
        # tables
        tables = []
        try:
            tf = page.find_tables(strategy='lines_strict')
            tables = list(tf.tables)
        except Exception:
            tables = []
        tab_rects = []
        tdict = page.get_text('dict')
        all_spans = []
        for b in tdict['blocks']:
            if b['type'] != 0:
                continue
            for l in b['lines']:
                for s in l['spans']:
                    if s['text'].strip() == '' and 'Mono' not in s['font']:
                        pass
                    all_spans.append(s)
        for t in tables:
            r = tuple(t.bbox)
            # skip "tables" that are really code boxes
            if any(abs(r[1] - c[1]) < 3 and abs(r[3] - c[3]) < 3 for c in code_boxes):
                continue
            rows = []
            for row in t.rows:
                cells = []
                for cb in row.cells:
                    if cb is None:
                        cells.append('')
                        continue
                    sp = [s for s in all_spans if inside(cb, (s['bbox'][0] + s['bbox'][2]) / 2, (s['bbox'][1] + s['bbox'][3]) / 2, 0)]
                    sp.sort(key=lambda s: (s['bbox'][1] + s['bbox'][3]) / 2)
                    lines_ = []
                    for s in sp:
                        yc = (s['bbox'][1] + s['bbox'][3]) / 2
                        if lines_ and abs(lines_[-1][0] - yc) < 5:
                            lines_[-1][1].append(s)
                        else:
                            lines_.append([yc, [s]])
                    joined = []
                    for k, (_, ls) in enumerate(lines_):
                        ls.sort(key=lambda s: s['bbox'][0])
                        if k and joined and not joined[-1]['text'].endswith(' '):
                            joined.append({'text': ' ', 'font': ls[0]['font'], 'flags': 0})
                        joined.extend(ls)
                    cells.append(fmt_spans(joined))
                rows.append(cells)
            if not rows:
                continue
            tab_rects.append(r)
            els.append({'y': r[1], 'y1': r[3], 't': 'table', 'rows': rows})

        # images
        for info in page.get_image_info(xrefs=True):
            r = info['bbox']
            if r[3] - r[1] < 20 or info['xref'] == 0:
                continue
            try:
                pix = self.doc.extract_image(info['xref'])
                im = Image.open(io.BytesIO(pix['image'])).convert('RGB')
            except Exception:
                continue
            if im.width > 1400:
                im = im.resize((1400, int(im.height * 1400 / im.width)))
            self.imgcount += 1
            name = f'{self.slug}-{self.imgcount}.webp'
            im.save(os.path.join(self.imgdir, name), 'WEBP', quality=82)
            els.append({'y': r[1], 'y1': r[3], 't': 'img', 'src': 'data/img/' + name, 'w': im.width, 'h': im.height})

        # code boxes
        for cb in code_boxes:
            lines = []
            for b in tdict['blocks']:
                if b['type'] != 0:
                    continue
                for l in b['lines']:
                    sp = [s for s in l['spans'] if inside(cb, s['bbox'][0] + 1, (s['bbox'][1] + s['bbox'][3]) / 2)]
                    if sp:
                        lines.append(sp)
            # group by y
            rows = {}
            for sp in lines:
                for s in sp:
                    key = round((s['bbox'][1] + s['bbox'][3]) / 2 / 2.5)
                    rows.setdefault(key, []).append(s)
            txt = []
            left = cb[0] + 8.0
            allx = [s['bbox'][0] for v in rows.values() for s in v]
            if allx:
                left = min(allx)
            prev_key = None
            for key in sorted(rows):
                ss = sorted(rows[key], key=lambda s: s['bbox'][0])
                cw = None
                for s in ss:
                    if len(s['text']) > 0:
                        cw = (s['bbox'][2] - s['bbox'][0]) / max(1, len(s['text']))
                        break
                cw = cw or 6.3
                ln = ''
                for s in ss:
                    col = int(round((s['bbox'][0] - left) / cw))
                    if col > len(ln):
                        ln += ' ' * (col - len(ln))
                    ln += s['text']
                # blank lines between rows
                if prev_key is not None:
                    gap = (key - prev_key) * 2.5
                    lh = 15.5
                    extra = int(round(gap / lh)) - 1
                    for _ in range(max(0, min(extra, 3))):
                        txt.append('')
                prev_key = key
                txt.append(ln.rstrip())
            els.append({'y': cb[1], 'y1': cb[3], 't': 'code', 'code': '\n'.join(unwrap(txt))})

        # text blocks
        def in_region(x, y):
            for r in code_boxes:
                if inside(r, x, y):
                    return True
            for r in tab_rects:
                if inside(r, x, y, 2):
                    return True
            for e in els:
                if e['t'] == 'img' and e['y'] - 1 <= y <= e['y1'] + 1:
                    return True
            return False

        for b in tdict['blocks']:
            if b['type'] != 0:
                continue
            for l in b['lines']:
                sp = [s for s in l['spans'] if s['text'] != '']
                if not sp:
                    continue
                y0 = min(s['bbox'][1] for s in sp)
                y1 = max(s['bbox'][3] for s in sp)
                x0 = min(s['bbox'][0] for s in sp)
                size = max(s['size'] for s in sp)
                if size < 7 or (y0 < 40) or (y0 > H - 30):
                    continue
                if in_region(x0 + 1, (y0 + y1) / 2):
                    continue
                if not span_text(sp).strip():
                    continue
                callout = any(r[0] - 1 <= x0 and inside((r[0], r[1], 600, r[3]), x0, (y0 + y1) / 2) for r in bars)
                bullet = None
                for bx, by, filled in bullets:
                    if abs(by - (y0 + y1) / 2) < 6 and bx < x0 and x0 - bx < 25:
                        bullet = (bx, filled)
                els.append({'y': y0, 'y1': y1, 't': 'line', 'x': x0, 'size': size, 'spans': sp,
                            'serif': 'Serif' in sp[0]['font'], 'callout': callout, 'bullet': bullet})
        els.sort(key=lambda e: (e['y'], e.get('x', 0)))
        return els

    # ---------- element stream -> blocks ----------
    def chapter_blocks(self, p0, p1):
        blocks = []
        last_line = None  # (block, y1, x, page)
        for pno in range(p0, p1):
            els = self.page_elements(pno)
            # merge lines on same y (spans of same visual line split into separate 'lines')
            merged = []
            for e in els:
                if e['t'] == 'line' and merged and merged[-1]['t'] == 'line' and abs(merged[-1]['y'] - e['y']) < 2 and not e['bullet'] and not e['serif'] == (not merged[-1]['serif']):
                    m = merged[-1]
                    m['spans'] = m['spans'] + ([{'text': ' ', 'font': m['spans'][-1]['font'], 'flags': 0, 'size': 12, 'bbox': m['spans'][-1]['bbox']}] if not m['spans'][-1]['text'].endswith(' ') and not e['spans'][0]['text'].startswith(' ') and e['x'] - m['spans'][-1]['bbox'][2] > 2 else []) + e['spans']
                    m['y1'] = max(m['y1'], e['y1'])
                    continue
                merged.append(e)
            for e in merged:
                if e['t'] in ('table', 'img', 'code'):
                    if e['t'] == 'table' and blocks and blocks[-1]['t'] == 'table' and last_line is None \
                            and len(blocks[-1]['rows'][0]) == len(e['rows'][0]):
                        rows = e['rows']
                        if rows[0] == blocks[-1]['rows'][0]:
                            rows = rows[1:]
                        blocks[-1]['rows'].extend(rows)
                    elif e['t'] == 'code':
                        prev = blocks[-1] if blocks else None
                        if prev and prev['t'] in ('code', 'output') and last_line is None:
                            cont = prev.get('_pend') and e['y'] < 120 and (prev['code'].count('{') > prev['code'].count('}'))
                            if cont:
                                prev['code'] += '\n' + e['code']
                                prev['_pend'] = e['y1'] > 700
                            elif prev['t'] == 'code':
                                blocks.append({'t': 'output', 'code': e['code'], '_pend': e['y1'] > 700})
                            else:
                                blocks.append({'t': 'code', 'code': e['code'], '_pend': e['y1'] > 700})
                        else:
                            kind = 'code'
                            ptxt = (prev.get('html') or prev.get('text') or '') if prev else ''
                            if prev and prev['t'] in ('p', 'h4', 'h3') and re.match(r'^(<strong>)?\s*((Sample|Expected|Program) )?(output|run|screen)\b', ptxt, re.I) and len(ptxt) < 90:
                                kind = 'output'
                            blocks.append({'t': kind, 'code': e['code'], '_pend': e['y1'] > 700})
                    elif e['t'] == 'img':
                        blocks.append({k: e[k] for k in ('t', 'src', 'w', 'h')})
                    else:
                        blocks.append({'t': 'table', 'rows': e['rows']})
                    last_line = None
                    continue
                # text line
                txt = span_text(e['spans']).strip()
                h = fmt_spans(e['spans'])
                if e['serif']:
                    lvl = 'h1' if e['size'] > 20 else ('h2' if (e['size'] > 15 or (self.slug == 'class-11' and e['size'] > 12.5)) else 'h3')
                    if last_line and last_line[0]['t'] == lvl and e['y'] - last_line[1] < 8:
                        last_line[0]['text'] += ' ' + txt
                    else:
                        blocks.append({'t': lvl, 'text': txt})
                    last_line = (blocks[-1], e['y1'], e['x'], pno)
                    continue
                if e['size'] < 10.5 and txt.startswith('Figure') or (e['size'] < 10.5 and blocks and blocks[-1]['t'] == 'img'):
                    if blocks and blocks[-1]['t'] == 'img' and 'caption' not in blocks[-1]:
                        blocks[-1]['caption'] = txt
                    elif blocks and blocks[-1]['t'] == 'img':
                        blocks[-1]['caption'] += ' ' + txt
                    else:
                        blocks.append({'t': 'caption', 'html': h})
                    last_line = None
                    continue
                num = re.match(r'^(\d{1,2}|[a-z]|[ivx]{1,4})[.)]\s', txt) if e['x'] > 50 else None
                is_item = e['bullet'] is not None or (num is not None and not e['callout'])
                starts_new = re.match(r'^(\(?[a-d]\)\s|(Q\.?\s*)?\d{1,2}[.)]\s|Answer\b|Reason\b|Assertion\b)', txt) is not None
                if not is_item and last_line is not None and not starts_new:
                    lb, ly1, lx, lp = last_line
                    gap = e['y'] - ly1
                    same_page_cont = lp == pno and gap < 7 and abs(e['x'] - lx) < 3
                    page_cont = lp != pno and e['y'] < 110 and abs(e['x'] - lx) < 3 and lb['t'] in ('p', 'li') \
                        and not re.search(r'[.:?!)]$', re.sub('<[^>]+>', '', lb['html']))
                    if (same_page_cont or page_cont) and lb['t'] in ('p', 'li', 'callout') and lb.get('callout', False) == e['callout']:
                        lb['html'] += ' ' + h
                        last_line = (lb, e['y1'], e['x'], pno)
                        continue
                if is_item:
                    level = 0
                    if e['bullet']:
                        bx = e['bullet'][0]
                        level = 0 if bx < 66 else (1 if bx < 90 else 2)
                        kind = 'ul'
                        item_h = h
                    else:
                        level = 0 if e['x'] < 66 else (1 if e['x'] < 90 else 2)
                        kind = 'ol'
                        item_h = re.sub(r'^\s*(\d{1,2}|[a-z]|[ivx]{1,4})[.)]\s*', '', h, count=1) if re.match(r'^\s*(\d{1,2}|[a-z]|[ivx]{1,4})[.)]\s', h) else h
                        n = num.group(1)
                    blk = {'t': 'li', 'list': kind, 'level': level, 'html': item_h, 'callout': e['callout']}
                    if kind == 'ol':
                        blk['n'] = n
                    blocks.append(blk)
                    text_x = e['x']
                    if kind == 'ol':
                        # continuation lines align with text after number
                        text_x = None
                        for s in e['spans']:
                            if not re.match(r'^\s*(\d{1,2}|[a-z]|[ivx]{1,4})[.)]\s*$', s['text']):
                                text_x = s['bbox'][0]
                                break
                        text_x = text_x or e['x'] + 13
                    last_line = (blk, e['y1'], text_x, pno)
                    continue
                # paragraph (or callout paragraph)
                if e['callout']:
                    blk = {'t': 'p', 'html': h, 'callout': True}
                else:
                    allbold = all(('Semib' in s['font'] or 'Bold' in s['font']) for s in e['spans'] if s['text'].strip())
                    if allbold and len(txt) < 90 and not re.match(r'^\d+\.', txt):
                        blk = {'t': 'h4', 'text': txt}
                        blocks.append(blk)
                        last_line = (blk, e['y1'], e['x'], pno)
                        # allow multi-line h4 merge
                        continue
                    blk = {'t': 'p', 'html': h}
                blocks.append(blk)
                last_line = (blk, e['y1'], e['x'], pno)
        # h4 merges
        out = []
        for b in blocks:
            b.pop('_pend', None)
            if b['t'] == 'h4' and out and out[-1]['t'] == 'h4' and not re.search(r'[:.]$', out[-1]['text']) and len(out[-1]['text']) > 55:
                out[-1]['text'] += ' ' + b['text']
                continue
            out.append(b)
        return group_structures(out)


def group_structures(blocks):
    """Group consecutive callout lines into callouts, li into lists."""
    res = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b.get('callout'):
            inner = []
            while i < len(blocks) and blocks[i].get('callout'):
                x = dict(blocks[i]); x.pop('callout')
                inner.append(x)
                i += 1
            first = re.sub('<[^>]+>', '', inner[0].get('html', '')).strip()
            kind = 'note'
            for k, pat in [('tip', r'^Did you know'), ('def', r'^(Key )?[Dd]efinition'), ('warn', r'^(Common (error|mistake)|Caution|Warning|Remember|Exam tip|Careful)'), ('example', r'^(Example|Worked example|Real[- ]life)')]:
                if re.match(pat, first):
                    kind = k
            res.append({'t': 'callout', 'kind': kind, 'blocks': listify(inner)})
            continue
        res.append(b)
        i += 1
    return listify(res)


def listify(blocks):
    res = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b['t'] == 'li':
            items = []
            kind = b['list']
            base = b['level']
            while i < len(blocks) and blocks[i]['t'] == 'li' and blocks[i]['level'] >= base:
                c = blocks[i]
                if c['level'] == base:
                    if c['list'] != kind and items:
                        break
                    items.append({'html': c['html'], 'children': []})
                else:
                    if items:
                        items[-1]['children'].append({k: v for k, v in c.items() if k in ('html', 'list', 'level', 'n')} | {'t': 'li'})
                    else:
                        items.append({'html': c['html'], 'children': []})
                i += 1
            lst = {'t': 'list', 'ordered': kind == 'ol', 'items': []}
            if kind == 'ol' and b.get('n', '').isdigit() and b['n'] != '1':
                lst['start'] = int(b['n'])
            for it in items:
                node = {'html': it['html']}
                if it['children']:
                    node['sub'] = listify(it['children'])
                lst['items'].append(node)
            res.append(lst)
            continue
        res.append(b)
        i += 1
    return res


# ---------- lesson segmentation ----------
SPECIAL = [
    ('intro', r'^(Learning (outcomes|objectives)|Introduction to the chapter)'),
    ('workshop', r'^(Workshop|Lab Activit|Activities|Activity)'),
    ('summary', r'^(Summary|Chapter summary|Points to remember)'),
    ('quiz', r'^(Objective Questions|Exercise A|Multiple[- ]choice)'),
    ('practice', r'^(Short Answer|Long Answer|Very Long Answer|Exercise [B-E]|Projects\s*$|Project (ideas|work)\b|Assertion|Hints for answers|Practice)'),
    ('key', r'^(Answer [Kk]ey|Answers)'),
]


def classify(text):
    for k, pat in SPECIAL:
        if re.match(pat, text):
            return k
    return None


def strip(h):
    return html.unescape(re.sub('<[^>]+>', '', h or ''))


def block_text(b):
    t = b['t']
    if t in ('h1', 'h2', 'h3', 'h4'):
        return b['text']
    if t in ('p', 'caption'):
        return strip(b['html'])
    if t == 'list':
        out = []
        for idx, it in enumerate(b['items']):
            pre = f"{b.get('start', 1) + idx}. " if b['ordered'] else ''
            out.append(pre + strip(it['html']))
            for s in it.get('sub', []):
                out.append(block_text(s))
        return '\n'.join(out)
    if t == 'table':
        return '\n'.join(' | '.join(strip(c) for c in r) for r in b['rows'])
    if t in ('code', 'output'):
        return b['code']
    if t == 'callout':
        return '\n'.join(block_text(x) for x in b['blocks'])
    return ''


def parse_quiz(blocks):
    """Return list of {q, options[], answer?} from quiz-section blocks."""
    lines = []
    for b in blocks:
        if b['t'] == 'list':
            for idx, it in enumerate(b['items']):
                n = b.get('start', 1) + idx if b['ordered'] else None
                lines.append(((f'{n}. ' if n else '') + strip(it['html'])))
                for s in it.get('sub', []):
                    if s['t'] == 'list':
                        for j, si in enumerate(s['items']):
                            t = strip(si['html'])
                            if s['ordered'] and not re.match(r'^\([a-d]\)', t):
                                t = f'({"abcd"[j] if j < 4 else "e"}) ' + t
                            lines.append(t)
                    else:
                        lines.extend(block_text(s).split('\n'))
        elif b['t'] in ('code', 'output'):
            lines.append('@@CODE@@' + b['code'])
        else:
            lines.extend(block_text(b).split('\n'))
    qs = []
    cur = None
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith('@@CODE@@'):
            if cur and not cur['options']:
                cur['code'] = ln[8:]
            continue
        # options may be several on one line: (a) x (b) y
        if re.match(r'^\(?[a-d]\)\s', ln) and cur is not None:
            parts = re.split(r'\s*\(([a-d])\)\s+', ' ' + ln)
            for j in range(1, len(parts) - 1, 2):
                cur['options'].append(parts[j + 1].strip())
            continue
        m = re.match(r'^(?:Q\.?\s*)?(\d{1,2})[.)]\s+(.*)', ln)
        if m and (cur is None or cur['options'] or int(m.group(1)) == cur['n'] + 1):
            cur = {'n': int(m.group(1)), 'q': m.group(2), 'options': []}
            qs.append(cur)
            continue
        if cur is not None and not cur['options']:
            cur['q'] += ' ' + ln
        elif cur is not None and cur['options']:
            cur['options'][-1] += ' ' + ln if len(cur['options']) < 4 else ''
    return [q for q in qs if len(q['options']) >= 2]


def parse_key(text):
    key = {}
    for m in re.finditer(r'(\d{1,2})\s*[-–.:)]\s*\(?([a-d])\)?(?![a-z])', text):
        key.setdefault(int(m.group(1)), m.group(2))
    if len(key) < 5:
        toks = re.findall(r'\b(\d{1,2})\b\s*\|?\s*\(?([a-dA-D])\)?(?=[\s|]|$)', text)
        for n, a in toks:
            key.setdefault(int(n), a.lower())
    return key


def build_course(slug, path):
    bk = Book(slug, path)
    toc = bk.doc.get_toc()
    chapters_meta = []
    entries = [(t[1], t[2]) for t in toc]
    entries.append(('END', bk.doc.page_count + 1))
    chapters = []
    front = {}
    for i, (title, page) in enumerate(entries[:-1]):
        nxt = entries[i + 1][1]
        if title in ('Preface', "Author's Message"):
            front[title] = bk.chapter_blocks(page - 1, nxt - 1)
        if not re.match(r'^(Chapter|Final Project)', title):
            continue
        chapters.append((title, page - 1, nxt - 1))
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    stats = {'quiz': 0, 'answered': 0}
    for ci, (title, p0, p1) in enumerate(chapters):
        blocks = bk.chapter_blocks(p0, p1)
        # drop chapter h1(s) and running part line
        clean_title = re.sub(r'^Chapter\s+\d+\s*:?\s*', '', title).strip()
        while blocks and blocks[0]['t'] == 'h1':
            blocks.pop(0)
        part = None
        if blocks and blocks[0]['t'] == 'h4' and re.match(r'^Part [A-Z]', blocks[0]['text']):
            part = blocks.pop(0)['text']
        lessons = []
        cur = {'title': 'Overview', 'kind': 'intro', 'blocks': []}
        for b in blocks:
            if b['t'] == 'h1':
                continue
            is_break = False
            if b['t'] in ('h2', 'h3'):
                tx = b['text']
                k = classify(tx)
                numbered = re.match(r'^\d+\.\d+\s', tx)
                if numbered or (k and k != 'intro') or (b['t'] == 'h2' and k is None) or (slug == 'class-11' and b['t'] == 'h3' and k is None and not re.match(r'^\d+\.\d+\.\d+', tx) and cur['kind'] in ('intro',) and cur['blocks'] and False):
                    is_break = True
                    kind = k or 'lesson'
                    if k == 'practice' and cur['kind'] == 'practice':
                        is_break = False
                        cur['blocks'].append({'t': 'h2', 'text': tx})
                        continue
                    if k == 'key' and cur['kind'] == 'key':
                        is_break = False
                    if k == 'intro' and cur['kind'] == 'intro':
                        is_break = False
                if is_break:
                    if cur['blocks'] or cur['kind'] != 'intro':
                        lessons.append(cur)
                    cur = {'title': tx, 'kind': kind, 'blocks': []}
                    if kind == 'practice':
                        cur['title'] = 'Practice questions'
                        cur['blocks'].append({'t': 'h2', 'text': tx})
                    continue
            cur['blocks'].append(b)
        lessons.append(cur)
        # quiz + key
        key_text = '\n'.join(block_text(b) for l in lessons if l['kind'] == 'key' for b in l['blocks'])
        quiz_lesson = next((l for l in lessons if l['kind'] == 'quiz'), None)
        # key may also be inside quiz lesson (class 9/10 "Answer key: ...")
        if quiz_lesson:
            keep = []
            for b in quiz_lesson['blocks']:
                t = block_text(b)
                if re.match(r'^\s*Answer key', t, re.I) or (keep and keep[-1] is None):
                    key_text += '\n' + t
                    keep.append(None)
                    continue
                keep.append(b)
            quiz_lesson['blocks'] = [b for b in keep if b is not None]
            qs = parse_quiz(quiz_lesson['blocks'])
            key = parse_key(key_text)
            for q in qs:
                a = key.get(q['n'])
                if a and 'abcd'.index(a) < len(q['options']):
                    q['answer'] = 'abcd'.index(a)
            quiz_lesson['quiz'] = qs
            stats['quiz'] += len(qs)
            stats['answered'] += sum(1 for q in qs if 'answer' in q)
            if qs:
                quiz_lesson['blocks'] = [b for b in quiz_lesson['blocks'] if b['t'] in ('p',) and len(block_text(b)) < 200 and not re.match(r'^\d', block_text(b))][:1]
            quiz_lesson['title'] = 'Chapter quiz'
        # key lessons: keep non-objective content (e.g. hints) appended to practice
        final = []
        for l in lessons:
            if l['kind'] == 'key':
                continue
            if l['kind'] == 'intro' and l['title'] in ('Overview',) and l['blocks'] and l['blocks'][0]['t'] in ('h3', 'h2') and classify(l['blocks'][0]['text']) == 'intro':
                l['blocks'][0] = {'t': 'h2', 'text': l['blocks'][0]['text']}
            if not l['blocks'] and not l.get('quiz'):
                continue
            final.append(l)
        # merge: non-numbered lessons before the first numbered one go into the overview;
        # consecutive workshops become one lesson
        merged = []
        seen_num = not any(re.match(r'^\d+\.\d+', l['title']) for l in final)
        for l in final:
            if re.match(r'^\d+\.\d+', l['title']):
                seen_num = True
            if merged and l['kind'] == 'lesson' and not seen_num and merged[-1]['kind'] == 'intro':
                merged[-1]['blocks'] += [{'t': 'h2', 'text': l['title']}] + l['blocks']
                continue
            if merged and l['kind'] == 'workshop' and (merged[-1]['kind'] == 'workshop' or (re.search(r'workshop|lab activ', merged[-1]['title'], re.I) and len(merged[-1]['blocks']) <= 2)):
                prev = merged[-1]
                if prev['kind'] != 'workshop':
                    prev['kind'] = 'workshop'
                    prev['title'] = re.sub(r'^\d+\.\d+\s*', '', prev['title'])
                elif not prev.get('_multi'):
                    prev['blocks'] = [{'t': 'h2', 'text': prev['title']}] + prev['blocks']
                    prev['title'] = 'Workshop'
                prev['_multi'] = True
                prev['blocks'] += [{'t': 'h2', 'text': l['title']}] + l['blocks']
                continue
            merged.append(l)
        final = merged
        for l in final:
            l.pop('_multi', None)
        if final and final[0]['kind'] == 'intro' and final[0]['title'] == 'Overview':
            final[0]['title'] = 'Overview and goals'
        for li, l in enumerate(final):
            l['id'] = f'{ci + 1}-{li + 1}'
            l['minutes'] = max(2, round(len(' '.join(block_text(b) for b in l['blocks']).split()) / 160 + len(l.get('quiz', [])) * 0.5))
            l['hasCode'] = any(b['t'] == 'code' for b in l['blocks'])
        chap = {'n': ci + 1, 'title': clean_title, 'part': part, 'lessons': final}
        with open(os.path.join(OUT, slug, f'ch{ci + 1}.json'), 'w') as f:
            json.dump(chap, f, ensure_ascii=False, separators=(',', ':'))
        chapters_meta.append({'n': ci + 1, 'title': clean_title, 'part': part,
                              'lessons': [{'id': l['id'], 'title': l['title'], 'kind': l['kind'], 'minutes': l['minutes'], 'hasCode': l['hasCode'], 'quiz': len(l.get('quiz', []))} for l in final]})
        print(slug, ci + 1, clean_title, len(final), 'lessons', len(qs) if quiz_lesson else 0, 'q', file=sys.stderr)
    preface = front.get('Preface', [])
    return {'slug': slug, 'title': bk.doc.metadata.get('title', slug), 'chapters': chapters_meta, 'stats': stats, 'images': bk.imgcount}, preface


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[2:] or None
    catalog = []
    for slug, fn in BOOKS:
        if only and slug not in only:
            continue
        meta, preface = build_course(slug, UP + fn)
        catalog.append(meta)
        print(slug, meta['stats'], file=sys.stderr)
    with open(os.path.join(OUT, 'catalog.json' if not only else 'catalog.partial.json'), 'w') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
