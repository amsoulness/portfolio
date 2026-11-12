'use strict';

const assert = require('node:assert/strict');

const {
  createLiveLifecycle
} = require('./whatsapp-live-lifecycle');

async function main() {
  // Authenticated session: logout must precede destroy.
  {
    const calls = [];
    const lifecycle = createLiveLifecycle();

    lifecycle.attach({
      async logout() {
        calls.push('logout');
      },
      async destroy() {
        calls.push('destroy');
      }
    });

    lifecycle.markAuthenticated();

    await lifecycle.cleanup({ authorizeLogout: true });

    assert.deepEqual(calls, [
      'logout',
      'destroy'
    ]);

    console.log(
      'Authenticated logout before destroy: PASSED'
    );
  }

  // Failed logout must not be reported as success.
  {
    const calls = [];
    const lifecycle = createLiveLifecycle();

    lifecycle.attach({
      async logout() {
        calls.push('logout');
        throw new Error('Logout failed');
      },
      async destroy() {
        calls.push('destroy');
      }
    });

    lifecycle.markAuthenticated();

    await assert.rejects(
      lifecycle.cleanup({ authorizeLogout: true }),
      /Logout failed/
    );

    assert.deepEqual(calls, ['logout']);

    assert.equal(
      lifecycle.getState().logoutConfirmed,
      false
    );

    console.log(
      'Failed logout preserves unconfirmed state: PASSED'
    );
  }

  // Unauthenticated sessions may close without logout.
  {
    const calls = [];
    const lifecycle = createLiveLifecycle();

    lifecycle.attach({
      async logout() {
        calls.push('logout');
      },
      async destroy() {
        calls.push('destroy');
      }
    });

    await lifecycle.cleanup();

    assert.deepEqual(calls, ['destroy']);

    console.log(
      'Unauthenticated cleanup: PASSED'
    );
  }

  console.log(
    '\nSTEP 113D.3C.78 PASSED'
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
