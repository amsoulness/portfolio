import { test } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { panelScript, RENDER_DEPLOY, KOYEB_DEPLOY, PLUGINS, pluginUrl } from '../src/session-deployment.ts'

function boot(session, installed = false) {
  const calls = [], children = []
  const code = panelScript(session)
  const process = { versions: { node: '24.22.3' }, env: {}, platform: 'linux', execPath: '/usr/bin/node', on() {}, exit() { throw new Error('exited') } }
  const context = { __dirname: '/panel', process, console: { error() {} }, require(name) {
    if (name === 'node:fs') return { existsSync: () => installed }
    if (name === 'node:path') return { join: (...parts) => parts.join('/') }
    if (name === 'node:child_process') return { spawnSync: (command, args, options) => { calls.push({ command, args, options }); return { status: 0 } }, spawn: (command, args, options) => { children.push({ command, args, options }); return { on() {}, kill() {} } } }
    throw new Error('Unexpected import')
  } }
  vm.runInNewContext(code, context)
  return { calls, children }
}
test('panel script parses and passes embedded sessions only via environment', () => {
  const token = 'ASLNS~test";\nthrow new Error("injected"); //'
  assert.doesNotThrow(() => new vm.Script(panelScript(token)))
  const { calls, children } = boot(token)
  assert.equal(children[0].options.env.SESSION, token)
  assert.ok(!JSON.stringify(calls).includes(token))
  assert.ok(calls.some(c => c.command === 'git' && c.args.includes('https://github.com/amsoulness/amsoulness-md.git')))
  assert.ok(calls.some(c => c.args.includes('--frozen-lockfile')))
})
test('panel restart preserves downloaded bot and dependencies', () => {
  const { calls, children } = boot('ASLNS~synthetic', true)
  assert.equal(calls.length, 2)
  assert.equal(children.length, 1)
  assert.ok(!calls.some(c => c.args.includes('clone')))
})
test('deployment links point at own source and never contain credentials', () => {
  const render = new URL(RENDER_DEPLOY), koyeb = new URL(KOYEB_DEPLOY)
  assert.equal(render.searchParams.get('repo'), 'https://github.com/amsoulness/amsoulness-md')
  assert.equal(koyeb.searchParams.get('repository'), 'github.com/amsoulness/amsoulness-md')
  assert.equal(koyeb.searchParams.get('env[SESSION]'), '')
  assert.equal(koyeb.searchParams.get('dockerfile'), 'Dockerfile')
})
test('plugin catalog contains unique published install locations', () => {
  assert.equal(new Set(PLUGINS.map(p => p.id)).size, PLUGINS.length)
  for (const p of PLUGINS) assert.match(pluginUrl(p.file), /^https:\/\/raw\.githubusercontent\.com\/amsoulness\/amsoulness-md\/main\/extras\/plugins\/[a-z0-9]+\.js$/)
})
test('installer avoids overwriting existing data and keeps configuration private', () => {
  const source = readFileSync(new URL('../public/install-aslns.sh', import.meta.url), 'utf8')
  assert.match(source, /umask 077/)
  assert.match(source, /container inspect amsoulness-md/)
  assert.match(source, /volume inspect amsoulness-data/)
  assert.match(source, /127\.0\.0\.1:3000:3000/)
  assert.ok(!source.includes('raganork.site'))
})
