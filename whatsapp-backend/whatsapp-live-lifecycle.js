'use strict';

function withTimeout(operation, milliseconds, label) {
  let timer;

  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} timed out`));
      }, milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

function createLiveLifecycle(options = {}) {
  const timeoutMs = options.timeoutMs || 10000;

  let client = null;
  let initializationPromise = null;
  let authenticated = false;
  let logoutConfirmed = false;
  let logoutPromise = null;
  let cleanupPromise = null;
  let cleanupStarted = false;

  function attach(nextClient, nextInitializationPromise) {
    if (client || cleanupStarted) {
      throw new Error('WhatsApp lifecycle already used');
    }

    if (
      !nextClient ||
      typeof nextClient.logout !== 'function' ||
      typeof nextClient.destroy !== 'function'
    ) {
      throw new Error('Invalid WhatsApp client');
    }

    client = nextClient;
    initializationPromise =
      nextInitializationPromise || null;
  }

  function markAuthenticated() {
    if (!client || cleanupStarted) {
      throw new Error('Cannot authenticate during cleanup');
    }

    authenticated = true;
    logoutConfirmed = false;
  }

  async function cleanup(options = {}) {
    if (cleanupPromise) return cleanupPromise;

    // Authenticated logout requires an explicit
    // authorization from the calling workflow.
    // Automatic cleanup must fail closed.
    if (
      authenticated &&
      !logoutConfirmed &&
      options.authorizeLogout !== true
    ) {
      throw new Error(
        'Authenticated WhatsApp logout requires explicit authorization'
      );
    }

    cleanupStarted = true;

    cleanupPromise = (async () => {
      if (!client) return true;

      if (initializationPromise) {
        await withTimeout(
          () => initializationPromise.catch(() => {}),
          timeoutMs,
          'WhatsApp initialization'
        );
      }

      if (
      authenticated &&
      !logoutConfirmed &&
      options.authorizeLogout !== true
    ) {
      throw new Error(
        'Authenticated WhatsApp logout requires explicit authorization'
      );
    }

    if (authenticated && !logoutConfirmed) {
        // Reuse the same logout operation across retries.
        // A timeout does not cancel the underlying promise.
        if (!logoutPromise) {
          logoutPromise = Promise.resolve().then(
            () => client.logout()
          );

          // Observe rejections even if the timed wait ends.
          logoutPromise.catch(() => {});
        }

        await withTimeout(
          () => logoutPromise,
          timeoutMs,
          'WhatsApp logout'
        );

        logoutConfirmed = true;
      }

      await withTimeout(
        () => client.destroy(),
        timeoutMs,
        'WhatsApp browser destruction'
      );

      client = null;
      initializationPromise = null;
      authenticated = false;

      return true;
    })();

    try {
      return await cleanupPromise;
    } finally {
      cleanupPromise = null;
    }
  }

  function getState() {
    return {
      attached: Boolean(client),
      authenticated,
      logoutConfirmed,
      cleanupStarted
    };
  }

  return {
    attach,
    markAuthenticated,
    cleanup,
    getState
  };
}

module.exports = {
  createLiveLifecycle
};
