import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five',
  'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty',
  'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

function twoDigits(n) {
  n = Math.floor(n)
  if (n < 20) return ones[n]
  return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim()
}

function threeDigits(n) {
  let out = ''
  if (n >= 100) {
    out += `${ones[Math.floor(n / 100)]} Hundred`
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
  const rupees = Math.floor(value)
  const paise = Math.round((value - rupees) * 100)

  let text = `Rupees ${integerWordsIndian(rupees)}`

  if (paise) {
    text += ` and ${integerWordsIndian(paise)} Paise`
  }

  return `${text} Only`
}

export function buildInvoicePdf(invoice, settings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const margin = 14

  // HEADER
  doc.setFillColor(7, 17, 31)
  doc.roundedRect(
    margin,
    12,
    pageW - margin * 2,
    35,
    4,
    4,
    'F'
  )

  if (settings.logo) {
    try {
      const fmt = settings.logo.startsWith('data:image/jpeg')
        ? 'JPEG'
        : 'PNG'

      doc.addImage(
        settings.logo,
        fmt,
        margin + 6,
        18,
        22,
        22
      )
    } catch {}
  }

  const titleX = settings.logo ? margin + 34 : margin + 6

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)

  doc.text(
    settings.businessName || 'Smart Parts Billing',
    titleX,
    24
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)

  if (settings.address) {
    doc.text(
      String(settings.address).slice(0, 78),
      titleX,
      30
    )
  }

  if (settings.phone) {
    doc.text(
      `Mob: ${settings.phone}`,
      titleX,
      35
    )
  }

  if (settings.pan) {
    doc.text(
      `PAN: ${settings.pan}`,
      titleX,
      40
    )
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)

  doc.text(
    'INVOICE',
    pageW - margin - 6,
    24,
    { align: 'right' }
  )

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  doc.text(
    invoice.invoiceNo,
    pageW - margin - 6,
    31,
    { align: 'right' }
  )

  doc.text(
    invoice.date,
    pageW - margin - 6,
    37,
    { align: 'right' }
  )

  // CUSTOMER
  doc.setTextColor(15, 23, 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('BILL TO', margin, 58)

  doc.setFontSize(12)
  doc.text(
    invoice.customerName || '-',
    margin,
    65
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  let customerY = 71

  if (invoice.phone) {
    doc.text(invoice.phone, margin, customerY)
    customerY += 6
  }

  if (invoice.address) {
    const address = doc.splitTextToSize(
      invoice.address,
      105
    )

    doc.text(address, margin, customerY)
  }

  // DATE / STATUS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  doc.text(
    'Due Date',
    pageW - margin - 45,
    58
  )

  doc.setFont('helvetica', 'normal')

  doc.text(
    invoice.dueDate || '-',
    pageW - margin,
    58,
    { align: 'right' }
  )

  doc.setFont('helvetica', 'bold')

  doc.text(
    'Status',
    pageW - margin - 45,
    65
  )

  doc.setFont('helvetica', 'normal')

  doc.text(
    invoice.status || 'Unpaid',
    pageW - margin,
    65,
    { align: 'right' }
  )

  // ITEMS
  const rows = invoice.items.map((item, i) => [
    String(i + 1),
    item.partNo || '-',
    item.description || '-',
    item.size || '-',
    String(item.qty || 0),
    money(item.rate),
    money(
      Number(item.qty || 0) *
      Number(item.rate || 0)
    ),
  ])

  autoTable(doc, {
    startY: 86,

    margin: {
      left: margin,
      right: margin
    },

    head: [[
      '#',
      'PART NO.',
      'DESCRIPTION',
      'SIZE',
      'QTY',
      'RATE',
      'AMOUNT'
    ]],

    body: rows,

    theme: 'grid',

    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      lineColor: [218, 226, 237],
      lineWidth: 0.2,
      textColor: [20, 30, 45],
      valign: 'middle'
    },

    headStyles: {
      fillColor: [13, 32, 55],
      textColor: [255,255,255],
      fontStyle: 'bold'
    },

    columnStyles: {
      0: {
        cellWidth: 8,
        halign: 'center'
      },

      1: {
        cellWidth: 27
      },

      2: {
        cellWidth: 56
      },

      3: {
        cellWidth: 18,
        halign: 'center'
      },

      4: {
        cellWidth: 14,
        halign: 'right'
      },

      5: {
        cellWidth: 26,
        halign: 'right'
      },

      6: {
        cellWidth: 31,
        halign: 'right'
      }
    }
  })

  let y = doc.lastAutoTable.finalY + 8

  // If table is long, move totals to a clean page
  if (y > 218) {
    doc.addPage()
    y = 22
  }

  const x1 = pageW - margin - 70
  const x2 = pageW - margin

  const summary = [
    [
      'Subtotal',
      money(invoice.subtotal)
    ],

    [
      'Discount',
      `- ${money(invoice.discount)}`
    ],

    [
      'Other Charges',
      money(invoice.otherCharges)
    ]
  ]

  doc.setFontSize(9)

  summary.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, x1, y)

    doc.setFont('helvetica', 'bold')
    doc.text(
      value,
      x2,
      y,
      { align: 'right' }
    )

    y += 6
  })

  doc.setDrawColor(180, 193, 210)

  doc.line(
    x1,
    y - 2,
    x2,
    y - 2
  )

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')

  doc.text(
    'Grand Total',
    x1,
    y + 5
  )

  doc.text(
    money(invoice.total),
    x2,
    y + 5,
    { align: 'right' }
  )

  // AMOUNT IN WORDS
  let detailsY = y + 17

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')

  doc.text(
    'AMOUNT IN WORDS',
    margin,
    detailsY
  )

  doc.setFont('helvetica', 'normal')

  const words = doc.splitTextToSize(
    amountInWords(invoice.total),
    pageW - margin * 2
  )

  doc.text(
    words,
    margin,
    detailsY + 5
  )

  detailsY += 13

  // NOTE
  if (invoice.note) {
    doc.setFont('helvetica', 'bold')
    doc.text(
      'Note',
      margin,
      detailsY
    )

    doc.setFont('helvetica', 'normal')

    const note = doc.splitTextToSize(
      invoice.note,
      95
    )

    doc.text(
      note,
      margin,
      detailsY + 5
    )

    detailsY +=
      7 + note.length * 4
  }

  // PAYMENT DETAILS
  if (settings.paymentDetails) {
    doc.setFont('helvetica', 'bold')

    doc.text(
      'Payment Details',
      margin,
      detailsY
    )

    doc.setFont('helvetica', 'normal')

    const payment = doc.splitTextToSize(
      settings.paymentDetails,
      95
    )

    doc.text(
      payment,
      margin,
      detailsY + 5
    )
  }

  // AUTHORIZED SIGNATURE
  const signatureY = Math.min(
    pageH - 30,
    Math.max(detailsY + 16, 236)
  )

  doc.setDrawColor(160, 175, 195)

  doc.line(
    pageW - margin - 54,
    signatureY,
    pageW - margin,
    signatureY
  )

  doc.setFont(
    'helvetica',
    'bold'
  )

  doc.setFontSize(8)

  doc.text(
    'Authorized Signature',
    pageW - margin - 27,
    signatureY + 5,
    { align: 'center' }
  )

  doc.setFont(
    'helvetica',
    'normal'
  )

  doc.setFontSize(7.5)

  doc.text(
    settings.businessName || '',
    pageW - margin - 27,
    signatureY + 10,
    { align: 'center' }
  )

  // FOOTER
  doc.setFontSize(7.5)
  doc.setTextColor(91, 105, 125)

  doc.text(
    settings.footerNote ||
      'Thank you for your business.',
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  )

  return doc
}

export function downloadInvoicePdf(
  invoice,
  settings
) {
  buildInvoicePdf(
    invoice,
    settings
  ).save(`${invoice.invoiceNo}.pdf`)
}

export async function shareInvoicePdf(
  invoice,
  settings
) {
  const doc = buildInvoicePdf(
    invoice,
    settings
  )

  const blob = doc.output('blob')

  const file = new File(
    [blob],
    `${invoice.invoiceNo}.pdf`,
    { type: 'application/pdf' }
  )

  if (
    navigator.canShare?.({
      files: [file]
    })
  ) {
    await navigator.share({
      title: invoice.invoiceNo,
      text: `Invoice ${invoice.invoiceNo}`,
      files: [file]
    })

    return true
  }

  doc.save(
    `${invoice.invoiceNo}.pdf`
  )

  return false
}
