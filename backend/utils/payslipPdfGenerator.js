const puppeteer = require('puppeteer');
const LogHelper = require('./logHelper');
const { logger } = require('../config/logger');
const { formatDateIN } = require('./dateUtils');

/**
 * Generate HTML template for payslip PDF
 */
const generatePayslipHTML = (employee, payslipData, companyInfo) => {
  const {
    month = 'N/A',
    totalWorkingDays = 0,
    lopDays = 0,
    paidDays = 0,
    earnings = {},
    deductions = {},
    paymentMode = 'N/A',
    disbursementDate = formatDateIN()
  } = payslipData;

  // Calculate totals
  const grossSalary = Object.values(earnings).reduce((sum, amount) => sum + (amount || 0), 0);
  const totalDeductions = Object.values(deductions).reduce((sum, amount) => sum + (amount || 0), 0);
  const netPay = grossSalary - totalDeductions;

  const formatCurrency = (amount) => {
    return amount > 0 ? `₹${amount.toFixed(2)}` : 'NA';
  };

  const numberToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (amount === 0) return 'Zero Rupees Only';
    
    const numStr = Math.floor(amount).toString();
    const len = numStr.length;
    
    if (len > 7) return `${amount.toLocaleString('en-IN')} Rupees Only`;
    if (len > 5) {
      const lakhs = Math.floor(amount / 100000);
      const remainder = amount % 100000;
      const lakhsWord = lakhs < 100 ? convertTwoDigit(lakhs) : convertThreeDigit(lakhs);
      if (remainder === 0) return `${lakhsWord} Lakh Rupees Only`;
      return `${lakhsWord} Lakh ${convertUpToThousands(remainder)} Rupees Only`;
    }
    
    return `${convertUpToThousands(amount)} Rupees Only`;
  };

  const convertTwoDigit = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num < 10) return ones[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return `${tens[ten]} ${ones[one]}`.trim();
  };

  const convertThreeDigit = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    if (remainder === 0) return `${ones[hundred]} Hundred`;
    return `${ones[hundred]} Hundred ${convertTwoDigit(remainder)}`;
  };

  const convertUpToThousands = (num) => {
    if (num < 100) return convertTwoDigit(num);
    if (num < 1000) return convertThreeDigit(num);
    
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandWord = thousand < 10 ? convertTwoDigit(thousand) : convertThreeDigit(thousand);
    
    if (remainder === 0) return `${thousandWord} Thousand`;
    return `${thousandWord} Thousand ${convertThreeDigit(remainder)}`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${month}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    
    .payslip-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #333;
      padding: 15px;
    }
    
    .payslip-header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .company-info {
      font-size: 9px;
      margin-bottom: 8px;
    }
    
    .payslip-title {
      font-size: 16px;
      font-weight: bold;
      margin: 8px 0 5px;
    }
    
    .payslip-month {
      font-size: 13px;
      font-weight: bold;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    
    td {
      padding: 5px 8px;
      border: 1px solid #666;
    }
    
    th {
      padding: 6px 8px;
      border: 1px solid #666;
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 12px;
      margin: 10px 0 5px;
      padding: 5px;
      background-color: #e0e0e0;
      border: 1px solid #999;
    }
    
    .total-row {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    .net-pay-row {
      background-color: #d0e8ff;
      font-size: 13px;
    }
    
    .signature-section {
      margin-top: 30px;
      text-align: right;
      padding-right: 30px;
    }
    
    .signature-text {
      margin-top: 50px;
      border-top: 1px solid #333;
      display: inline-block;
      padding-top: 5px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .payslip-container {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="payslip-container">
    <!-- Header -->
    <div class="payslip-header">
      <div class="company-name">${companyInfo.name}</div>
      <div class="company-info">
        ${companyInfo.address}<br/>
        Email: ${companyInfo.email} | Web: ${companyInfo.website} | Contact: ${companyInfo.contact}
      </div>
      <div class="payslip-title">Pay Slip</div>
      <div class="payslip-month">${month}</div>
    </div>

    <!-- Employee Details -->
    <table>
      <tr>
        <td style="width: 25%;">Employee Name</td>
        <td style="width: 25%;"><strong>${employee.firstName} ${employee.lastName}</strong></td>
        <td style="width: 25%;">Total Working Days</td>
        <td style="width: 25%;"><strong>${totalWorkingDays}</strong></td>
      </tr>
      <tr>
        <td>Employee ID</td>
        <td><strong>${employee.employeeId || 'N/A'}</strong></td>
        <td>LOP Days</td>
        <td><strong>${lopDays}</strong></td>
      </tr>
      <tr>
        <td>Designation</td>
        <td><strong>${employee.position?.title || 'N/A'}</strong></td>
        <td>Paid Days</td>
        <td><strong>${paidDays}</strong></td>
      </tr>
      <tr>
        <td>Department</td>
        <td><strong>${employee.department?.name || 'N/A'}</strong></td>
        <td>Bank Name</td>
        <td><strong>${employee.bankName || 'N/A'}</strong></td>
      </tr>
      <tr>
        <td>Date of Joining</td>
        <td><strong>${employee.hireDate ? formatDateIN(employee.hireDate) : 'N/A'}</strong></td>
        <td>Bank A/c No</td>
        <td><strong>${employee.bankAccountNumber || 'N/A'}</strong></td>
      </tr>
      <tr>
        <td>Location</td>
        <td><strong>${employee.workLocation || 'N/A'}</strong></td>
        <td>PAN</td>
        <td><strong>${employee.panNumber || 'N/A'}</strong></td>
      </tr>
      <tr>
        <td>UAN</td>
        <td><strong>${employee.universalAccountNumber || 'N/A'}</strong></td>
        <td>PF No</td>
        <td><strong>${employee.providentFundNumber || 'N/A'}</strong></td>
      </tr>
    </table>

    <!-- Earnings -->
    <div class="section-title">Earnings</div>
    <table>
      <thead>
        <tr>
          <th style="width: 70%;">Component</th>
          <th style="width: 30%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td>${formatCurrency(earnings.basicSalary || 0)}</td>
        </tr>
        <tr>
          <td>House Rent Allowances</td>
          <td>${formatCurrency(earnings.houseRentAllowance || 0)}</td>
        </tr>
        <tr>
          <td>Conveyance Allowances</td>
          <td>${formatCurrency(earnings.conveyanceAllowance || 0)}</td>
        </tr>
        <tr>
          <td>Medical Allowances</td>
          <td>${formatCurrency(earnings.medicalAllowance || 0)}</td>
        </tr>
        <tr>
          <td>Special Allowances</td>
          <td>${formatCurrency(earnings.specialAllowance || 0)}</td>
        </tr>
        <tr>
          <td>LTA</td>
          <td>${formatCurrency(earnings.lta || 0)}</td>
        </tr>
        <tr>
          <td>Shift Allowances</td>
          <td>${formatCurrency(earnings.shiftAllowance || 0)}</td>
        </tr>
        <tr>
          <td>Internet Allowances</td>
          <td>${formatCurrency(earnings.internetAllowance || 0)}</td>
        </tr>
        <tr>
          <td>Arrears</td>
          <td>${formatCurrency(earnings.arrears || 0)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Gross Salary</strong></td>
          <td><strong>₹${grossSalary.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Deductions -->
    <div class="section-title">Deductions</div>
    <table>
      <thead>
        <tr>
          <th style="width: 70%;">Component</th>
          <th style="width: 30%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Medical Premium Deductions</td>
          <td>${formatCurrency(deductions.medicalPremium || 0)}</td>
        </tr>
        <tr>
          <td>NPS under 80 CCD (2)</td>
          <td>${formatCurrency(deductions.nps || 0)}</td>
        </tr>
        <tr>
          <td>Professional Tax</td>
          <td>${formatCurrency(deductions.professionalTax || 0)}</td>
        </tr>
        <tr>
          <td>Provident Fund</td>
          <td>${formatCurrency(deductions.providentFund || 0)}</td>
        </tr>
        <tr>
          <td>TDS</td>
          <td>${formatCurrency(deductions.tds || 0)}</td>
        </tr>
        <tr>
          <td>Voluntary Provident Fund</td>
          <td>${formatCurrency(deductions.voluntaryPF || 0)}</td>
        </tr>
        <tr>
          <td>ESIC</td>
          <td>${formatCurrency(deductions.esic || 0)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Total Deductions</strong></td>
          <td><strong>₹${totalDeductions.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Net Pay -->
    <div class="section-title">Net Pay</div>
    <table>
      <tbody>
        <tr class="total-row net-pay-row">
          <td style="width: 70%;"><strong>Net Pay</strong></td>
          <td style="width: 30%;"><strong>₹${netPay.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Payment Details -->
    <div class="section-title">Payment Details</div>
    <table>
      <tbody>
        <tr>
          <td style="width: 30%;">Rupees</td>
          <td style="width: 70%;"><strong>${numberToWords(netPay)}</strong></td>
        </tr>
        <tr>
          <td>Mode of Payment</td>
          <td><strong>${paymentMode}</strong></td>
        </tr>
        <tr>
          <td>Disbursement Date</td>
          <td><strong>${disbursementDate}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Signature -->
    <div class="signature-section">
      <div class="signature-text">Authorized Signature</div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF from payslip data using Puppeteer
 */
const generatePayslipPDF = async (employee, payslipData, companyInfo) => {
  let browser;
  
  try {
    logger.debug('Starting PDF generation', {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      month: payslipData.month
    });

    // Generate HTML content
    const htmlContent = generatePayslipHTML(employee, payslipData, companyInfo);

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set content and wait for rendering
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();

    logger.info('PDF generated successfully', {
      employeeId: employee.id,
      month: payslipData.month,
      bufferSize: pdfBuffer.length
    });

    return pdfBuffer;

  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    LogHelper.logError(error, {
      context: 'generatePayslipPDF',
      employeeId: employee.id,
      month: payslipData.month
    });
    
    throw error;
  }
};

module.exports = {
  generatePayslipPDF,
  generatePayslipHTML
};
