'use strict';

const {
  validateCommand
} = require('./whatsapp-ipc-payloads');

const {
  createSessionGuard
} = require('./whatsapp-ipc-session-guard');

const {
  LIVE_ENABLED
} = require('./whatsapp-live-config');

const {
  createLiveWhatsAppClient
} = require('./whatsapp-live-client');

const {
  createLiveLifecycle
} = require('./whatsapp-live-lifecycle');

const {
  createProfileAdapter
} = require('./whatsapp-profile-adapter');

function createWorkerCommandHandler(sessionId, sendEvent) {
  const guard = createSessionGuard(sessionId);

  let status = 'IDLE';
  let liveClient = null;
  let initializationPromise = null;
  let authenticated = false;
  const lifecycle = createLiveLifecycle();
  let profileAdapter = null;
  let profileUpdateInProgress = false;
  let profileUpdatePromise = null;
  let cleanupRequested = false;
  let logoutInProgress = false;

  async function handle(message) {
    guard.authorize(message);
    validateCommand(message);

    switch (message.type) {
      case 'PING':
        return {
          type: 'PONG',
          requestId: message.requestId,
          payload: {}
        };

      case 'PAIR_START':
        if (status !== 'IDLE') {
          throw new Error('Pairing already started');
        }

        status = 'PAIRING';

        if (LIVE_ENABLED) {
          try {
            liveClient = createLiveWhatsAppClient(
              sessionId,
              message.payload.phoneNumber,
              (type, payload) => {
                if (type === 'AUTHENTICATED') {
                  authenticated = true;
                  lifecycle.markAuthenticated();
                }

                if (type === 'PAIR_STATUS') {
                  status = payload.status;
                }

                sendEvent({ type, payload });
              }
            );

            initializationPromise = Promise.resolve()
              .then(() => liveClient.initialize());

            lifecycle.attach(
              liveClient,
              initializationPromise
            );

            profileAdapter = createProfileAdapter(
              liveClient
            );

            initializationPromise.catch(error => {
              status = 'INITIALIZATION_FAILED';

              sendEvent({
                type: 'PAIR_STATUS',
                payload: {
                  sessionId,
                  status,
                  error: error.message
                }
              });
            });

            return {
              type: 'PAIR_STATUS',
              requestId: message.requestId,
              payload: {
                sessionId,
                status: 'INITIALIZING',
                mock: false
              }
            };
          } catch (error) {
            status = 'FAILED';
            throw error;
          }
        }

        sendEvent({
          type: 'PAIR_STATUS',
          payload: {
            sessionId,
            status: 'PAIRING',
            mock: true
          }
        });

        return {
          type: 'PAIR_STATUS',
          requestId: message.requestId,
          payload: {
            sessionId,
            status,
            mock: true
          }
        };

      case 'PAIR_CANCEL':
        if (profileUpdateInProgress) {
          throw new Error(
            'Cannot cancel during profile update'
          );
        }

        const previousStatus = status;
        cleanupRequested = true;

        if (LIVE_ENABLED) {
          status = 'CLEANING_UP';

          try {
            await lifecycle.cleanup();
          } catch (error) {
            // Only restore state if cleanup never started.
            // Once cleanup begins, its outcome may be uncertain.
            if (!lifecycle.getState().cleanupStarted) {
              status = previousStatus;
              cleanupRequested = false;
            }

            throw error;
          }
        }

        status = 'CANCELLED';

        return {
          type: 'PAIR_STATUS',
          requestId: message.requestId,
          payload: {
            sessionId,
            status,
            mock: true
          }
        };

      case 'PROFILE_UPDATE': {
        if (
          !LIVE_ENABLED ||
          !liveClient ||
          !profileAdapter ||
          !authenticated ||
          status !== 'READY' ||
          cleanupRequested ||
          lifecycle.getState().cleanupStarted
        ) {
          throw new Error(
            'WhatsApp must be ready before updating the profile'
          );
        }

        if (profileUpdateInProgress) {
          throw new Error(
            'Profile update already in progress'
          );
        }

        if (cleanupRequested) {
          throw new Error(
            'Worker cleanup has already been requested'
          );
        }

        profileUpdateInProgress = true;

        const updatePromise =
          Promise.resolve().then(() =>
            profileAdapter.updateProfilePicture(
              message.payload.imagePath
            )
          );

        profileUpdatePromise = updatePromise;

        try {
          const result = await updatePromise;

          return {
            type: 'PROFILE_UPDATED',
            requestId: message.requestId,
            payload: {
              sessionId,
              success: result.success === true
            }
          };
        } finally {
          profileUpdatePromise = null;
          profileUpdateInProgress = false;
        }
      }

      case 'LOGOUT':
        if (message.payload?.authorizeLogout !== true) {
          throw new Error(
            'Explicit logout authorization is required'
          );
        }

        if (logoutInProgress) {
          throw new Error('WhatsApp logout already in progress');
        }

        if (profileUpdateInProgress) {
          throw new Error(
            'Cannot logout during profile update'
          );
        }

        if (!LIVE_ENABLED) {
          throw new Error(
            'Logout requires an authenticated WhatsApp client'
          );
        }

        logoutInProgress = true;
        cleanupRequested = true;
        status = 'CLEANING_UP';

        try {
          await lifecycle.cleanup({
            authorizeLogout: true
          });
          status = 'LOGGED_OUT';
        } finally {
          logoutInProgress = false;
        }

        return {
          type: 'LOGOUT_COMPLETE',
          requestId: message.requestId,
          payload: {
            sessionId,
            logoutConfirmed:
              lifecycle.getState().logoutConfirmed
          }
        };

      default:
        throw new Error('Unsupported worker command');
    }
  }

  async function cleanupForShutdown() {
    cleanupRequested = true;

    if (profileUpdatePromise) {
      try {
        await profileUpdatePromise;
      } catch (error) {
        // An unsuccessful profile update must not
        // prevent the subsequent safe logout.
        console.error(
          'Profile update failed before shutdown:',
          error.message
        );
      }
    }

    if (!LIVE_ENABLED) return true;

    status = 'CLEANING_UP';
    await lifecycle.cleanup();
    status = 'CLEANED_UP';

    return true;
  }

  return {
    handle,
    cleanupForShutdown,
    getStatus: () => status
  };
}

module.exports = {
  createWorkerCommandHandler
};
