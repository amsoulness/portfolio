
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const AUTH_DIR = path.join(__dirname, '.wwebjs_auth');

const PROFILE_PATTERN =
  /^session-aslns-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function inspectStartupRecovery(authDir = AUTH_DIR) {
  let entries;

  try {
    entries = await fs.readdir(authDir, {
      withFileTypes: true
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        status: 'CLEAN',
        orphanedProfiles: 0
      };
    }

    throw error;
  }

  const profiles = entries.filter(
    entry =>
      entry.isDirectory() &&
      PROFILE_PATTERN.test(entry.name)
  );

  if (profiles.length === 0) {
    return {
      status: 'CLEAN',
      orphanedProfiles: 0
    };
  }

  return {
    status: 'RECOVERY_REQUIRED',
    orphanedProfiles: profiles.length
  };
}

module.exports = {
  inspectStartupRecovery
};
