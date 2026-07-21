const PDFDocument = require('pdfkit-table');
const { parseLineItemsEncryptedPayload, decryptText } = require('./invoiceEncryption');
const { getActiveInvoiceSecretPhrase } = require('../services/invoiceSecret.service');

const generateInvoicePDF = async (invoice, template, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    try {
        const tData = template.templateData || {};
        
        // 1. Header (Title)
        doc.fontSize(22).font('Helvetica-Bold').text(tData.title || 'Invoice', { align: 'right' });
        doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: 'right' });
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);

        // 2. Company & Client Details
        const companySection = tData.companySection || { showGstin: true, showAddress: true };
        const clientSection = tData.clientSection || { showGstin: true, showAddress: true };

        doc.fontSize(12).font('Helvetica-Bold').text('From:', 50, doc.y);
        doc.font('Helvetica').fontSize(10).text('SkyrakSys Technologies', 50, doc.y + 15);
        if (companySection.showAddress) {
            doc.text('123 Tech Park, Innovation Drive', 50, doc.y);
            doc.text('City, State, 12345', 50, doc.y);
        }
        if (companySection.showGstin) {
            doc.text('GSTIN: 22AAAAA0000A1Z5', 50, doc.y);
        }

        doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 350, doc.y - (companySection.showAddress ? 45 : 15));
        doc.font('Helvetica').fontSize(10).text(invoice.clientName, 350, doc.y);
        if (clientSection.showAddress && invoice.clientAddress) {
            doc.text(invoice.clientAddress, 350, doc.y);
        }
        if (clientSection.showGstin && invoice.clientGstin) {
            doc.text(`GSTIN: ${invoice.clientGstin}`, 350, doc.y);
        }

        doc.moveDown(3);

        // 3. Line Items Table
        let secretPhrase = await getActiveInvoiceSecretPhrase();
        
        let lineItems = [];
        if (invoice.lineItemsEncrypted) {
             const decryptedItemsStr = decryptText(invoice.lineItemsEncrypted, secretPhrase);
             lineItems = JSON.parse(decryptedItemsStr);
        }

        const table = {
            title: "Services Rendered",
            headers: [
                { label: "Description", property: 'description', width: 200 },
                { label: "Hours", property: 'hours', width: 60, align: "right" },
                { label: "Rate", property: 'rate', width: 60, align: "right" },
                { label: "Amount", property: 'amount', width: 100, align: "right" }
            ],
            rows: lineItems.map(item => [
                item.description || item.employeeName || 'Service',
                item.hoursSupported?.toString() || '0',
                `${template.currency || '$'} ${item.hourlyRate || 0}`,
                `${template.currency || '$'} ${item.amount || 0}`
            ])
        };

        await doc.table(table, {
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
            prepareRow: (row, i) => doc.font('Helvetica').fontSize(10),
            padding: 5,
        });

        doc.moveDown(2);

        // 4. Totals
        const totalsX = 350;
        doc.font('Helvetica-Bold').fontSize(10).text('Subtotal:', totalsX, doc.y);
        doc.font('Helvetica').text(`${template.currency || '$'} ${invoice.subtotal}`, totalsX + 100, doc.y - 12, { align: 'right' });
        
        doc.font('Helvetica-Bold').text('Tax Amount:', totalsX, doc.y + 5);
        doc.font('Helvetica').text(`${template.currency || '$'} ${invoice.taxAmount}`, totalsX + 100, doc.y - 12, { align: 'right' });
        
        doc.font('Helvetica-Bold').fontSize(12).text('Total:', totalsX, doc.y + 10);
        doc.text(`${template.currency || '$'} ${invoice.totalAmount}`, totalsX + 100, doc.y - 14, { align: 'right' });

        doc.moveDown(4);

        // 5. Terms & Conditions
        if (tData.termsAndConditions) {
            doc.font('Helvetica-Bold').fontSize(10).text('Terms & Conditions:');
            doc.font('Helvetica').fontSize(9).text(tData.termsAndConditions);
            doc.moveDown(2);
        }

        // 6. Footer
        if (tData.footerNote) {
            doc.font('Helvetica-Oblique').fontSize(8).text(tData.footerNote, 50, 750, { align: 'center' });
        }

    } catch (error) {
        console.error('Error generating Invoice PDF:', error);
        doc.end();
    } finally {
        doc.end();
    }
};

module.exports = { generateInvoicePDF };
