const path = require('node:path');
const { buildSync } = require('esbuild');

buildSync({
  entryPoints: [path.join(__dirname, 'server.ts')],
  outfile: path.join(__dirname, 'dist/server.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
});
