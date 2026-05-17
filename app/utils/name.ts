function tokens(name: string): string[] {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Compare a user-entered name against the telco-returned name.
// 'matched' if every user-entered word appears in the telco name
// (case- and diacritic-insensitive, ignoring punctuation/order).
export function compareNames(input: string, telco: string): 'matched' | 'mismatch' {
  const a = tokens(input)
  const b = tokens(telco)
  if (!a.length || !b.length) return 'mismatch'
  const set = new Set(b)
  return a.every(t => set.has(t)) ? 'matched' : 'mismatch'
}
