import test from 'node:test'
import assert from 'node:assert/strict'
import { DOOMSDAY_END,isDoomsdaySeason } from '../src/doomsday-season.mjs'
test('Doomsday edition includes all of December 21 in India',()=>{assert.equal(isDoomsdaySeason(Date.parse('2026-12-21T23:59:59.999+05:30')),true)})
test('normal website begins exactly at December 22 midnight IST',()=>{assert.equal(DOOMSDAY_END,Date.parse('2026-12-21T18:30:00Z'));assert.equal(isDoomsdaySeason(DOOMSDAY_END),false);assert.equal(isDoomsdaySeason(DOOMSDAY_END+1),false)})
