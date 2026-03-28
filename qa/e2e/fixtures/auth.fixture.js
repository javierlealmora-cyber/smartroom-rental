import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const test = base.extend({
  // Fixture para autenticación
  authenticatedPage: async ({ page }, use) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Login programático
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword123',
    });

    if (error) {
      throw new Error(`Auth failed: ${error.message}`);
    }

    // Inyectar sesión en el navegador
    await page.goto('/');
    await page.evaluate((session) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }, data.session);

    await use(page);

    // Cleanup
    await supabase.auth.signOut();
  },
});

export { expect } from '@playwright/test';
