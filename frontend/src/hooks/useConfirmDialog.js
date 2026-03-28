import { useState, useCallback } from 'react';

/**
 * Hook to manage ConfirmDialog state.
 * 
 * Usage:
 *   const { dialogProps, confirm } = useConfirmDialog();
 * 
 *   // Trigger confirmation:
 *   const handleDelete = () => {
 *     confirm({
 *       title: 'Delete record?',
 *       message: 'This cannot be undone.',
 *       variant: 'danger',
 *       onConfirm: async () => { await deleteItem(id); }
 *     });
 *   };
 * 
 *   // In JSX:
 *   <ConfirmDialog {...dialogProps} />
 */
const useConfirmDialog = () => {
  const [state, setState] = useState({
    open: false,
    title: 'Confirm Action',
    message: 'Are you sure?',
    variant: 'warning',
    confirmText: undefined,
    cancelText: 'Cancel',
    loading: false,
    onConfirmCallback: null,
  });

  const confirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure?',
    variant = 'warning',
    confirmText,
    cancelText = 'Cancel',
    onConfirm,
  }) => {
    setState({
      open: true,
      title,
      message,
      variant,
      confirmText,
      cancelText,
      loading: false,
      onConfirmCallback: onConfirm,
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state.onConfirmCallback) {
      setState(prev => ({ ...prev, loading: true }));
      try {
        await state.onConfirmCallback();
      } catch (error) {
        // Let the caller handle errors via their own try/catch
        console.error('ConfirmDialog action failed:', error);
      } finally {
        setState(prev => ({ ...prev, open: false, loading: false }));
      }
    } else {
      setState(prev => ({ ...prev, open: false }));
    }
  }, [state.onConfirmCallback]); // eslint-disable-line react-hooks/exhaustive-deps

  const dialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    variant: state.variant,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    loading: state.loading,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { dialogProps, confirm };
};

export default useConfirmDialog;
