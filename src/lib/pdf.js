import jsPDFPackage from 'jspdf'
import autoTablePackage from 'jspdf-autotable'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const jsPDF = jsPDFPackage.jsPDF || jsPDFPackage
const autoTable = autoTablePackage.default || autoTablePackage

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  n = Math.floor(Number(n) || 0)
  if (n < 20) return ones[n]
  return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim()
}

function threeDigits(n) {
  n = Math.floor(Number(n) || 0)
  let out = ''
  if (n >= 100) {
    out = `${ones[Math.floor(n / 100)]} Hundred`
    n %= 100
    if (n) out += ' '
  }
  if (n) out += twoDigits(n)
  return out.trim()
}

function integerWordsIndian(n) {
  n = Math.floor(Number(n) || 0)
  if (n === 0) return 'Zero'

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000

  const parts = []
  if (crore) parts.push(`${integerWordsIndian(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (n) parts.push(threeDigits(n))
  return parts.join(' ')
}

function amountInWords(amount) {
  const value = Math.max(0, Number(amount || 0))
  let rupees = Math.floor(value)
  let paise = Math.round((value - rupees) * 100)
  if (paise === 100) {
    rupees += 1
    paise = 0
  }
  let text = `Rupees ${integerWordsIndian(rupees)}`
  if (paise) text += ` and ${integerWordsIndian(paise)} Paise`
  return `${text} Only`
}

function ensureRoom(doc, y, needed = 48) {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed <= pageH - 14) return y
  doc.addPage()
  return 20
}

export function buildInvoicePdf(invoice, settings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14

  // Header
  doc.setFillColor(24, 87, 213)
  doc.roundedRect(margin, 12, pageW - margin * 2, 43, 4, 4, 'F')

  if (settings.logo) {
    try {
      const fmt = settings.logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
      doc.addImage(settings.logo, fmt, margin + 6, 20, 22, 22)
    } catch {}
  }

  const titleX = settings.logo ? margin + 34 : margin + 6
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const businessLines = doc.splitTextToSize(settings.businessName || 'Smart Parts Billing', 88).slice(0, 2)
  doc.text(businessLines, titleX, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.7)
  let businessMetaY = 27 + Math.max(0, businessLines.length - 1) * 5
  if (settings.address) {
    const businessAddress = doc.splitTextToSize(String(settings.address), 88).slice(0, 2)
    doc.text(businessAddress, titleX, businessMetaY)
    businessMetaY += businessAddress.length * 3.7
  }
  if (settings.phone) { doc.text(`Mob: ${settings.phone}`, titleX, businessMetaY); businessMetaY += 4 }
  if (settings.pan) doc.text(`PAN: ${settings.pan}`, titleX, businessMetaY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('NON-GST INVOICE', pageW - margin - 6, 23, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(invoice.invoiceNo || '-', pageW - margin - 6, 31, { align: 'right' })
  doc.text(invoice.date || '-', pageW - margin - 6, 38, { align: 'right' })

  // Customer block
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('BILL TO', margin, 67)
  doc.setFontSize(12)
  const customerNameLines = doc.splitTextToSize(invoice.customerName || '-', 140).slice(0, 2)
  doc.text(customerNameLines, margin, 74)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let customerY = 76 + customerNameLines.length * 5
  if (invoice.phone) {
    doc.text(String(invoice.phone), margin, customerY)
    customerY += 5
  }
  if (invoice.address) {
    const addressLines = doc.splitTextToSize(String(invoice.address), 140)
    doc.text(addressLines, margin, customerY)
    customerY += addressLines.length * 4
  }

  // Item table
  const startY = Math.max(92, customerY + 5)
  const rows = (invoice.items || []).map((item, i) => [
    String(i + 1),
    item.partNo || '-',
    item.description || '-',
    item.size || '-',
    String(item.qty || 0),
    money(item.rate),
    money(Number(item.qty || 0) * Number(item.rate || 0)),
  ])

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['#', 'PART NO.', 'DESCRIPTION', 'SIZE', 'QTY', 'RATE', 'AMOUNT']],
    body: rows,
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      lineColor: [218, 226, 237],
      lineWidth: 0.2,
      textColor: [20, 30, 45],
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [24, 87, 213],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 27 },
      2: { cellWidth: 58 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 31, halign: 'right' },
    },
  })

  let y = ensureRoom(doc, doc.lastAutoTable.finalY + 8, 76)
  const x1 = pageW - margin - 78
  const x2 = pageW - margin

  const summary = [
    ['Subtotal', money(invoice.subtotal)],
    ['Discount', `- ${money(invoice.discount)}`],
    ['Other Charges', money(invoice.otherCharges)],
  ]

  doc.setFillColor(247, 249, 252)
  doc.setDrawColor(205, 215, 228)
  doc.roundedRect(x1, y - 5, 78, 34, 2.5, 2.5, 'FD')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8.5)
  summary.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, x1 + 5, y)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x2 - 5, y, { align: 'right' })
    y += 5.5
  })

  doc.setFillColor(24, 87, 213)
  doc.roundedRect(x1 + 2, y - 2, 74, 11, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Grand Total', x1 + 6, y + 5)
  doc.text(money(invoice.total), x2 - 6, y + 5, { align: 'right' })

  y += 20
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('AMOUNT IN WORDS', margin, y)
  doc.setFont('helvetica', 'normal')
  const words = doc.splitTextToSize(amountInWords(invoice.total), pageW - margin * 2)
  doc.text(words, margin, y + 5)
  y += 8 + words.length * 4

  if (invoice.note) {
    y = ensureRoom(doc, y, 28)
    doc.setFont('helvetica', 'bold')
    doc.text('Note', margin, y)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(String(invoice.note), 105)
    doc.text(noteLines, margin, y + 5)
    y += 8 + noteLines.length * 4
  }

  // Clean signature area. No challan / PO / payment fields.
  y = ensureRoom(doc, y + 8, 30)
  const signatureX1 = pageW - margin - 58
  const signatureX2 = pageW - margin
  doc.setDrawColor(160, 175, 195)
  doc.line(signatureX1, y + 8, signatureX2, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Authorized Signature', (signatureX1 + signatureX2) / 2, y + 13, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(settings.businessName || '', (signatureX1 + signatureX2) / 2, y + 18, { align: 'center' })

  // Footer and page number on every page
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(220, 226, 235)
    doc.line(margin, pageH - 13, pageW - margin, pageH - 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(91, 105, 125)
    const footer = doc.splitTextToSize(settings.footerNote || 'Thank you for your business.', pageW - margin * 2 - 30)[0]
    doc.text(footer, margin, pageH - 8)
    doc.text(`Page ${page} of ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' })
  }

  return doc
}

