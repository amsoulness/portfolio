'use strict';

const puppeteer = require('puppeteer');

let activeCoordinator = null;

function createBrowserLaunchCoordinator() {
  if (activeCoordinator) {
    throw new Error('Browser launch coordinator already active');
  }

  let cancelled = false;
  let installed = false;
  let pending = 0;
  let originalLaunch = null;
  const launchedBrowsers = new Set();

  async function guardedLaunch(...args) {
    if (cancelled) {
      throw new Error('Browser launch cancelled');
    }

    pending++;

    try {
      const browser = await originalLaunch.apply(puppeteer, args);

      launchedBrowsers.add(browser);

      if (cancelled) {
        await browser.close();
        launchedBrowsers.delete(browser);
        throw new Error('Browser launch cancelled');
      }

      return browser;
    } finally {
      pending--;
    }
  }

  function install() {
    if (installed) {
      throw new Error('Coordinator already installed');
    }

    if (activeCoordinator) {
      throw new Error('Another coordinator is active');
    }

    originalLaunch = puppeteer.launch;
    activeCoordinator = api;
    puppeteer.launch = guardedLaunch;
    installed = true;
  }

  function cancel() {
    cancelled = true;
  }

  async function closeBrowsers() {
    cancelled = true;

    if (pending > 0) {
      throw new Error(
        'Browser launch still pending; cleanup must wait'
      );
    }

    for (const browser of launchedBrowsers) {
      if (browser.isConnected()) {
        await browser.close();
      }

      if (browser.isConnected()) {
        throw new Error('Browser remains connected');
      }

      launchedBrowsers.delete(browser);
    }
  }

  function uninstall() {
    if (!installed) return;

    if (pending > 0 || launchedBrowsers.size > 0) {
      throw new Error(
        'Cannot uninstall while browsers are active'
      );
    }

    if (puppeteer.launch !== guardedLaunch) {
      throw new Error(
        'Puppeteer launch method changed unexpectedly'
      );
    }

    puppeteer.launch = originalLaunch;
    activeCoordinator = null;
    installed = false;
  }

  const api = {
    install,
    cancel,
    closeBrowsers,
    uninstall,
    getStatus() {
      return {
        installed,
        cancelled,
        pending,
        trackedBrowsers: launchedBrowsers.size
      };
    }
  };

  return api;
}

module.exports = {
  createBrowserLaunchCoordinator
};
