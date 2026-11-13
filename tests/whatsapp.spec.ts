import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Small 1:2 PNG. Backend tests separately verify image geometry and all four edges.
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAQCAIAAACk6KkqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNY3v0LK2IYlfg1AEECABTHFhCZF6krAAAAAElFTkSuQmCC', 'base64')
const id = '11111111-1111-4111-8111-111111111111'
const token = 'a'.repeat(64)

async function setup(page: Page) {
  const service = { status: 'CODE_READY', created: 0, deleted: 0, available: true, originalUploaded: false }
  const snapshot = () => ({
    sessionId: id, status: service.status, pairingCode: service.status === 'CODE_READY' ? 'TEST1234' : null,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    updated: ['SUCCESS', 'CLEANUP_REQUIRED'].includes(service.status), deviceRemoved: service.status === 'SUCCESS',
    outcome: 'pending', error: service.status === 'CLEANUP_REQUIRED' ? 'Device removal could not be confirmed.' : null,
  })
  await page.route('**/api/whatsapp/**', async route => {
    const request = route.request()
    let body
    if (request.url().endsWith('/health')) body = { version: 2, available: service.available }
    else if (request.method() === 'POST') {
      service.created++
      service.originalUploaded = request.postDataBuffer()?.includes(image) === true
      body = { ...snapshot(), accessToken: token }
    } else if (request.method() === 'DELETE') {
      service.deleted++
      service.status = service.status === 'CLEANUP_REQUIRED' ? 'SUCCESS' : 'CANCELLED'
      body = snapshot()
    } else {
      expect(request.headers()['x-session-token']).toBe(token)
      body = snapshot()
    }
    await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/tools')
  await expect(page.locator('.th-card')).toHaveCount(6)
  await openTool(page)
  return service
}

async function openTool(page: Page) {
  await page.getByRole('button', { name: /WhatsApp Profile Updater/ }).click()
}

async function fill(page: Page) {
  await page.getByLabel('Choose profile photo').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: image })
  await page.getByLabel('Include your country code').fill('+91 98765 43210')
  await page.getByRole('checkbox', { name: /This is my WhatsApp account/ }).check()
}

async function start(page: Page) {
  await fill(page)
  await page.getByRole('button', { name: 'Update profile picture', exact: true }).click()
  await expect(page.getByText('Enter this code in WhatsApp', { exact: true })).toBeVisible()
}

test('uploads original image and restores pairing after reload without a second submission', async ({ page }) => {
  const service = await setup(page)
  await expect(page.getByRole('button', { name: 'Update profile picture', exact: true })).toBeDisabled()
  await start(page)
  expect(service.originalUploaded).toBe(true)
  await expect(page.locator('.wa-drop img')).toHaveCSS('object-fit', 'contain')
  await page.reload()
  await openTool(page)
  await expect(page.getByText('Enter this code in WhatsApp', { exact: true })).toBeVisible()
  expect(service.created).toBe(1)
  service.status = 'UPDATING'
  await expect(page.getByText('Updating your profile picture…', { exact: true })).toBeVisible()
  service.status = 'SUCCESS'
  await expect(page.getByText('Profile picture updated', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start over', exact: true }).click()
  expect(await page.evaluate(() => sessionStorage.getItem('aslns.whatsapp-profile.v2'))).toBeNull()
})

test('does not show success until failed device removal is retried and confirmed', async ({ page }) => {
  const service = await setup(page)
  await start(page)
  service.status = 'CLEANUP_REQUIRED'
  await expect(page.getByRole('button', { name: 'Retry device removal' })).toBeVisible()
  await expect(page.getByText('Profile picture updated', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry device removal' }).click()
  await expect(page.getByText('Profile picture updated', { exact: true })).toBeVisible()
  expect(service.deleted).toBe(1)
  expect(service.created).toBe(1)
})

test('cancels an unlinked session and clears it on start over', async ({ page }) => {
  const service = await setup(page)
  await start(page)
  await page.getByRole('button', { name: 'Cancel and close session' }).click()
  await expect(page.getByText('Session closed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start over', exact: true }).click()
  expect(service.deleted).toBe(1)
  await expect(page.getByRole('button', { name: 'Update profile picture', exact: true })).toBeDisabled()
})

test('unavailable service does not upload or claim success', async ({ page }) => {
  const service = await setup(page)
  service.available = false
  await fill(page)
  await page.getByRole('button', { name: 'Update profile picture', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  expect(service.created).toBe(0)
})

test('mobile layout retains the whole image without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page)
  await fill(page)
  await expect(page.locator('.wa-drop img')).toBeVisible()
  expect(await page.locator('.wa-drop img').evaluate((element: HTMLImageElement) => element.naturalWidth / element.naturalHeight)).toBe(.5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
