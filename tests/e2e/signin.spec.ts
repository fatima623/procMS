import { test, expect, signIn } from './fixtures/auth';

/** Scope locators to the sidebar nav so dashboard cards with similar text don't collide. */
function sidebarLink(page: ReturnType<Parameters<Parameters<typeof test>[1]>[0]['page'] extends never ? never : never>) {
  return page;
}

test.describe('authentication', () => {
  test('admin can sign in and sees the admin dashboard', async ({ page }) => {
    await signIn(page, 'admin@dp.navy');
    // Admin-only tiles should be visible.
    await expect(page.getByText('Total indents')).toBeVisible();
    await expect(page.getByText('Pending approvals (all roles)')).toBeVisible();
    // Admin nav link — scope to the sidebar so admin-related cards don't match.
    const sidebar = page.locator('nav.app-sidebar');
    await expect(sidebar.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  });

  test('wrong password keeps the user on /signin with an error', async ({ page }) => {
    await page.goto('/signin');
    await page.getByLabel('Email').fill('admin@dp.navy');
    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('firm rep sees their own menu, not the admin menu', async ({ page }) => {
    await signIn(page, 'rep@marine-systems.pk');
    const sidebar = page.locator('nav.app-sidebar');
    await expect(sidebar.getByRole('link', { name: 'IT invites', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  });
});
