const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  reviews: {
    page: tid('reviews-page'),
    newBtn: tid('reviews-new-btn'),
    search: tid('reviews-search'),
    statusFilter: tid('reviews-status-filter'),
    typeFilter: tid('reviews-type-filter'),
    createSubmitBtn: tid('reviews-create-submit-btn'),
    editSaveBtn: tid('reviews-edit-save-btn'),
    deleteConfirmBtn: tid('reviews-delete-confirm-btn')
  }
};
