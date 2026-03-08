// tests/e2e/helpers/antd.js
// Helpers para interactuar con componentes de Ant Design en Playwright

/**
 * Abre un AntD Select por id del campo y selecciona una opción por texto.
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldId - id del Form.Item (= name del campo)
 * @param {string} optionText - texto visible de la opción a seleccionar
 */
export async function antdSelect(page, fieldId, optionText) {
  await page.locator(`#${fieldId}`).click();
  await page.locator('.ant-select-dropdown:visible')
    .getByText(optionText, { exact: true })
    .click();
  // Esperar a que el dropdown se cierre
  await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Igual que antdSelect pero busca dentro de un localizador padre (ej: modal).
 */
export async function antdSelectInScope(scope, fieldId, optionText) {
  await scope.locator(`#${fieldId}`).click();
  // El dropdown se renderiza en el body (fuera del modal), por eso usamos page
  const page = scope.page ? scope.page() : scope;
  await page.locator('.ant-select-dropdown:visible')
    .getByText(optionText, { exact: true })
    .click();
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
