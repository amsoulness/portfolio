export const BOT_REPO = 'https://github.com/amsoulness/amsoulness-md'
export const RENDER_DEPLOY = 'https://render.com/deploy?repo=' + encodeURIComponent(BOT_REPO)
export const KOYEB_DEPLOY = 'https://app.koyeb.com/deploy?' + new URLSearchParams({ type: 'git', name: 'amsoulness-md', repository: 'github.com/amsoulness/amsoulness-md', branch: 'main', builder: 'dockerfile', dockerfile: 'Dockerfile', ports: '3000;http;/', 'env[SESSION]': '', 'env[DATABASE_URL]': '', 'env[AUTO_UPDATE]': 'false', 'env[BOT_NAME]': 'Amsoulness' }).toString()
export const VPS_COMMAND = 'bash <(curl -fsSL https://aslns.online/install-aslns.sh)'

export function panelScript(session = '') {
  return `// Amsoulness / ASLNS panel launcher. Keep private if a session is embedded.
// Requires supported Node.js, Git and FFmpeg. Set your panel's main file to start.js.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const root = __dirname;
const bot = path.join(root, 'amsoulness-bot');
const embeddedSession = ${JSON.stringify(session.trim())};
const session = process.env.SESSION || process.env.SESSION_ID || embeddedSession;
const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (!((major === 22 && (minor > 22 || minor === 22 && patch >= 2)) || (major === 24 && minor >= 15) || major >= 26)) {
  console.error('Use Node 24.15+ (24.x), Node 22.22.2+ (22.x), or Node 26+.'); process.exit(1);
}
if (!session || !/^(ASLNS|RGNK)~/.test(session)) {
  console.error('Set SESSION in your panel startup variables, or generate a launcher with your session.'); process.exit(1);
}
function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) throw new Error(cmd + ' failed. Check your panel has Git, FFmpeg and network access.');
}
try {
  run('git', ['--version']); run('ffmpeg', ['-version']);
  if (!fs.existsSync(path.join(bot, 'package.json'))) run('git', ['clone', '--depth', '1', '--branch', 'main', '${BOT_REPO}.git', bot]);
  if (!fs.existsSync(path.join(bot, 'node_modules', '.yarn-integrity'))) {
    run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', 'yarn@1.22.22', 'install', '--frozen-lockfile'], bot);
  }
  const child = spawn(process.execPath, ['index.js'], { cwd: bot, stdio: 'inherit', env: { ...process.env, SESSION: session, AUTO_UPDATE: 'false', BOT_NAME: process.env.BOT_NAME || 'Amsoulness' } });
  child.on('error', () => { console.error('Could not start Amsoulness.'); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code == null ? (signal ? 1 : 0) : code; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
} catch (error) { console.error(error.message); process.exitCode = 1; }
`
}

export type CatalogPlugin = { id: string; title: string; category: string; description: string; command: string; file: string }
export const PLUGINS: CatalogPlugin[] = [
  { id: 'aslns-dice', title: 'Dice roller', category: 'Games', description: 'Roll up to twenty dice, with a configurable number of sides.', command: '.dice 2d6', file: 'dice.js' },
  { id: 'aslns-choose', title: 'Decision picker', category: 'Games', description: 'Choose randomly between your comma-separated options.', command: '.choose tea, coffee, juice', file: 'choose.js' },
  { id: 'aslns-coin', title: 'Coin flip', category: 'Games', description: 'Settle a quick decision with a random heads or tails.', command: '.coin', file: 'coin.js' },
  { id: 'aslns-uuid', title: 'UUID generator', category: 'Utility', description: 'Generate a random UUID directly in your WhatsApp chat.', command: '.uuid', file: 'uuid.js' },
  { id: 'aslns-worldclock', title: 'World clock', category: 'Utility', description: 'Check the current time in an IANA time zone.', command: '.worldclock Asia/Kolkata', file: 'worldclock.js' },
  { id: 'aslns-base64', title: 'Base64 tools', category: 'Utility', description: 'Encode or decode short text without calling a third-party API.', command: '.b64 encode Hello', file: 'base64.js' },
]
export const pluginUrl = (file: string) => `https://raw.githubusercontent.com/amsoulness/amsoulness-md/main/extras/plugins/${file}`
