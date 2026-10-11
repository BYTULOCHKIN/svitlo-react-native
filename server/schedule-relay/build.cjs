const path = require('node:path');
const { buildSync } = require('esbuild');

buildSync({
  entryPoints: [path.join(__dirname, 'server.ts')],
  outfile: path.join(__dirname, 'dist/server.cjs'),
  bundle: true,
  // Shared source files live outside this package; Render installs only its dependencies.
  nodePaths: [path.join(__dirname, 'node_modules')],
  platform: 'node',
  target: 'node24',
  format: 'cjs',
});
