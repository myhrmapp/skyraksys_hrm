import http from '../http-common';

const API_URL = '/settings';

const getPayslipTemplate = () => {
  return http.get(`${API_URL}/payslip-template`);
};

const updatePayslipTemplate = (settings, logoFile) => {
  const formData = new FormData();

  // Append settings data
  Object.keys(settings).forEach(key => {
    formData.append(key, settings[key]);
  });

  // Append logo file if it exists
  if (logoFile) {
    formData.append('logo', logoFile);
  }

  return http.put(`${API_URL}/payslip-template`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};


const settingsService = {
  getPayslipTemplate,
  updatePayslipTemplate
};

export default settingsService;
