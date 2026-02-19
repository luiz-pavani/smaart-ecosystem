import { test, expect } from '@playwright/test'

const email = process.env.MASTER_EMAIL
const password = process.env.MASTER_PASSWORD

if (!email || !password) {
  throw new Error('Missing MASTER_EMAIL or MASTER_PASSWORD env vars')
}

test('federacao smoke: login and main pages', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  await page.waitForURL('/acesso', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /selecione seu acesso/i })).toBeVisible()

  await page.getByRole('link', { name: /federação/i }).click()
  await page.waitForLoadState('networkidle')

  await page.goto('/federacoes')
  await expect(page.getByRole('heading', { name: 'Federações', exact: true })).toBeVisible()

  await page.goto('/atletas')
  await expect(page.getByRole('heading', { name: 'Atletas', exact: true })).toBeVisible()

  await page.goto('/academias')
  await expect(page.getByRole('heading', { name: 'Academias', exact: true })).toBeVisible()
})
