import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Basic App Functionality @smoke', () => {
  
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SmartRoom/);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/v2/auth/login');
    
    // Verificar que el formulario de login existe
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/v2/auth/login');
    
    // Intentar login con credenciales inválidas
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verificar mensaje de error
    await expect(page.locator('text=/invalid|error|incorrecto/i')).toBeVisible({ timeout: 5000 });
  });
});
