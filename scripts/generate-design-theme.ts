import { readFileSync, writeFileSync } from 'node:fs';
import { colorScales, fonts, palette, radius, space, typography } from '../src/design-system/tokens';

const vars = Object.entries(colorScales).flatMap(([name, value]) => typeof value === 'string'
  ? [`  --color-${name}: ${value};`]
  : Object.entries(value).map(([shade, color]) => `  --color-${name}-${shade}: ${color};`));
const semantic = { 'background': palette.background, 'foreground': palette.text, 'card': palette.card, 'card-foreground': palette.text, 'muted': palette.raised, 'muted-foreground': palette.secondary, 'border': palette.border, 'input': palette.border, 'ring': palette.green, 'destructive': palette.red, 'destructive-foreground': palette.background };
const cssTypes = { 'xs': typography.caption, 'sm': typography.label, 'base': typography.body, 'lg': typography.emphasis, 'xl': typography.section, '2xl': typography.title, '3xl': typography.timer };
const dimensions = [`  --spacing: ${space.xs}px;`, `  --radius-sm: ${radius.small}px;`, `  --radius-md: ${radius.control}px;`, `  --radius-lg: ${radius.card}px;`, `  --radius-xl: ${radius.dialog}px;`, ...Object.entries(cssTypes).flatMap(([key, value]) => [`  --text-${key}: ${value.fontSize}px;`, `  --text-${key}--line-height: ${value.lineHeight}px;`])];
const css = `/* Generated from src/design-system/tokens.ts. Run npm run design:generate. */\n@import 'tailwindcss';\n@import 'uniwind';\n\n@theme {\n  --font-inter: '${fonts.regular}';\n  --font-sans: '${fonts.regular}';\n${dimensions.join('\n')}\n${vars.join('\n')}\n${Object.entries(semantic).map(([key, value]) => `  --color-${key}: ${value};`).join('\n')}\n}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync('src/global.css', 'utf8').replaceAll('\r\n', '\n') !== css)
    throw new Error('Design CSS is outdated. Run npm run design:generate.');
}
else {
  writeFileSync('src/global.css', css);
}
