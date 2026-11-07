import { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, Pause, Pencil, Play } from 'lucide-react';
import { playbackText, WRITING_ACTIVITY_LIMIT, type SavedWritingActivity, type WritingActivity } from './lib/writing-activity';
import './writing-timeline.css';

const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const timeLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

function eventLabel(entry: SavedWritingActivity) {
  if (entry.pastedWords === undefined) return 'Edited text';
  if (entry.pastedWords === 0) return 'Pasted content';
  return `Pasted ${entry.pastedWords.toLocaleString()} ${entry.pastedWords === 1 ? 'word' : 'words'}`;
}

export default function WritingTimeline({ activity, paperId }: { activity: WritingActivity; paperId: string }) {
  const [history, setHistory] = useState<Awaited<ReturnType<WritingActivity['read']>>>();
  const [unavailable, setUnavailable] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activity.read(paperId).then(result => {
      if (cancelled) return;
      setHistory(result);
      setStep(result.entries.length);
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, [activity, paperId]);

  useEffect(() => {
    const entries = history?.entries;
    if (!playing || !entries || step >= entries.length) return;
    const gap = step ? entries[step].startedAt - entries[step - 1].startedAt : 0;
    const timer = setTimeout(() => {
      setStep(step + 1);
      if (step + 1 === entries.length) setPlaying(false);
    }, Math.max(600, Math.min(1400, gap / 6)));
    return () => clearTimeout(timer);
  }, [history, playing, step]);

  const selected = history?.entries[Math.max(0, step - 1)];
  const snapshot = useMemo(() => selected && playbackText(selected), [selected]);
  const text = snapshot?.[step === 0 ? 0 : 1];
  const count = history?.entries.length || 0;

  function seek(position: number) {
    setPlaying(false);
    setStep(position);
  }

  return <section className="writing-timeline" aria-labelledby="writing-timeline-title">
    <h2 id="writing-timeline-title">Writing timeline</h2>
    <p className="form-hint">Manuscript text edits and pastes are recorded automatically. This browser keeps up to {WRITING_ACTIVITY_LIMIT} entries per paper.</p>
    {unavailable ? <p role="status">Writing history is unavailable in this browser.</p> : !history ? <p role="status">Loading writing activity…</p> : <>
      {history.incomplete && <p role="status">Some writing activity could not be saved on this device.</p>}
      {!selected ? <p className="writing-timeline-empty">Start writing in the manuscript to see edits and pastes here.</p> : <div className="writing-timeline-grid">
        <div className="writing-playback">
          <div className="writing-playback-controls">
            <button type="button" className="button subtle" onClick={() => {
              if (!playing && step === count) setStep(0);
              setPlaying(!playing);
            }}>{playing ? <><Pause size={15} />Pause</> : <><Play size={15} />Play</>}</button>
            <input type="range" min={0} max={count} value={step} aria-label="Playback position" aria-valuetext={step ? `Edit ${step} of ${count}` : 'Before the first recorded edit'} onChange={event => seek(event.target.valueAsNumber)} />
            <span aria-hidden="true">{step} / {count}</span>
          </div>
          <h3>{selected.sectionTitle}</h3>
          <p className="form-hint">{step ? eventLabel(selected) : 'Before the first recorded edit'}</p>
          <div className="writing-playback-text" role="region" aria-label="Playback text" tabIndex={0}>{text === undefined ? 'Playback is unavailable for this entry.' : text || 'This section was empty.'}</div>
        </div>
        <ol className="writing-timeline-events" aria-label="Writing activity">
          {history.entries.slice().reverse().map((entry, index) => <li key={entry.id}>
            <button type="button" aria-current={step === count - index ? 'step' : undefined} onClick={() => seek(count - index)}>
              {entry.pastedWords === undefined ? <Pencil size={15} aria-hidden="true" /> : <ClipboardPaste size={15} aria-hidden="true" />}
              <span><strong>{eventLabel(entry)}</strong><small>{entry.sectionTitle}</small></span>
              <time dateTime={new Date(entry.startedAt).toISOString()}>
                <span>{dateLabel.format(entry.startedAt)}</span> {timeLabel.format(entry.startedAt)}
              </time>
            </button>
          </li>)}
        </ol>
      </div>}
    </>}
  </section>;
}
