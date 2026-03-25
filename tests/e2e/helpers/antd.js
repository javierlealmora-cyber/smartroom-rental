// tests/e2e/helpers/antd.js
// Helpers para interactuar con componentes de Ant Design en Playwright

/**
 * Abre un AntD Select por id del campo y selecciona una opción por texto.
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldId - id del Form.Item (= name del campo)
 * @param {string} optionText - texto visible de la opción a seleccionar
 */
export async function antdSelect(page, fieldId, optionText) {
  // Esperar a que el input del Select esté en el DOM (attached, no visible — AntD lo oculta visualmente)
  await page.waitForSelector(`#${fieldId}`, { state: 'attached', timeout: 10_000 });

  // Esperar a que no haya dropdowns en animación de salida (.ant-slide-up-leave)
  // antes de abrir el siguiente. Evita el fallo de strict mode por múltiples dropdowns.
  await page.waitForFunction(
    () => !document.querySelector('.ant-select-dropdown.ant-slide-up-leave'),
    { timeout: 3_000 }
  ).catch(() => {});

  // Subir desde el input hasta el contenedor .ant-select y hacer click en él.
  const selectorDiv = page.locator(`.ant-select:has(#${fieldId})`).first();
  await selectorDiv.click();

  // Esperar confirmación de que el select está abierto (aria-expanded="true")
  await page.waitForSelector(`#${fieldId}[aria-expanded="true"]`, { timeout: 5_000 });

  // AntD añade dropdowns al final del DOM; .last() es el más reciente (el que acabamos de abrir)
  const dropdown = page.locator('.ant-select-dropdown').filter({
    hasNot: page.locator('.ant-slide-up-leave'),
  }).last();
  await dropdown.waitFor({ state: 'visible', timeout: 5_000 });

  // Intentar click directo (funciona cuando la lista es corta y no está virtualizada)
  const option = dropdown.getByText(optionText, { exact: true }).first();
  const isVisible = await option.isVisible().catch(() => false);

  if (isVisible) {
    await option.click({ timeout: 3_000 });
  } else {
    // Lista larga / virtualizada (rc-virtual-list): filtrar + seleccionar con teclado.
    // Solo funciona si el Select tiene showSearch (input no es readonly).
    const antSelectInput = page.locator(`#${fieldId}`);
    // getAttribute('readonly') returns "" (truthy) or "readonly" when attribute exists, null when absent
    const readonlyAttr = await antSelectInput.getAttribute('readonly').catch(() => null);
    const isReadonly = readonlyAttr !== null;
    if (!isReadonly) {
      await antSelectInput.fill(optionText);
      await page.waitForTimeout(400);
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      if (dropdownVisible) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        await page.keyboard.press('Enter');
      }
    } else {
      // Select sin búsqueda y opción no visible: navegar con teclado directamente
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      await page.keyboard.press('Enter');
    }
  }

  await dropdown.waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Igual que antdSelect pero busca dentro de un localizador padre (ej: modal).
 */
export async function antdSelectInScope(scope, fieldId, optionText) {
  const page = scope.page ? scope.page() : scope;
  const selectorDiv = scope.locator(`.ant-select:has(#${fieldId})`).first();
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
  // Esperar a que el calendario abra
  const picker = page.locator('.ant-picker-dropdown').first();
  await picker.waitFor({ state: 'visible', timeout: 5_000 });

  // Intentar hacer click en "Hoy" (puede ser link .ant-picker-today-btn o listitem)
  const todayBtn = picker.locator('.ant-picker-today-btn').first();
  const todayBtnVisible = await todayBtn.isVisible().catch(() => false);
  if (todayBtnVisible) {
    await todayBtn.click({ timeout: 3_000 });
  } else {
    // Fallback: click con force (puede estar fuera del viewport)
    await todayBtn.click({ force: true, timeout: 3_000 }).catch(async () => {
      // Último recurso: click en la celda de "hoy" en el calendario
      await picker.locator('.ant-picker-cell-today .ant-picker-cell-inner').first()
        .click({ timeout: 3_000 }).catch(() => {});
    });
  }

  // Algunos DatePicker tienen botón OK (datetime pickers)
  const okBtn = page.locator('.ant-picker-ok button:not([disabled])');
  if (await okBtn.count() > 0) {
    await okBtn.first().click();
  }
  // Cerrar el popup si sigue abierto
  await page.locator('.ant-picker-dropdown').first().waitFor({ state: 'hidden' }).catch(() => {});
}

/**
 * Selecciona una fecha específica en un AntD DatePicker escribiéndola directamente.
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldId - id del campo fecha
 * @param {string} dateStr - fecha en formato YYYY-MM-DD
 */
export async function pickDate(page, fieldId, dateStr) {
  const input = page.locator(`#${fieldId}`);
  await input.click();
  const picker = page.locator('.ant-picker-dropdown').first();
  await picker.waitFor({ state: 'visible', timeout: 5_000 });

  // Limpiar y escribir la fecha — AntD acepta input de texto en formato de locale
  await input.fill('');
  // Formato DD/MM/YYYY (locale es-ES)
  const [y, m, d] = dateStr.split('-');
  await input.fill(`${d}/${m}/${y}`);
  await page.keyboard.press('Enter');

  const okBtn = page.locator('.ant-picker-ok button:not([disabled])');
  if (await okBtn.count() > 0) await okBtn.first().click();
  await page.locator('.ant-picker-dropdown').first().waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {});
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
