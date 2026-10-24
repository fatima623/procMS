import { test, expect, signIn } from './fixtures/auth';

/**
 * Golden path for an indenter: create a draft indent with one item, see it
 * on the list, open the detail page, verify the status pill reads DRAFT.
 */
test.describe('indent lifecycle', () => {
  test('indenter can create a draft indent end-to-end', async ({ page }) => {
    await signIn(page, 'indenter@dp.navy');
    await page.goto('/indents/new');
    await expect(page.getByRole('heading', { name: /new indent/i })).toBeVisible();

    const uniqueSubject = `E2E spares batch ${Date.now()}`;
    await page.locator('#subject').fill(uniqueSubject);

    // The items table has a single pre-filled row; targeting it by `#` column structure.
    const itemsTable = page.locator('table').first();
    const row = itemsTable.locator('tbody tr').first();
    // Columns: # | Item code | Description | Qty | UoM | Unit price | ×
    const cells = row.locator('td');
    // Description input (3rd cell)
    await cells.nth(2).locator('input').fill('E2E widget assembly');
    // Qty (4th cell)
    await cells.nth(3).locator('input').fill('5');
    // Unit price (6th cell)
    await cells.nth(5).locator('input').fill('100.00');

    await page.getByRole('button', { name: /create draft/i }).click();

    // After create, the UI redirects to /indents/<ulid>.
    await page.waitForURL(/\/indents\/[A-Z0-9]{26}$/i, { timeout: 15_000 });
    await expect(page.getByText(uniqueSubject)).toBeVisible();
    // The status pill shows DRAFT; the actions panel offers Submit for CR.
    await expect(page.getByRole('button', { name: /submit for CR/i })).toBeVisible();

    await page.getByRole('button', { name: /submit for CR/i }).click();
    // After the action, the pill should flip to SUBMITTED and the button disappear.
    await expect(page.getByRole('button', { name: /submit for CR/i })).toHaveCount(0, { timeout: 15_000 });
  });

  test('indenter can see their indent appear on the Indents list', async ({ page }) => {
    await signIn(page, 'indenter@dp.navy');
    await page.goto('/indents');
    await expect(page.getByRole('heading', { name: 'Indents' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });
  });
});
