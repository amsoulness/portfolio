'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const pairing = require('./pairing');
const bridge = require('./pairing-worker-bridge');

const calls = [];

const originalStop = bridge.stopWorkerPairing;
const originalStopAll = bridge.stopAllWorkerPairings;
const originalRelease = pairing.releasePairing;
const originalReleaseAll = pairing.releaseAllPairings;

async function run() {
  try {
    bridge.stopWorkerPairing = async () => {
      calls.push('stop');
      throw new Error('Simulated logout failure');
    };

    pairing.releasePairing = async () => {
      calls.push('release');
    };

    bridge.stopAllWorkerPairings = async () => {
      calls.push('stopAll');
      throw new Error('Simulated global shutdown failure');
    };

    pairing.releaseAllPairings = async () => {
      calls.push('releaseAll');
    };

    // Reload coordinator after replacing dependencies.
    delete require.cache[
      require.resolve('./pairing-cleanup')
    ];

    const cleanup = require('./pairing-cleanup');

    await assert.rejects(
      cleanup.releaseSessionPairing(randomUUID()),
      /Simulated logout failure/
    );

    assert.deepEqual(
      calls,
      ['stop'],
      'Reservation must not be released after failed shutdown'
    );

    calls.length = 0;

    await assert.rejects(
      cleanup.releaseEveryPairing(),
      /Simulated global shutdown failure/
    );

    assert.deepEqual(
      calls,
      ['stopAll'],
      'Global reservation cleanup must not run after worker failure'
    );

    console.log(
      'PASS: worker-first cleanup failure protection'
    );
  } finally {
    bridge.stopWorkerPairing = originalStop;
    bridge.stopAllWorkerPairings = originalStopAll;
    pairing.releasePairing = originalRelease;
    pairing.releaseAllPairings = originalReleaseAll;

    delete require.cache[
      require.resolve('./pairing-cleanup')
    ];
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
