import { test, expect, signIn } from './fixtures/auth';

/**
 * Golden path for an approval actor (AD role): see the pending queue, open
 * a step, approve it, verify we end up back on the queue.
 */
test.describe('approval chain', () => {
  test('AD can see pending approvals and open the decide form', async ({ page }) => {
    await signIn(page, 'ad@dp.navy');
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: /approvals/i })).toBeVisible();

    const rows = await page.locator('tbody tr').count();
    test.skip(rows === 0, 'No pending approvals for AD in this DB state');

    await page.locator('tbody tr').first().getByRole('link', { name: /decide/i }).click();
    await expect(page.getByRole('heading', { name: /approval chain/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /your decision/i })).toBeVisible();

    await page.getByLabel(/comments/i).fill('Approved via E2E');
    await page.getByRole('button', { name: /submit APPROVED/i }).click();

    await page.waitForURL(/\/approvals(\?.*)?$/, { timeout: 15_000 });
  });

  test('admin can view the pending queue across every role', async ({ page }) => {
    await signIn(page, 'admin@dp.navy');
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: /pending approvals \(all roles\)/i })).toBeVisible();
  });
});
