import React from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { formatCurrency, CURRENCY_SYMBOL } from '../../utils/formatCurrency';
import './PayslipTemplate.css';

const PayslipTemplate = ({ 
  employee, 
  payslipData, 
  companyInfo = {
    name: '',
    address: '',
    email: '',
    website: '',
    contact: ''
  }
}) => {
  // Default payslip data structure
  const defaultPayslipData = {
    month: "December 2024",
    totalWorkingDays: 21,
    lopDays: 0,
    paidDays: 21,
    earnings: {
      basicSalary: 0,
      hra: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      foodAllowance: 0,
      communicationAllowance: 0,
      otherAllowances: 0
    },
    deductions: {
      pfContribution: 0,
      professionalTax: 0,
      tds: 0,
      otherDeductions: 0
    },
    paymentMode: "Online Transfer",
    disbursementDate: new Date().toLocaleDateString('en-GB')
  };

  // Merge default data with provided payslipData
  // Handle potential key mismatches if backend uses different keys
  const mergedData = { ...defaultPayslipData, ...payslipData };
  
  // Normalize earnings if needed (map backend keys to what we want to display if they differ)
  const earnings = {
    basicSalary: mergedData.earnings?.basicSalary || mergedData.earnings?.basic || 0,
    hra: mergedData.earnings?.hra || mergedData.earnings?.houseRentAllowance || 0,
    transportAllowance: mergedData.earnings?.transportAllowance || mergedData.earnings?.conveyanceAllowance || 0,
    medicalAllowance: mergedData.earnings?.medicalAllowance || 0,
    specialAllowance: mergedData.earnings?.specialAllowance || 0,
    foodAllowance: mergedData.earnings?.foodAllowance || 0,
    communicationAllowance: mergedData.earnings?.communicationAllowance || mergedData.earnings?.internetAllowance || 0,
    otherAllowances: mergedData.earnings?.otherAllowances || mergedData.earnings?.allowances || 0
  };

  // Normalize deductions
  const deductions = {
    pfContribution: mergedData.deductions?.pfContribution || mergedData.deductions?.providentFund || 0,
    professionalTax: mergedData.deductions?.professionalTax || 0,
    tds: mergedData.deductions?.tds || 0,
    otherDeductions: mergedData.deductions?.otherDeductions || 0
  };

  // Calculate totals
  const grossSalary = Object.values(earnings).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const totalDeductions = Object.values(deductions).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const netPay = grossSalary - totalDeductions;

  // Convert number to words (Indian numbering: Thousand, Lakh, Crore)
  const numberToWords = (amount) => {
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (!amount || amount === 0) return 'Zero Rupees Only';

    // Handle negative
    const absAmount = Math.abs(Math.floor(amount));
    if (absAmount === 0) return 'Zero Rupees Only';

    let num = absAmount;
    let result = '';
    let scaleIndex = 0;

    while (num > 0) {
      let chunk;
      if (scaleIndex === 0) {
        chunk = num % 1000; // First chunk: ones, tens, hundreds
        num = Math.floor(num / 1000);
      } else {
        chunk = num % 100; // Subsequent chunks (Indian: groups of 2)
        num = Math.floor(num / 100);
      }

      if (chunk > 0) {
        let chunkText = '';
        if (chunk >= 100) {
          chunkText += ones[Math.floor(chunk / 100)] + ' Hundred ';
          chunk %= 100;
        }
        if (chunk >= 20) {
          chunkText += tens[Math.floor(chunk / 10)] + ' ';
          chunk %= 10;
        }
        if (chunk > 0) {
          chunkText += ones[chunk] + ' ';
        }
        result = chunkText + scales[scaleIndex] + ' ' + result;
      }
      scaleIndex++;
    }

    return (amount < 0 ? 'Minus ' : '') + result.trim() + ' Rupees Only';
  };

  // formatCurrency is now imported from ../../utils/formatCurrency

  return (
    <div className="payslip-container" id="payslip-content">
      {/* Header */}
      <div className="payslip-header">
        <img 
          src="/assets/company/logo.png" 
          alt="Company Logo" 
          className="company-logo"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <Typography variant="h4" className="company-name">
          {companyInfo.name}
        </Typography>
        <div className="company-info">
          {companyInfo.address}<br/>
          Email: {companyInfo.email} | Web: {companyInfo.website} | Contact: {companyInfo.contact}
        </div>
        <Typography variant="h5" className="payslip-title">
          Pay Slip
        </Typography>
        <Typography variant="h6" className="payslip-month">
          {mergedData.month}
        </Typography>
      </div>

      {/* Employee Details */}
      <TableContainer component={Paper} elevation={0} className="details-table">
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Employee Name</TableCell>
              <TableCell><strong>{employee?.firstName} {employee?.lastName}</strong></TableCell>
              <TableCell>Total Working Days</TableCell>
              <TableCell><strong>{mergedData.totalWorkingDays}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell><strong>{employee?.employeeId || 'N/A'}</strong></TableCell>
              <TableCell>LOP Days</TableCell>
              <TableCell><strong>{mergedData.lopDays}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Designation</TableCell>
              <TableCell><strong>{employee?.position?.title || 'N/A'}</strong></TableCell>
              <TableCell>Paid Days</TableCell>
              <TableCell><strong>{mergedData.paidDays}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Department</TableCell>
              <TableCell><strong>{employee?.department?.name || 'N/A'}</strong></TableCell>
              <TableCell>Bank Name</TableCell>
              <TableCell><strong>{employee?.bankName || 'N/A'}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Date of Joining</TableCell>
              <TableCell><strong>{employee?.hireDate ? new Date(employee.hireDate).toLocaleDateString('en-GB') : 'N/A'}</strong></TableCell>
              <TableCell>Bank A/c No</TableCell>
              <TableCell><strong>{employee?.bankAccountNumber || 'N/A'}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell><strong>{employee?.workLocation || 'N/A'}</strong></TableCell>
              <TableCell>PAN</TableCell>
              <TableCell><strong>{employee?.panNumber || 'N/A'}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>UAN</TableCell>
              <TableCell><strong>{employee?.universalAccountNumber || 'N/A'}</strong></TableCell>
              <TableCell>PF No</TableCell>
              <TableCell><strong>{employee?.providentFundNumber || 'N/A'}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Earnings */}
      <div className="section-title">Earnings</div>
      <TableContainer component={Paper} elevation={0} className="salary-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Component</strong></TableCell>
              <TableCell><strong>{`Amount (${CURRENCY_SYMBOL})`}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Basic Salary</TableCell>
              <TableCell>{formatCurrency(earnings.basicSalary)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>HRA</TableCell>
              <TableCell>{formatCurrency(earnings.hra)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Transport Allowance</TableCell>
              <TableCell>{formatCurrency(earnings.transportAllowance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Medical Allowance</TableCell>
              <TableCell>{formatCurrency(earnings.medicalAllowance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Special Allowance</TableCell>
              <TableCell>{formatCurrency(earnings.specialAllowance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Food Allowance</TableCell>
              <TableCell>{formatCurrency(earnings.foodAllowance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Communication Allowance</TableCell>
              <TableCell>{formatCurrency(earnings.communicationAllowance)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Other Allowances</TableCell>
              <TableCell>{formatCurrency(earnings.otherAllowances)}</TableCell>
            </TableRow>
            <TableRow className="total-row">
              <TableCell><strong>Gross Salary</strong></TableCell>
              <TableCell><strong>{formatCurrency(grossSalary)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Deductions */}
      <div className="section-title">Deductions</div>
      <TableContainer component={Paper} elevation={0} className="salary-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Component</strong></TableCell>
              <TableCell><strong>{`Amount (${CURRENCY_SYMBOL})`}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>PF Contribution</TableCell>
              <TableCell>{formatCurrency(deductions.pfContribution)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Professional Tax</TableCell>
              <TableCell>{formatCurrency(deductions.professionalTax)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>TDS</TableCell>
              <TableCell>{formatCurrency(deductions.tds)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Other Deductions</TableCell>
              <TableCell>{formatCurrency(deductions.otherDeductions)}</TableCell>
            </TableRow>
            <TableRow className="total-row">
              <TableCell><strong>Total Deductions</strong></TableCell>
              <TableCell><strong>{formatCurrency(totalDeductions)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Net Pay */}
      <div className="section-title">Net Pay</div>
      <TableContainer component={Paper} elevation={0} className="salary-table">
        <Table size="small">
          <TableBody>
            <TableRow className="total-row net-pay-row">
              <TableCell><strong>Net Pay</strong></TableCell>
              <TableCell><strong>{formatCurrency(netPay)}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Details */}
      <div className="section-title">Payment Details</div>
      <TableContainer component={Paper} elevation={0} className="details-table">
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Rupees</TableCell>
              <TableCell><strong>{numberToWords(netPay)}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mode of Payment</TableCell>
              <TableCell><strong>{mergedData.paymentMode}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Disbursement Date</TableCell>
              <TableCell><strong>{mergedData.disbursementDate}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Signature */}
      <div className="signature-section">
        <img 
          src="/assets/company/signature.png" 
          alt="HR Signature" 
          className="signature-image"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <Typography variant="body2" className="signature-text">
          Authorized Signature
        </Typography>
      </div>
    </div>
  );
};

export default PayslipTemplate;