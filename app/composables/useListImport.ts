export interface ImportedRow {
  name: string
  phone: string
  amount: number
}

// Excel cells can hold strings, numbers, rich text, formula results, etc.
// Coerce any of those into a plain string we can trim/normalize.
function cellToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('result' in obj) return cellToString(obj.result)
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>)
        .map(t => t.text ?? '')
        .join('')
    }
    if ('text' in obj) return cellToString(obj.text)
  }
  return ''
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value
  const str = cellToString(value).replace(/[,\s]/g, '')
  const match = str.match(/-?\d+(\.\d+)?/)
  return match ? parseFloat(match[0]) : 0
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function useListImport() {
  async function downloadTemplate() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Rows')

    ws.columns = [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Amount', key: 'amount', width: 14 }
    ]
    ws.getRow(1).font = { bold: true }
    // Force the Phone column to text so leading zeros / + signs are preserved.
    ws.getColumn('phone').numFmt = '@'
    ws.getColumn('amount').numFmt = '#,##0.00'

    ws.addRow({ name: 'John Doe', phone: '0755030178', amount: 50000 })
    ws.addRow({ name: 'Jane Doe', phone: '+256755030179', amount: 25000 })

    const buf = await wb.xlsx.writeBuffer()
    download(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      'nameverify-template.xlsx'
    )
  }

  async function parseFile(file: File): Promise<ImportedRow[]> {
    const ExcelJS = (await import('exceljs')).default
    const buffer = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)

    const ws = wb.worksheets[0]
    if (!ws) return []

    const rows: ImportedRow[] = []
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return // header
      const name = cellToString(row.getCell(1).value).trim()
      const phone = cellToString(row.getCell(2).value).trim()
      const amount = parseAmount(row.getCell(3).value)
      if (name || phone || amount > 0) {
        rows.push({ name, phone, amount })
      }
    })
    return rows
  }

  return { downloadTemplate, parseFile }
}
