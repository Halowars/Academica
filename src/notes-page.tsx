import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { LockKeyhole, PanelBottom } from 'lucide-react';
import { bindTypingSound } from './lib/typing-sound';

type NotesProps = {
  value: string;
  onChange: (value: string) => void;
  typingSound: boolean;
};

export function NotesEditor({ value, onChange, typingSound, inDesk = false }: NotesProps & { inDesk?: boolean }) {
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = input.current;
    if (inDesk || !field?.parentElement) return;
    const resize = () => {
      field.style.height = 'auto';
      field.style.height = Math.max(640, field.scrollHeight) + 'px';
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(field.parentElement);
    return () => observer.disconnect();
  }, [inDesk, value]);

  useEffect(() => {
    if (typingSound && input.current) return bindTypingSound(input.current);
  }, [typingSound]);

  function indent(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    const field = event.currentTarget;
    const { selectionStart, selectionEnd } = field;
    onChange(value.slice(0, selectionStart) + '\t' + value.slice(selectionEnd));
    requestAnimationFrame(() => field.setSelectionRange(selectionStart + 1, selectionStart + 1));
  }

  return <textarea
    ref={input}
    className={inDesk ? 'research-notebook' : undefined}
    aria-label={inDesk ? 'Research desk notes editor' : 'Private project notes'}
    value={value}
    onChange={event => onChange(event.target.value)}
    onKeyDown={indent}
    placeholder={inDesk ? 'Your wider research thoughts, questions, and observations…' : 'Ideas, reading notes, questions to come back to…'}
    spellCheck={inDesk ? undefined : false}
  />;
}

export default function NotesPage({ title, onDock, ...notes }: NotesProps & { title: string; onDock: () => void }) {
  return <section className="notes-page" aria-label="Project notes">
    <header className="notes-page-heading">
      <div><h1>Notes</h1><p>Kept with this project, outside your manuscript and paper exports.</p></div>
      <div className="notes-page-actions">
        <span><LockKeyhole size={13} />Private</span>
        <button type="button" className="button subtle" onClick={onDock}><PanelBottom size={15} />Open in research desk</button>
      </div>
    </header>
    <article className="notes-sheet writing-page">
      <header><span className="notes-sheet-label">Working notes</span><h2>{title || 'Untitled paper'}</h2><span className="notes-sheet-rule" /></header>
      <NotesEditor {...notes} />
      <footer>Saved with this project · Not part of the manuscript</footer>
    </article>
  </section>;
}
