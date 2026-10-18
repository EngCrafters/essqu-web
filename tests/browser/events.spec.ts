import { expect, test } from '@playwright/test'
const id = '11111111-1111-4111-8111-111111111111'

test('homepage retains navigation and fits the viewport', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('header').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Events & workshops' })).toBeAttached()
  await page.locator('#events').scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'Local contract workshop' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  await page.screenshot({ path: `artifacts/landing-events-${testInfo.project.name}.png` })
})
test('canonical list, detail and cross-origin registration keep the key server-only', async ({ page }) => {
  const clientRequests: string[] = []
  page.on('request', (request) =>
    clientRequests.push(JSON.stringify({ url: request.url(), headers: request.headers(), body: request.postData() })),
  )
  await page.goto('/events')
  await expect(page.getByRole('heading', { name: 'Local contract workshop' })).toBeVisible()
  await page.getByRole('link', { name: 'View event', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Local contract workshop' })).toBeVisible()
  await page.getByLabel('Full name').fill('Local Test')
  await page.getByLabel('Email address').fill('local@example.test')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your place is confirmed')
  expect(clientRequests.join('\n')).not.toContain('local-e2e-secret-not-production')
  const posts = clientRequests.filter((value) => value.includes('/registrations'))
  expect(posts).toHaveLength(1)
  expect(posts[0]).not.toContain('ipAddress')
  expect(await page.content()).not.toContain('local-e2e-secret-not-production')
})
test('empty, unavailable and opaque next page', async ({ page }) => {
  await page.goto('/events?period=past')
  await expect(page.getByText('No published events at the moment. Check back soon.')).toBeVisible()
  await page.goto('/events?cursor=unavailable')
  await expect(page.getByText('Events are temporarily unavailable. Please try again later.')).toBeVisible()
  await expect(page.getByText('Intro to Robotics Workshop')).toHaveCount(0)
  await page.goto('/events')
  await page.getByRole('link', { name: 'Next page' }).click()
  await expect(page).toHaveURL(/cursor=second-page/)
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveCount(0)
})

test('full response requires explicit waitlist consent and a second submit', async ({ page }) => {
  let writes = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/registrations')) writes++
  })
  await page.goto(`/events/${id}`)
  await page.getByLabel('Full name').fill('Waitlist Test')
  await page.getByLabel('Email address').fill('full@example.test')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('You can choose to join the waitlist')
  expect(writes).toBe(1)
  await page.getByRole('button', { name: 'Join waitlist', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('This is not a confirmed place')
  expect(writes).toBe(2)
})
test('Arabic RTL duplicate feedback and hidden event', async ({ page, context }) => {
  await context.addCookies([{ name: 'es-locale', value: 'ar', domain: '127.0.0.1', path: '/' }])
  await page.goto(`/events/${id}`)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByLabel('الاسم الكامل').fill('اسم تجريبي')
  await page.getByLabel('البريد الإلكتروني').fill('duplicate@example.test')
  await page.getByRole('button', { name: 'تسجيل', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('هذا البريد مسجّل بالفعل')
  await page.goto('/events/22222222-2222-4222-8222-222222222222')
  // App Router may already have streamed its loading shell (HTTP 200). The
  // terminal document is still not-found/noindex and never exposes a form.
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached()
  await expect(page.locator('form')).toHaveCount(0)
})
