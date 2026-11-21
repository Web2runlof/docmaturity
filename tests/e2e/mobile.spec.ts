import { expect, test } from '@playwright/test';

test('54 · experiencia móvil: menú, cuestionario del entrevistado y contenido sin desbordamiento horizontal', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Diagnostique lo que funciona');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('navigation', { name: 'Sitio móvil' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.goto('#/app');
  await expect(page.locator('body')).toBeVisible();
  const overflowApp = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflowApp).toBeLessThanOrEqual(1);

  await page.goto('#/responder');
  await expect(page.getByRole('heading', { name: 'Responder una entrevista' })).toBeVisible();
  const overflowResp = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflowResp).toBeLessThanOrEqual(1);
});
