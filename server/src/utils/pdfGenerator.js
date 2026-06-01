'use strict';

/**
 * PDF Invoice Generator
 * Uses pdfkit to produce a professional, branded invoice PDF buffer.
 */

const PDFDocument = require('pdfkit');

// Brand colors (hex → for pdfkit fillColor)
const COLORS = {
  primary:   '#2563eb',
  dark:      '#0a0f1e',
  surface:   '#111827',
  textMain:  '#f1f5f9',
  textMuted: '#94a3b8',
  border:    '#1f2d45',
  success:   '#34d399',
  warning:   '#fbbf24',
  danger:    '#f87171',
};

const STATUS_COLOR = {
  draft:     COLORS.textMuted,
  sent:      COLORS.primary,
  paid:      COLORS.success,
  overdue:   COLORS.danger,
  cancelled: COLORS.textMuted,
};

/**
 * Generates a professional invoice PDF.
 * @param {Object} invoice  - Mongoose invoice document (populated)
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdf = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // usable width (margins)

      /* ── Header band ──────────────────────────────────────── */
      doc.rect(0, 0, doc.page.width, 110).fill(COLORS.dark);

      // Company name
      doc
        .fill(COLORS.textMain)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('VaultPay', 50, 35);

      doc
        .fill(COLORS.primary)
        .font('Helvetica')
        .fontSize(10)
        .text('Nexus Corporate Services', 50, 62);

      // "INVOICE" label top-right
      doc
        .fill(COLORS.textMain)
        .font('Helvetica-Bold')
        .fontSize(28)
        .text('INVOICE', 0, 30, { align: 'right' });

      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(10)
        .text(`# ${invoice.invoiceNumber}`, 0, 65, { align: 'right' });

      /* ── Meta row ─────────────────────────────────────────── */
      let y = 130;

      // Status badge
      const statusColor = STATUS_COLOR[invoice.status] || COLORS.textMuted;
      doc
        .fill(statusColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`STATUS: ${invoice.status.toUpperCase()}`, 50, y);

      // Dates (right side)
      const issueDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'N/A';

      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(9)
        .text(`Issue Date: ${issueDate}`, 0, y, { align: 'right' });

      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(9)
        .text(`Due Date: ${dueDate}`, 0, y + 14, { align: 'right' });

      /* ── Divider ──────────────────────────────────────────── */
      y += 35;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(COLORS.border).lineWidth(1).stroke();
      y += 20;

      /* ── Bill To ──────────────────────────────────────────── */
      doc
        .fill(COLORS.textMuted)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('BILL TO', 50, y);

      y += 14;
      doc
        .fill(COLORS.textMain)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(invoice.clientName, 50, y);

      y += 18;
      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(10)
        .text(invoice.clientEmail, 50, y);

      /* ── Line items table ─────────────────────────────────── */
      y += 45;

      // Table header
      doc.rect(50, y, pageWidth, 28).fill(COLORS.surface);

      doc
        .fill(COLORS.textMuted)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('DESCRIPTION', 60, y + 10)
        .text('QTY', 360, y + 10, { width: 50, align: 'center' })
        .text('UNIT PRICE', 420, y + 10, { width: 80, align: 'right' })
        .text('AMOUNT', 510, y + 10, { width: 80, align: 'right' });

      y += 28;

      // Rows
      invoice.items.forEach((item, idx) => {
        const rowBg = idx % 2 === 0 ? '#0d1525' : COLORS.dark;
        doc.rect(50, y, pageWidth, 28).fill(rowBg);

        const lineTotal = item.quantity * item.unitPrice;

        doc
          .fill(COLORS.textMain)
          .font('Helvetica')
          .fontSize(9)
          .text(item.description, 60, y + 10, { width: 280, ellipsis: true })
          .text(String(item.quantity), 360, y + 10, { width: 50, align: 'center' })
          .text(
            `$${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            420, y + 10, { width: 80, align: 'right' }
          )
          .text(
            `$${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            510, y + 10, { width: 80, align: 'right' }
          );

        y += 28;
      });

      /* ── Total ────────────────────────────────────────────── */
      y += 10;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
      y += 15;

      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(10)
        .text('TOTAL DUE', 0, y, { align: 'right', continued: false });

      y += 5;
      doc
        .fill(COLORS.primary)
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(
          `${invoice.currency} ${invoice.totalAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`,
          0, y, { align: 'right' }
        );

      /* ── Notes ────────────────────────────────────────────── */
      if (invoice.notes) {
        y += 50;
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
        y += 15;
        doc
          .fill(COLORS.textMuted)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('NOTES', 50, y);
        y += 14;
        doc
          .fill(COLORS.textMuted)
          .font('Helvetica')
          .fontSize(9)
          .text(invoice.notes, 50, y, { width: pageWidth, lineGap: 4 });
      }

      /* ── Footer ───────────────────────────────────────────── */
      const footerY = doc.page.height - 50;
      doc
        .fill(COLORS.textMuted)
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Generated by VaultPay · Nexus Corporate Services · This is an official invoice document.',
          50,
          footerY,
          { align: 'center', width: pageWidth }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePdf };
