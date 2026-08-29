import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

export function buildInvoicePdf(invoice, settings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFillColor(7, 17, 31)
  doc.roundedRect(margin, 12, pageW - margin * 2, 35, 4, 4, 'F')

  if (settings.logo) {
    try { const fmt = settings.logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'; doc.addImage(settings.logo, fmt, margin + 6, 18, 22, 22) } catch {}
  }

  const titleX = settings.logo ? margin + 34 : margin + 6
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(settings.businessName || 'Smart Parts Billing', titleX, 25)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text((settings.address || 'Business address').slice(0, 80), titleX, 31)
  if (settings.phone) doc.text(settings.phone, titleX, 36)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('NON-GST INVOICE', pageW - margin - 6, 25, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoiceNo, pageW - margin - 6, 32, { align: 'right' })
  doc.text(invoice.date, pageW - margin - 6, 37, { align: 'right' })

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('BILL TO', margin, 58)
  doc.setFontSize(12)
  doc.text(invoice.customerName || '-', margin, 65)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (invoice.phone) doc.text(invoice.phone, margin, 71)
  if (invoice.address) doc.text(invoice.address.slice(0, 95), margin, 77)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Due Date', pageW - margin - 45, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.dueDate || '-', pageW - margin, 58, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text('Status', pageW - margin - 45, 65)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.status || 'Unpaid', pageW - margin, 65, { align: 'right' })

  const rows = invoice.items.map((item, i) => [
    String(i + 1),
    item.partNo || '-',
    item.description || '-',
    item.unit || '-',
    String(item.qty),
    money(item.rate),
    money(item.qty * item.rate),
  ])

  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['#', 'PART NO.', 'DESCRIPTION', 'UNIT', 'QTY', 'RATE', 'AMOUNT']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.3, lineColor: [218, 226, 237], lineWidth: 0.2, textColor: [20, 30, 45] },
    headStyles: { fillColor: [13, 32, 55], textColor: [255,255,255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 29 },
      2: { cellWidth: 58 },
      3: { cellWidth: 20 },
      4: { cellWidth: 13, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 27, halign: 'right' },
    },
  })

  let y = doc.lastAutoTable.finalY + 8
  const x1 = pageW - margin - 66
  const x2 = pageW - margin
  const summary = [
    ['Subtotal', money(invoice.subtotal)],
    ['Discount', `- ${money(invoice.discount)}`],
    ['Other charges', money(invoice.otherCharges)],
  ]
  doc.setFontSize(9)
  summary.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal'); doc.text(label, x1, y)
    doc.setFont('helvetica', 'bold'); doc.text(value, x2, y, { align: 'right' })
    y += 6
  })
  doc.setDrawColor(180, 193, 210)
  doc.line(x1, y - 2, x2, y - 2)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total', x1, y + 5)
  doc.text(money(invoice.total), x2, y + 5, { align: 'right' })

  const noteY = Math.max(y + 18, doc.lastAutoTable.finalY + 30)
  if (invoice.note) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('Note', margin, noteY)
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(invoice.note, 90), margin, noteY + 5)
  }
  if (settings.paymentDetails) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('Payment Details', margin, noteY + 17)
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(settings.paymentDetails, 90), margin, noteY + 22)
  }

  doc.setFontSize(7.5)
  doc.setTextColor(91, 105, 125)
  doc.text(settings.footerNote || 'Thank you for your business.', pageW / 2, 288, { align: 'center' })
  return doc
}

export function downloadInvoicePdf(invoice, settings) {
  buildInvoicePdf(invoice, settings).save(`${invoice.invoiceNo}.pdf`)
}

export async function shareInvoicePdf(invoice, settings) {
  const doc = buildInvoicePdf(invoice, settings)
  const blob = doc.output('blob')
  const file = new File([blob], `${invoice.invoiceNo}.pdf`, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: invoice.invoiceNo, text: `Invoice ${invoice.invoiceNo}`, files: [file] })
    return true
  }
  doc.save(`${invoice.invoiceNo}.pdf`)
  return false
}
