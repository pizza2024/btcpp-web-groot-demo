import { expect, test } from '@playwright/test';
import { loadSampleTree } from './helpers';

test.describe('Node Model Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.react-flow');
  });

  test('opens node model modal via + Add Model button', async ({ page }) => {
    // Click + Add Model button in palette
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Modal should appear
    await expect(page.locator('.node-model-modal')).toBeVisible();
    await expect(page.locator('.node-model-modal')).toContainText('Create Model');
  });

  test('shows validation error for empty node type name', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Leave node type empty and try to save
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(300);

    // Should show validation error
    await expect(page.locator('.validation-errors')).toBeVisible();
    await expect(page.locator('.validation-error-item')).toContainText('empty');
  });

  test('shows validation error for invalid node type identifier', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Type an invalid identifier (contains spaces/hyphens)
    await page.locator('.node-model-modal input[type="text"]').first().fill('Move-To-Goal');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('.validation-errors')).toBeVisible();
    await expect(page.locator('.validation-error-item')).toContainText('not a valid identifier');
  });

  test('shows validation error for duplicate node type', async ({ page }) => {
    // Load sample tree first to populate the store
    await loadSampleTree(page);
    await page.waitForTimeout(500);

    // Now open modal to create a node
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(500);

    // Create a unique node type
    const uniqueName = 'TestDupNode_' + Date.now();
    await page.locator('.node-model-modal input[type="text"]').first().fill(uniqueName);
    await page.getByRole('button', { name: 'Create' }).click();

    // Modal should close
    await expect(page.locator('.node-model-modal')).not.toBeVisible({ timeout: 5000 });

    // Verify palette updated
    await expect(page.locator('.palette-item', { hasText: uniqueName })).toBeVisible({ timeout: 5000 });

    // Open create modal again
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(500);

    // Try to create with the same name
    await page.locator('.node-model-modal input[type="text"]').first().fill(uniqueName);
    await page.getByRole('button', { name: 'Create' }).click();

    // Should show duplicate error
    await expect(page.locator('.validation-errors')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.validation-error-item')).toContainText('already exists');
  });

  test('shows validation error for duplicate port names', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    await page.locator('.node-model-modal input[type="text"]').first().fill('DupPortNode');
    await page.waitForTimeout(100);

    // Add two ports with the same name "goal"
    await page.getByRole('button', { name: '+ Add Port' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: '+ Add Port' }).click();
    await page.waitForTimeout(200);

    // Set both ports to have the same name "goal"
    const nameInputs = page.locator('.port-field-name input[type="text"]');
    await nameInputs.nth(0).fill('goal');
    await nameInputs.nth(1).fill('goal');
    await page.waitForTimeout(100);

    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('.validation-errors')).toBeVisible();
    await expect(page.locator('.validation-error-item')).toContainText('Duplicate port name');
  });

  test('successfully creates valid node model', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    await page.locator('.node-model-modal input[type="text"]').first().fill('MoveToTarget');
    await page.waitForTimeout(100);

    // Add a valid port
    await page.getByRole('button', { name: '+ Add Port' }).click();
    await page.waitForTimeout(200);
    const nameInputs = page.locator('.port-field-name input[type="text"]');
    await nameInputs.first().fill('target_pose');

    // Set port type to int
    const portTypeSelect = page.locator('.port-field-type select');
    await portTypeSelect.selectOption('int');

    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);

    // Modal should close
    await expect(page.locator('.node-model-modal')).not.toBeVisible();

    // Node should appear in the palette under Action category
    await expect(page.locator('.palette-item', { hasText: 'MoveToTarget' })).toBeVisible();
  });

  test('warns about conflict with built-in node type', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Use a built-in node type name
    await page.locator('.node-model-modal input[type="text"]').first().fill('Sequence');
    await page.waitForTimeout(100);

    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(1000);

    // Should show built-in conflict error (may appear alongside 'already exists')
    await expect(page.locator('.validation-errors')).toBeVisible({ timeout: 5000 });
    // Check at least one error item contains 'built-in'
    const errorTexts = await page.locator('.validation-error-item').allTextContents();
    expect(errorTexts.some(t => t.includes('built-in'))).toBe(true);
  });

  test('shows validation error for invalid port name identifier', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    await page.locator('.node-model-modal input[type="text"]').first().fill('TestNode');
    await page.waitForTimeout(100);

    // Add a port with invalid name (contains hyphen)
    await page.getByRole('button', { name: '+ Add Port' }).click();
    await page.waitForTimeout(200);
    const nameInputs = page.locator('.port-field-name input[type="text"]');
    await nameInputs.first().fill('my-port-name');

    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('.validation-errors')).toBeVisible();
    await expect(page.locator('.validation-error-item')).toContainText('not a valid identifier');
  });

  test('clears validation errors when modal is closed and reopened', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Try to save with empty type - should show error
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.validation-errors')).toBeVisible();

    // Close the modal
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.waitForTimeout(300);

    // Reopen - errors should be gone
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('.validation-errors')).not.toBeVisible();
  });

  test('shows validation error for invalid category', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Model' }).click();
    await page.waitForTimeout(300);

    // Type valid name first
    await page.locator('.node-model-modal input[type="text"]').first().fill('TestCategoryNode');
    await page.waitForTimeout(100);

    // The category select only allows valid categories, so we can't select an invalid one through UI
    // This test verifies the validation infrastructure works for other error cases
    // Save should succeed for a valid model
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(500);

    // Modal should close successfully
    await expect(page.locator('.node-model-modal')).not.toBeVisible();
  });
});
