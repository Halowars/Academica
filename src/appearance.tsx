import { useEffect, useState } from 'react';
import { unlockTypingSound } from './lib/typing-sound';
import './typing-sound.css';

type Appearance = {
  preset: string;
  canvas: string;
  paper: string;
  text: string;
  accent: string;
  size: number;
  lineHeight: number;
  font: 'serif' | 'sans';
  texture: boolean;
  typingSound: boolean;
};

const looks: Record<string, Omit<Appearance, 'typingSound'>> = {
  slate: { preset: 'slate', canvas: '#424d50', paper: '#e9dfcb', text: '#30332f', accent: '#d1aa7d', size: 17, lineHeight: 1.95, font: 'serif', texture: true },
  sepia: { preset: 'sepia', canvas: '#594e43', paper: '#eddec3', text: '#3c3028', accent: '#d5ac82', size: 17, lineHeight: 1.95, font: 'serif', texture: true },
  night: { preset: 'night', canvas: '#1c292b', paper: '#293b3d', text: '#dbdfd0', accent: '#a8c4af', size: 17, lineHeight: 1.95, font: 'serif', texture: false }
};
const defaults: Appearance = { ...looks.slate, typingSound: false };

export function useAppearance() {
  const [value, setValue] = useState<Appearance>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('academica-appearance') || 'null');
      return stored ? { ...defaults, ...stored, typingSound: stored.typingSound === true } : defaults;
    } catch { return defaults; }
  });

  useEffect(() => {
    const root = document.documentElement;
    const properties = {
      '--canvas': value.canvas,
      '--paper': value.paper,
      '--paper-ink': value.text,
      '--accent': value.accent,
      '--user-accent': value.accent,
      '--editor-size': value.size + 'px',
      '--editor-line': String(value.lineHeight),
      '--editor-font': value.font === 'serif' ? "Georgia, 'Times New Roman', serif" : "'Segoe UI', system-ui, sans-serif"
    };
    for (const [key, property] of Object.entries(properties)) root.style.setProperty(key, property);
    root.dataset.texture = String(value.texture);
    localStorage.setItem('academica-appearance', JSON.stringify(value));
  }, [value]);
  return [value, setValue] as const;
}

export function AppearanceControls({ value, onChange }: { value: Appearance; onChange: (value: Appearance) => void }) {
  return <div className="appearance-controls">
    <p className="form-hint">Make the workspace comfortable. Submission pages keep their academic formatting.</p>
    <div className="look-options">
      {Object.entries(looks).map(([key, look]) => <button className={value.preset === key ? 'selected' : ''} key={key} onClick={() => onChange({ ...look, typingSound: value.typingSound })}>
        <span style={{ background: look.canvas }}><i style={{ background: look.paper }} /></span>
        {key === 'slate' ? 'Slate & linen' : key === 'sepia' ? 'Warm sepia' : 'Night study'}
      </button>)}
    </div>
    <div className="form-grid color-fields">
      {(['canvas', 'paper', 'text', 'accent'] as const).map(key => <label key={key}>
        {key === 'text' ? 'Page text' : key.charAt(0).toUpperCase() + key.slice(1)}
        <input type="color" value={value[key]} onChange={event => onChange({ ...value, preset: 'custom', [key]: event.target.value })} />
      </label>)}
    </div>
    <div className="form-grid">
      <label>Editor font<select value={value.font} onChange={event => onChange({ ...value, font: event.target.value as Appearance['font'] })}>
        <option value="serif">Serif</option><option value="sans">Sans serif</option>
      </select></label>
      <label>Text size<input type="number" min="14" max="24" value={value.size} onChange={event => onChange({ ...value, size: Math.min(24, Math.max(14, +event.target.value)) })} /></label>
      <label>Line spacing<select value={value.lineHeight} onChange={event => onChange({ ...value, lineHeight: +event.target.value })}>
        <option value="1.6">Comfortable</option><option value="1.95">Spacious</option><option value="2.2">Extra spacious</option>
      </select></label>
      <label>Canvas texture<select value={String(value.texture)} onChange={event => onChange({ ...value, texture: event.target.value === 'true' })}>
        <option value="true">Subtle pattern</option><option value="false">Plain</option>
      </select></label>
    </div>
    <label className="typing-sound-control">
      <span>Typing sounds <small>Linea’s Soft click</small></span>
      <input type="checkbox" role="switch" aria-label="Typing sounds" checked={value.typingSound} onChange={event => {
        const typingSound = event.target.checked;
        if (typingSound) unlockTypingSound();
        onChange({ ...value, typingSound });
      }} />
    </label>
  </div>;
}
