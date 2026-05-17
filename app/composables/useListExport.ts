import type { ListRow, LookupStatus } from '~/types/db'

interface ExportContext {
  title: string
  createdAt: string
  rows: ListRow[]
}

const STATUS_LABELS: Record<LookupStatus, string> = {
  matched: 'Matched',
  mismatch: 'Mismatch',
  not_found: 'Not found',
  error: 'Error'
}

function statusLabel(s: LookupStatus | null | undefined): string {
  return s ? STATUS_LABELS[s] : ''
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'list'
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

export function useListExport() {
  async function exportExcel(ctx: ExportContext) {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('List')

    ws.columns = [
      { header: '#', key: 'n', width: 6 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Telco name', key: 'telco', width: 28 },
      { header: 'Status', key: 'status', width: 14 }
    ]
    ws.getRow(1).font = { bold: true }

    ctx.rows.forEach((r, i) => {
      ws.addRow({
        n: i + 1,
        name: r.name,
        phone: r.phone,
        amount: Number(r.amount),
        telco: r.telco_name ?? '',
        status: statusLabel(r.lookup_status)
      })
    })

    ws.getColumn('amount').numFmt = '#,##0.00'

    const buf = await wb.xlsx.writeBuffer()
    download(
      new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      `${slugify(ctx.title)}.xlsx`
    )
  }

  async function exportPdf(ctx: ExportContext) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(ctx.title, 14, 18)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Created: ${new Date(ctx.createdAt).toLocaleString()}`, 14, 26)
    doc.text(`Rows: ${ctx.rows.length}`, 14, 32)

    const total = ctx.rows.reduce((s, r) => s + Number(r.amount), 0)
    doc.text(`Total: ${total.toLocaleString()}`, 14, 38)

    autoTable(doc, {
      startY: 44,
      head: [['#', 'Name', 'Phone', 'Amount', 'Telco name', 'Status']],
      body: ctx.rows.map((r, i) => [
        String(i + 1),
        r.name,
        r.phone,
        Number(r.amount).toLocaleString(),
        r.telco_name ?? '',
        statusLabel(r.lookup_status)
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] }
    })

    doc.save(`${slugify(ctx.title)}.pdf`)
  }

  return { exportExcel, exportPdf }
}
