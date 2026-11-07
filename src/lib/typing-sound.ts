import type { EditorProps } from '@tiptap/pm/view';

let audioContext: AudioContext | undefined;

export function unlockTypingSound() {
  try {
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    audioContext ??= new Audio();
    if (audioContext.state !== 'running') void audioContext.resume().catch(() => {});
  } catch {
    // Audio availability must never interrupt editing.
  }
}

function playTypingSound() {
  unlockTypingSound();
  if (audioContext?.state !== 'running') return;

  // Match Linea's default Soft click and its default volume (35%).
  const time = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 130 + Math.random() * 70;
  gain.gain.setValueAtTime(0.35 * 0.045, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.05);
}

const editingKeys: Partial<Record<string, string[]>> = {
  Enter: ['insertParagraph', 'insertLineBreak'],
  Backspace: ['deleteContentBackward'],
  Delete: ['deleteContentForward']
};
const typingInputs = new Set([
  'insertText', 'insertCompositionText', 'insertFromComposition', 'insertReplacementText',
  'insertParagraph', 'insertLineBreak', 'deleteContentBackward', 'deleteContentForward'
]);

function typingInputEvents(enabled: () => boolean) {
  let keyInput: { types: string[]; at: number } | undefined;
  const activate = () => { if (enabled()) unlockTypingSound(); };

  return {
    pointerup: activate,
    touchend: activate,
    keydown(event: KeyboardEvent) {
      keyInput = undefined;
      if (!enabled() || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      unlockTypingSound();
      // ProseMirror can handle these keys before the browser emits beforeinput.
      const types = editingKeys[event.key];
      if (types) {
        keyInput = { types, at: event.timeStamp };
        playTypingSound();
      }
    },
    keyup() { keyInput = undefined; },
    beforeinput(event: InputEvent) {
      if (!enabled() || !typingInputs.has(event.inputType)) return;
      const alreadyPlayed = keyInput?.types.includes(event.inputType) && event.timeStamp - keyInput.at < 80;
      keyInput = undefined;
      if (!alreadyPlayed) playTypingSound();
    }
  };
}

export function typingSoundEvents(enabled: () => boolean): NonNullable<EditorProps['handleDOMEvents']> {
  const events = typingInputEvents(enabled);
  return {
    ...events,
    keydown: (_view, event) => events.keydown(event),
    beforeinput: (_view, event) => events.beforeinput(event)
  };
}

export function bindTypingSound(field: HTMLTextAreaElement) {
  const events = typingInputEvents(() => true);
  const controller = new AbortController();
  const options = { signal: controller.signal };
  field.addEventListener('pointerup', events.pointerup, options);
  field.addEventListener('touchend', events.touchend, options);
  field.addEventListener('keydown', events.keydown, options);
  field.addEventListener('keyup', events.keyup, options);
  field.addEventListener('beforeinput', events.beforeinput, options);
  return () => controller.abort();
}
