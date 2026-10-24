import { test as base, expect, type Page } from '@playwright/test';

/**
 * Signs the given user in through the real credentials form and returns a
 * page whose cookies are set. Keeps the sign-in logic in one place so the
 * individual specs stay focused on their flows.
 */
export async function signIn(page: Page, email: string, password = 'Pr0cur3-DEV!') {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

export const test = base;
export { expect };
