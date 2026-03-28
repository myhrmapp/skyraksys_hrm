@echo off
node -e "const fs=require('fs');const p='d:/skyraksys_hrm1/skyraksys_hrm_app/frontend/src/components/features/payroll/ModernPayrollManagement.js';const buf=fs.readFileSync(p);if(buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF){fs.writeFileSync(p,buf.slice(3));console.log('BOM removed');}else{console.log('No BOM, first bytes: '+buf.slice(0,4).toString('hex'));}"
