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

export function typingSoundEvents(enabled: () => boolean): NonNullable<EditorProps['handleDOMEvents']> {
  let keyInput: { types: string[]; at: number } | undefined;
  const activate = () => { if (enabled()) unlockTypingSound(); };

  return {
    pointerup: activate,
    touchend: activate,
    keydown(_view, event) {
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
    beforeinput(_view, event) {
      if (!enabled() || !typingInputs.has(event.inputType)) return;
      const alreadyPlayed = keyInput?.types.includes(event.inputType) && event.timeStamp - keyInput.at < 80;
      keyInput = undefined;
      if (!alreadyPlayed) playTypingSound();
    }
  };
}
