// Minimal, dependency-free terminal prompts: multi-select, single select and confirm.
// ↑/↓ move · space toggles · a toggles all · enter confirms · ctrl+c aborts.
import readline from 'node:readline';

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (a, b) => (s) => (color ? `\x1b[${a}m${s}\x1b[${b}m` : String(s));
const c = { dim: wrap(2, 22), bold: wrap(1, 22), cyan: wrap(36, 39), green: wrap(32, 39) };
export const colors = c;

function withKeys(render, onKey) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    readline.emitKeypressEvents(stdin);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();
    let lines = 0;
    const draw = (final = false) => {
      if (lines) stdout.write(`\x1b[${lines}A\x1b[0J`);
      const text = render(final);
      stdout.write(text + '\n');
      lines = text.split('\n').length;
    };
    const done = (value, err) => {
      stdin.off('keypress', handler);
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
      if (err) return reject(err);
      draw(true);
      resolve(value);
    };
    const handler = (_, key = {}) => {
      if (key.ctrl && key.name === 'c') return done(null, new Error('Aborted'));
      const r = onKey(key);
      if (r && 'value' in r) return done(r.value);
      draw();
    };
    stdin.on('keypress', handler);
    draw();
  });
}

/** items: [{ label, value, hint?, checked?, locked? }] → array of selected values */
export function multiselect(title, items) {
  let cursor = 0;
  const state = items.map((i) => ({ ...i, checked: !!(i.checked || i.locked) }));
  return withKeys(
    (final) => {
      if (final) return `${c.green('✔')} ${c.bold(title)} ${c.dim(state.filter((s) => s.checked).map((s) => s.short ?? s.label).join(', ') || 'none')}`;
      const rows = state.map((s, i) => {
        const box = s.locked ? c.dim('■') : s.checked ? c.green('◼') : '◻';
        const label = i === cursor ? c.cyan(s.label) : s.label;
        return `${i === cursor ? c.cyan('›') : ' '} ${box} ${label}${s.hint ? ' ' + c.dim(s.hint) : ''}`;
      });
      return `${c.bold('?')} ${c.bold(title)} ${c.dim('(↑/↓ move · space toggle · a all · enter confirm)')}\n${rows.join('\n')}`;
    },
    (key) => {
      if (key.name === 'up') cursor = (cursor - 1 + state.length) % state.length;
      else if (key.name === 'down') cursor = (cursor + 1) % state.length;
      else if (key.name === 'space') {
        if (!state[cursor].locked) state[cursor].checked = !state[cursor].checked;
      } else if (key.name === 'a') {
        const all = state.every((s) => s.checked);
        state.forEach((s) => (s.checked = s.locked || !all));
      } else if (key.name === 'return') return { value: state.filter((s) => s.checked).map((s) => s.value) };
      return null;
    },
  );
}

/** items: [{ label, value, hint? }] → selected value */
export function select(title, items, initial = 0) {
  let cursor = initial;
  return withKeys(
    (final) => {
      if (final) return `${c.green('✔')} ${c.bold(title)} ${c.dim(items[cursor].label)}`;
      const rows = items.map((s, i) => `${i === cursor ? c.cyan('› ' + s.label) : '  ' + s.label}${s.hint ? ' ' + c.dim(s.hint) : ''}`);
      return `${c.bold('?')} ${c.bold(title)} ${c.dim('(↑/↓ · enter)')}\n${rows.join('\n')}`;
    },
    (key) => {
      if (key.name === 'up') cursor = (cursor - 1 + items.length) % items.length;
      else if (key.name === 'down') cursor = (cursor + 1) % items.length;
      else if (key.name === 'return') return { value: items[cursor].value };
      return null;
    },
  );
}

export async function confirm(title, initial = true) {
  return select(title, [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ], initial ? 0 : 1);
}
