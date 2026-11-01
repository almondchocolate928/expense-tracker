import { toISO, todayISO } from './dates'
import type { PendingImport } from './inbox'

const CURRENCY_CODES =
  'USD|EUR|GBP|JPY|CNY|TWD|INR|KRW|AUD|CAD|SGD|HKD|CHF|SEK|NOK|DKK|BRL|MXN|ZAR|AED|SAR|THB|MYR|IDR|PHP|VND|TRY|PLN|CZK'
const CURRENCY_SYMBOLS = '[$€£¥₹₩₽₺₪]'

const AMOUNT_PATTERNS = [
  new RegExp(`(?:${CURRENCY_SYMBOLS}|${CURRENCY_CODES})\\s*([0-9][0-9.,]*)`, 'i'),
  new RegExp(`([0-9][0-9.,]*)\\s*(?:${CURRENCY_CODES}|${CURRENCY_SYMBOLS})`, 'i'),
  /\b([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})\b/,
]

export interface ParsedImport {
  amount: string
  note: string
  date: string
}

function normalizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  if (!cleaned) return ''

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastComma > lastDot) {
    return cleaned.replace(/\./g, '').replace(',', '.')
  }
  return cleaned.replace(/,/g, '')
}

function extractAmount(text: string): string {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const amount = normalizeAmount(match[1])
    if (amount && Number(amount) > 0) return amount
  }
  return ''
}

function parseDate(item: PendingImport): string {
  const today = todayISO()
  const values = [item.notificationDate]
  if (Number.isFinite(item.createdAt)) {
    values.push(new Date(item.createdAt).toISOString())
  }

  for (const value of values) {
    if (!value) continue
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (value <= today) return value
      continue
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) continue
    const iso = toISO(date)
    if (iso <= today) return iso
  }
  return today
}

export function parsePendingImport(item: PendingImport): ParsedImport {
  const text = [item.title, item.subtitle, item.body].filter(Boolean).join(' · ')
  const fallback = (item.body || item.subtitle || item.title)
    .replace(/\s+/g, ' ')
    .trim()
  const merchant = text.match(/\b(?:at|from|to)\s+([A-Za-z0-9][^.,\n]{1,50})/i)?.[1]
  const note = (merchant?.trim() || fallback).slice(0, 80)

  return {
    amount: extractAmount(text),
    note,
    date: parseDate(item),
  }
}
