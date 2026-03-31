/**
 * API-Based DB Verification Helpers for E2E Tests
 *
 * Verifies data mutations via REST API calls (acting as DB assertions).
 * Uses Playwright's page.request to make authenticated API calls.
 */

/**
 * Generic: fetch records from an API endpoint and check if any match criteria.
 * @param {import('@playwright/test').Page} page
 * @param {string} apiPath - e.g. '/api/employees'
 * @param {Object} criteria - key/value pairs to match against records
 * @returns {{ found: boolean, record: Object|null, totalRecords: number }}
 */
async function verifyRecordViaAPI(page, apiPath, criteria = {}, queryParams = {}) {
  const qs = new URLSearchParams(queryParams).toString();
  const url = qs ? `${apiPath}?${qs}` : apiPath;
  const res = await page.request.get(url, { failOnStatusCode: false });
  if (!res.ok()) return { found: false, record: null, totalRecords: 0 };
  const body = await res.json();
  // Extract records array from various API response shapes:
  // - { data: [...] }                          → direct array
  // - { data: { rows: [...], count } }          → Sequelize findAndCountAll
  // - { data: { reviews: [...], totalCount } }  → custom wrapped
  // - { rows: [...] }                           → raw findAndCountAll
  // - [...]                                     → plain array
  const d = body.data;
  let records;
  if (Array.isArray(d)) {
    records = d;
  } else if (d && typeof d === 'object') {
    records = d.rows || d.reviews || d.data || d.employees || d.users || d.departments || d.projects || d.leaveRequests;
  }
  if (!Array.isArray(records)) {
    records = body.rows || (Array.isArray(body) ? body : []);
  }
  const match = records.find(r =>
    Object.entries(criteria).every(([key, value]) => r[key] === value)
  );
  return { found: !!match, record: match || null, totalRecords: records.length };
}

/**
 * Verify an employee exists via API.
 */
async function verifyEmployeeInDB(page, criteria) {
  const queryParams = {};
  if (criteria.firstName) queryParams.search = criteria.firstName;
  return verifyRecordViaAPI(page, '/api/employees', criteria, queryParams);
}

/**
 * Verify a leave request exists via API.
 */
async function verifyLeaveInDB(page, criteria) {
  return verifyRecordViaAPI(page, '/api/leave-requests', criteria);
}

/**
 * Verify a department exists via API.
 */
async function verifyDepartmentInDB(page, criteria) {
  return verifyRecordViaAPI(page, '/api/departments', criteria);
}

/**
 * Verify a project exists via API.
 */
async function verifyProjectInDB(page, criteria) {
  return verifyRecordViaAPI(page, '/api/projects', criteria);
}

/**
 * Verify a review exists via API.
 */
async function verifyReviewInDB(page, criteria) {
  return verifyRecordViaAPI(page, '/api/employee-reviews', criteria);
}

/**
 * Verify a user exists via API.
 */
async function verifyUserInDB(page, criteria) {
  return verifyRecordViaAPI(page, '/api/users', criteria);
}

/**
 * Delete a record by ID via API (for test cleanup).
 */
async function deleteRecordViaAPI(page, apiPath, id) {
  if (!id) return;
  await page.request.delete(`${apiPath}/${id}`, { failOnStatusCode: false });
}

module.exports = {
  verifyRecordViaAPI,
  verifyEmployeeInDB,
  verifyLeaveInDB,
  verifyDepartmentInDB,
  verifyProjectInDB,
  verifyReviewInDB,
  verifyUserInDB,
  deleteRecordViaAPI,
};
