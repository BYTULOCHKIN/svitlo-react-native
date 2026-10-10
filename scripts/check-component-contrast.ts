import { motion, palette } from '../src/design-system/tokens';

type RGB = [number, number, number];
type Check = { name: string; foreground: RGB; background: RGB; minimum: number };

function rgb(hex: string): RGB {
  return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as RGB;
}

function composite(foreground: RGB, background: RGB, opacity: number): RGB {
  return foreground.map((value, index) => value * opacity + background[index] * (1 - opacity)) as RGB;
}

function surface(hex: string): RGB {
  const opacity = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
  return composite(rgb(hex), rgb(palette.card), opacity);
}

function luminance(color: RGB) {
  const linear = color.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

const card = rgb(palette.card);
const checks: Check[] = [];
const backgrounds = { card, raised: rgb(palette.raised), selected: surface(palette.selected), subtle: surface(palette.subtle) };

for (const [name, background] of Object.entries({ card, raised: backgrounds.raised })) {
  for (const [tone, foreground] of Object.entries({ text: palette.text, secondary: palette.secondary, muted: palette.muted, error: palette.red }))
    checks.push({ name: `${tone}/${name}`, foreground: rgb(foreground), background, minimum: 4.5 });
}

const buttons = { primary: [palette.onAccent, palette.green], secondary: [palette.green, palette.subtle], ghost: [palette.text, palette.card], danger: [palette.background, palette.red] };
for (const [variant, [foreground, background]] of Object.entries(buttons)) {
  for (const [state, opacity] of Object.entries({ normal: 1, pressed: motion.pressedOpacity }))
    checks.push({ name: `button ${variant}/${state}`, foreground: composite(rgb(foreground), card, opacity), background: composite(surface(background), card, opacity), minimum: 4.5 });
}

for (const [name, background] of Object.entries({ selected: backgrounds.selected, unselected: backgrounds.subtle })) {
  for (const [state, opacity] of Object.entries({ normal: 1, pressed: motion.pressedOpacity })) {
    const renderedBackground = composite(background, card, opacity);
    checks.push({ name: `choice text/${name}/${state}`, foreground: composite(rgb(palette.text), card, opacity), background: renderedBackground, minimum: 4.5 });
    checks.push({ name: `choice mark/${name}/${state}`, foreground: composite(rgb(name === 'selected' ? palette.green : palette.secondary), card, opacity), background: renderedBackground, minimum: 3 });
    checks.push({ name: `choice border/${name}/${state}`, foreground: composite(rgb(name === 'selected' ? palette.green : palette.muted), card, opacity), background: renderedBackground, minimum: 3 });
  }
}

for (const foreground of [palette.muted, palette.green, palette.red])
  checks.push({ name: `input border ${foreground}`, foreground: rgb(foreground), background: backgrounds.raised, minimum: 3 });

// WCAG 2.2 SC 1.4.3 / 1.4.11; compare unrounded ratios. Disabled controls
// are excluded. This checks token colors and alpha, not native rendering/focus.
const results = checks.map((check) => {
  const first = luminance(check.foreground);
  const second = luminance(check.background);
  const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  return { name: check.name, ratio: ratio.toFixed(3), minimum: check.minimum, pass: ratio >= check.minimum };
});
console.table(results);
if (results.some(result => !result.pass))
  throw new Error('Component contrast does not meet the PRD.');
