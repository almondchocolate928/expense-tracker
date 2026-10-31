import type { CategoryColor } from '../types'

export const CATEGORY_HEX: Record<CategoryColor, string> = {
  orange: '#FF9500',
  green: '#34C759',
  blue: '#007AFF',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#5AC8FA',
  yellow: '#FFCC00',
  gray: '#8E8E93',
}

/** A soft 14% tint of a category color, used behind the emoji. */
export function categoryTint(color: CategoryColor): string {
  return `${CATEGORY_HEX[color]}24`
}
