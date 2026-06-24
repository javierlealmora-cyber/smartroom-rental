// Utilidades de formateo centralizadas
// Evita duplicación de funciones de formateo en múltiples componentes

/**
 * Formatea una fecha ISO a formato español (DD/MM/YYYY)
 * @param {string} iso - Fecha en formato ISO
 * @returns {string} Fecha formateada o "-" si no hay fecha
 */
export function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric" 
  });
}

/**
 * Formatea una cantidad monetaria a euros
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada en euros o "-" si es null/undefined
 */
export function formatCurrency(amount) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("es-ES", { 
    style: "currency", 
    currency: "EUR" 
  }).format(amount);
}

/**
 * Formatea un número con separadores de miles
 * @param {number} value - Número a formatear
 * @returns {string} Número formateado o "-" si es null/undefined
 */
export function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-ES").format(value);
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor entre 0 y 1 (o 0-100 si usePercent es true)
 * @param {boolean} usePercent - Si el valor ya está en formato 0-100
 * @returns {string} Porcentaje formateado
 */
export function formatPercentage(value, usePercent = false) {
  if (value == null) return "-";
  const percent = usePercent ? value : value * 100;
  return `${percent.toFixed(1)}%`;
}

/**
 * Formatea un teléfono español
 * @param {string} phone - Número de teléfono
 * @returns {string} Teléfono formateado
 */
export function formatPhone(phone) {
  if (!phone) return "-";
  // Formato: +34 XXX XX XX XX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `+34 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Formatea una dirección completa
 * @param {Object} address - Objeto con campos de dirección
 * @returns {string} Dirección formateada
 */
export function formatAddress(address) {
  if (!address) return "-";
  
  const parts = [];
  
  // Compatibilidad con múltiples esquemas de dirección:
  // - address_street / street / address_line1
  // - address_number / number
  // - address_floor / floor / address_line2 (bloque/escalera)
  // - address_postal_code / postal_code
  // - address_city / city
  // - address_province / province
  // - address_country / country
  
  const street = address.address_street || address.street || address.address_line1 || "";
  const number = address.address_number || address.number || "";
  const floor = address.address_floor || address.floor || address.address_line2 || "";
  
  if (street) {
    let streetLine = street;
    if (number) streetLine += ` ${number}`;
    if (floor) streetLine += `, ${floor}`;
    parts.push(streetLine);
  }
  
  const postalCode = address.address_postal_code || address.postal_code || "";
  const city = address.address_city || address.city || "";
  
  if (postalCode || city) {
    let cityLine = '';
    if (postalCode) cityLine += postalCode;
    if (city) cityLine += (cityLine ? ' ' : '') + city;
    parts.push(cityLine);
  }
  
  const province = address.address_province || address.province || "";
  const country = address.address_country || address.country || "";
  
  if (province) parts.push(province);
  if (country) parts.push(country);
  
  return parts.length > 0 ? parts.join(', ') : "-";
}

/**
 * Formatea un nombre completo desde componentes
 * @param {Object} person - Objeto con first_name, last_name1, last_name2
 * @returns {string} Nombre completo
 */
export function formatFullName(person) {
  if (!person) return "-";
  
  const parts = [];
  if (person.first_name) parts.push(person.first_name);
  if (person.last_name1) parts.push(person.last_name1);
  if (person.last_name2) parts.push(person.last_name2);
  
  return parts.length > 0 ? parts.join(' ') : (person.full_name || "-");
}

/**
 * Formatea bytes a tamaño legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado (KB, MB, GB)
 */
export function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado con "..."
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Formatea una duración en días a texto legible
 * @param {number} days - Número de días
 * @returns {string} Duración formateada
 */
export function formatDuration(days) {
  if (days == null) return "-";
  
  if (days === 0) return "Hoy";
  if (days === 1) return "1 día";
  if (days < 30) return `${days} días`;
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months === 1 && remainingDays === 0) return "1 mes";
  if (remainingDays === 0) return `${months} meses`;
  
  return `${months} ${months === 1 ? 'mes' : 'meses'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`;
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} text - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formatea un DNI/NIE español
 * @param {string} dni - DNI o NIE
 * @returns {string} DNI formateado
 */
export function formatDNI(dni) {
  if (!dni) return "-";
  // Formato: 12345678-A
  const cleaned = dni.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }
  return dni;
}
