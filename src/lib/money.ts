/**
 * Money is stored as an integer in the currency's minor unit. Input is kept as
 * a plain string ("12.5") while typing so we never mutate a float.
 */

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  EE: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  IN: 'INR',
  JP: 'JPY',
  CN: 'CNY',
  TW: 'TWD',
  MO: 'MOP',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  KR: 'KRW',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  TR: 'TRY',
  RU: 'RUB',
  UA: 'UAH',
  BR: 'BRL',
  MX: 'MXN',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  ZA: 'ZAR',
  AE: 'AED',
  SA: 'SAR',
  IL: 'ILS',
  EG: 'EGP',
  NG: 'NGN',
  KE: 'KES',
  TH: 'THB',
  VN: 'VND',
  ID: 'IDR',
  MY: 'MYR',
  PH: 'PHP',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
}

export function getLocale(): string {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en-US'
  return navigator.language
}

export function detectCurrency(locale = getLocale()): string {
  try {
    const region = new Intl.Locale(locale).region
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region]
  } catch {
    // Fall through to the default.
  }
  return 'USD'
}

export function currencyFractionDigits(currency: string, locale: string): number {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

export function decimalSeparator(locale: string): string {
  try {
    return (
      new Intl.NumberFormat(locale)
        .formatToParts(1.1)
        .find((part) => part.type === 'decimal')?.value ?? '.'
    )
  } catch {
    return '.'
  }
}

export function currencySymbol(currency: string, locale: string): string {
  try {
    return (
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(1)
        .find((part) => part.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  const digits = currencyFractionDigits(currency, locale)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(minor / 10 ** digits)
  } catch {
    return `${currency} ${(minor / 10 ** digits).toFixed(digits)}`
  }
}

/** Add grouping to the integer part while preserving a typed trailing ".". */
export function groupAmountEntry(entry: string, locale: string): string {
  if (entry === '') return '0'
  const [rawInteger = '', fraction] = entry.split('.')
  const integer = rawInteger === '' ? '0' : rawInteger
  let grouped: string
  try {
    grouped = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(Number(integer))
  } catch {
    grouped = integer
  }
  if (fraction === undefined) return grouped
  return `${grouped}${decimalSeparator(locale)}${fraction}`
}

export function inputToMinor(
  entry: string,
  currency: string,
  locale: string,
): number {
  const digits = currencyFractionDigits(currency, locale)
  const separator = decimalSeparator(locale)
  const normalized = entry.split(separator).join('.')
  const [rawInteger = '0', rawFraction = ''] = normalized.split('.')
  const integer = Number(rawInteger.replace(/\D/g, '') || '0')
  const fraction = rawFraction
    .replace(/\D/g, '')
    .slice(0, digits)
    .padEnd(digits, '0')
  return integer * 10 ** digits + Number(fraction || '0')
}

/** Convert stored minor units back into the plain entry string ("12.50"). */
export function minorToEntry(
  minor: number,
  currency: string,
  locale: string,
): string {
  const digits = currencyFractionDigits(currency, locale)
  if (digits === 0) return String(Math.trunc(minor))
  return (minor / 10 ** digits).toFixed(digits)
}

/** Handle one press on the custom amount keypad. */
export function applyAmountKey(
  entry: string,
  key: string,
  fractionDigits: number,
): string {
  if (key === 'back') return entry.slice(0, -1)
  if (key === '.') {
    if (fractionDigits === 0 || entry.includes('.')) return entry
    return entry === '' ? '0.' : `${entry}.`
  }
  if (!/^\d$/.test(key)) return entry

  if (entry.includes('.')) {
    const [, fraction = ''] = entry.split('.')
    return fraction.length >= fractionDigits ? entry : entry + key
  }

  if (entry.replace('.', '').length >= 9) return entry
  const next = entry === '0' ? key : entry + key
  return next.replace(/^0+(?=\d)/, '')
}
