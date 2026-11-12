'use strict';

const {
  releasePairing,
  releaseAllPairings
} = require('./pairing');

const {
  stopWorkerPairing,
  stopAllWorkerPairings
} = require('./pairing-worker-bridge');

async function releaseSessionPairing(sessionId) {
  // Worker shutdown must succeed before
  // releasing the pairing reservation.
  await stopWorkerPairing(sessionId);

  await releasePairing(sessionId);

  return true;
}

async function releaseEveryPairing() {
  // Do not release reservations when any
  // worker has failed to shut down safely.
  await stopAllWorkerPairings();

  await releaseAllPairings();

  return true;
}

module.exports = {
  releaseSessionPairing,
  releaseEveryPairing
};
