// tests/e2e/helpers/antd.js
// Helpers para interactuar con componentes de Ant Design en Playwright

/**
 * Abre un AntD Select por id del campo y selecciona una opción por texto.
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldId - id del Form.Item (= name del campo)
 * @param {string} optionText - texto visible de la opción a seleccionar
 */
export async function antdSelect(page, fieldId, optionText) {
  // Esperar a que el input del Select esté en el DOM
  await page.waitForSelector(`#${fieldId}`, { timeout: 10_000 });

  // Usar XPath para subir desde el input hasta .ant-select-selector y hacer click
  // Esto evita problemas con :has() y es más robusto con todas las versiones de AntD
  const selectorDiv = page.locator(`xpath=//div[contains(@class,"ant-select-selector")][.//input[@id="${fieldId}"]]`);
  await selectorDiv.click();

  const dropdown = page.locator('.ant-select-dropdown:visible');
  await dropdown.waitFor({ state: 'visible', timeout: 5_000 });

  // Intentar click directo (funciona cuando la lista es corta)
  const option = dropdown.getByText(optionText, { exact: true }).first();
  try {
    await option.click({ timeout: 3_000 });
  } catch {
    // Lista larga (showSearch): escribir en el input del wrapper para filtrar
    const antSelectInput = page.locator(`#${fieldId}`)
      .locator('xpath=ancestor::div[contains(@class,"ant-select")][1]')
      .locator('input').first();
    await antSelectInput.fill(optionText);
    await page.waitForTimeout(400);
    await dropdown.getByText(optionText, { exact: true }).first().click({ timeout: 5_000 });
  }

  await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Igual que antdSelect pero busca dentro de un localizador padre (ej: modal).
 */
export async function antdSelectInScope(scope, fieldId, optionText) {
  const page = scope.page ? scope.page() : scope;
  const selectorDiv = scope.locator(`xpath=.//div[contains(@class,"ant-select-selector")][.//input[@id="${fieldId}"]]`);
  await selectorDiv.click();

  const dropdown = page.locator('.ant-select-dropdown:visible');
  await dropdown.waitFor({ state: 'visible' });

  const option = dropdown.getByText(optionText, { exact: true }).first();
  try {
    await option.click({ timeout: 3_000 });
  } catch {
    await antSelect.locator('input').first().type(optionText, { delay: 40 });
    await page.waitForTimeout(400);
    await dropdown.getByText(optionText, { exact: true }).first().click({ timeout: 5_000 });
  }

  await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Selecciona la fecha de hoy en un AntD DatePicker.
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldId - id del campo fecha
 */
export async function pickToday(page, fieldId) {
  await page.locator(`#${fieldId}`).click();
  await page.locator('.ant-picker-today-btn').click();
  // Algunos DatePicker tienen botón OK (datetime pickers)
  const okBtn = page.locator('.ant-picker-ok button:not([disabled])');
  if (await okBtn.count() > 0) {
    await okBtn.first().click();
  }
  // Cerrar el popup si sigue abierto
  await page.locator('.ant-picker-dropdown').waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Extrae el UUID de la URL actual.
 * Ej: /v2/admin/entidades/abc-123/editar → 'abc-123'
 * @param {import('@playwright/test').Page} page
 * @param {string} segment - segmento que precede al UUID en la URL
 */
export function extractIdFromUrl(page, segment) {
  const url = page.url();
  const match = url.match(new RegExp(`${segment}/([^/]+)`));
  return match?.[1] ?? null;
}

/**
 * Espera a que desaparezca un spinner de carga de AntD.
 */
export async function waitForLoadingDone(page, timeout = 10_000) {
  await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout }).catch(() => {});
  await page.locator('.ant-skeleton-active').waitFor({ state: 'hidden', timeout }).catch(() => {});
}
