const KW = new Set(
  'alignas auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while string vector map pair set stack queue size_t'.split(
    ' ',
  ),
);
const SQLKW = /^(SELECT|FROM|WHERE|INSERT|INTO|VALUES|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|UPDATE|SET|DELETE|ORDER|BY|GROUP|HAVING|AND|OR|DROP|ALTER|ADD|JOIN|ON|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|LIKE|IN|BETWEEN|DESC|ASC|INT|VARCHAR|CHAR|DATE|FLOAT|DECIMAL|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|USE|DATABASE|SHOW|DESCRIBE|LIMIT|IS|INNER|LEFT|RIGHT|OUTER|CROSS|NATURAL|MODIFY|COLUMN|RENAME|TO|ALL)$/;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Tiny tokenizer for static code blocks (the editor uses CodeMirror). */
export function highlightCpp(code: string): string {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|--\s[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(^\s*#\s*\w+[^\n]*)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?[fFlLuU]*\b)|([A-Za-z_]\w*)/gm;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [tok, com, str, pre, num, id] = m;
    if (com) out += `<span style="color:#8a90b4;font-style:italic">${esc(tok)}</span>`;
    else if (str) out += `<span style="color:#AEE938">${esc(tok)}</span>`;
    else if (pre) {
      const mm = tok.match(/^(\s*#\s*\w+)(.*)$/)!;
      out += `<span style="color:#F966FF">${esc(mm[1])}</span><span style="color:#AEE938">${esc(mm[2])}</span>`;
    } else if (num) out += `<span style="color:#FF8C00">${esc(tok)}</span>`;
    else if (id) {
      if (KW.has(id)) out += `<span style="color:#FFD300;font-weight:500">${id}</span>`;
      else if (SQLKW.test(id)) out += `<span style="color:#FFD300">${id}</span>`;
      else if (/^(cout|cin|endl|cerr|getline|main|std)$/.test(id)) out += `<span style="color:#7cc4ff">${id}</span>`;
      else if (code[re.lastIndex] === '(') out += `<span style="color:#7cc4ff">${id}</span>`;
      else out += id;
    }
    last = re.lastIndex;
  }
  out += esc(code.slice(last));
  return out;
}
