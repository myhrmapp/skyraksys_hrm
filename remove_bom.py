import os
path = r'd:\skyraksys_hrm1\skyraksys_hrm_app\frontend\src\components\features\payroll\ModernPayrollManagement.js'
with open(path, 'rb') as f:
    content = f.read()
if content.startswith(b'\xef\xbb\xbf'):
    print('BOM found, removing...')
    content = content[3:]
    with open(path, 'wb') as f:
        f.write(content)
    print('Done')
else:
    print('No BOM found, first 6 bytes:', content[:6].hex())