const pdfFileName = (invoice) => `${String(invoice.invoiceNo || 'invoice').replace(/[^a-z0-9_-]/gi, '-')}.pdf`

async function writeNativePdf(doc, invoice) {
  const dataUri = doc.output('datauristring')
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
  return Filesystem.writeFile({
    path: `invoices/${pdfFileName(invoice)}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  })
}

export async function downloadInvoicePdf(invoice, settings) {
  const doc = buildInvoicePdf(invoice, settings)
  if (Capacitor.isNativePlatform()) {
    const file = await writeNativePdf(doc, invoice)
    await Share.share({
      title: invoice.invoiceNo,
      text: `Invoice ${invoice.invoiceNo}`,
      files: [file.uri],
      dialogTitle: 'Save or open invoice PDF',
    })
    return { native: true, shared: true, downloaded: false }
  }

  doc.save(pdfFileName(invoice))
  return { native: false, shared: false, downloaded: true }
}

export async function shareInvoicePdf(invoice, settings) {
  const doc = buildInvoicePdf(invoice, settings)
  if (Capacitor.isNativePlatform()) {
    const file = await writeNativePdf(doc, invoice)
    await Share.share({
      title: invoice.invoiceNo,
      text: `Invoice ${invoice.invoiceNo}`,
      files: [file.uri],
      dialogTitle: 'Share invoice PDF',
    })
    return { native: true, shared: true, downloaded: false }
  }

  const blob = doc.output('blob')
  const file = new File([blob], pdfFileName(invoice), { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: invoice.invoiceNo, text: `Invoice ${invoice.invoiceNo}`, files: [file] })
    return { native: false, shared: true, downloaded: false }
  }

  doc.save(pdfFileName(invoice))
  return { native: false, shared: false, downloaded: true }
}
