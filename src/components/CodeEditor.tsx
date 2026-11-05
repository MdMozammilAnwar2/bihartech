import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';

const theme = EditorView.theme(
  {
    '&': { backgroundColor: '#0E1430', color: '#E6E7EF', height: '100%' },
    '.cm-content': { caretColor: '#FFD300', padding: '12px 0' },
    '.cm-cursor': { borderLeftColor: '#FFD300', borderLeftWidth: '2px' },
    '.cm-gutters': { backgroundColor: '#0E1430', color: '#4f5785', border: 'none', paddingLeft: '6px' },
    '.cm-activeLine': { backgroundColor: '#1a2146' },
    '.cm-activeLineGutter': { backgroundColor: '#1a2146', color: '#c9cce0' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: '#3a4270 !important' },
    '.cm-matchingBracket': { backgroundColor: '#3A10E5', color: '#fff' },
  },
  { dark: true },
);

const hl = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.modifier, t.definitionKeyword, t.typeName, t.standard(t.typeName)], color: '#FFD300' },
  { tag: [t.string, t.character], color: '#AEE938' },
  { tag: [t.number, t.bool, t.null], color: '#FF8C00' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#7d84ab', fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.meta], color: '#F966FF' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: '#7cc4ff' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#c9cce0' },
  { tag: [t.className, t.namespace], color: '#ffb3f2' },
]);

type Props = { value: string; onChange: (v: string) => void; onRun?: () => void };

export default function CodeEditor({ value, onChange, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const cb = useRef({ onChange, onRun });
  cb.current = { onChange, onRun };

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          cpp(),
          syntaxHighlighting(hl),
          theme,
          EditorState.tabSize.of(4),
          keymap.of([
            { key: 'Mod-Enter', run: () => (cb.current.onRun?.(), true) },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ 'aria-label': 'C++ code editor' }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full overflow-hidden" />;
}
