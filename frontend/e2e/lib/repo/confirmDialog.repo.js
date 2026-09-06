const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  confirmDialog: {
    confirmButton: tid('confirm-dialog-confirm-btn'),
    cancelButton:  tid('confirm-dialog-cancel-btn'),
  }
};
