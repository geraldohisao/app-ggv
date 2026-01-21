// Placeholder toast (legacy). Falls back to console.
export const showSuccessToast = (msg: string) => console.log('[toast success]', msg);
export const showErrorToast = (msg: string) => console.error('[toast error]', msg);
export const showInfoToast = (msg: string) => console.info('[toast info]', msg);

// Aliases legados
export const showSuccess = showSuccessToast;
export const showError = showErrorToast;
export const showWarning = (msg: string) => console.warn('[toast warn]', msg);
export const showLoading = (msg: string) => {
  console.log('[toast loading]', msg);
  return 'toast-id';
};
export const updateToastSuccess = (_id: string, msg: string) =>
  console.log('[toast update success]', msg);

