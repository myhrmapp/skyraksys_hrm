const normalizeBackendBaseUrl = () => {
  const backendBaseUrl = (process.env.REACT_APP_BACKEND_URL || '').trim();

  if (!backendBaseUrl || backendBaseUrl === '/') {
    return '';
  }

  return backendBaseUrl.endsWith('/') ? backendBaseUrl.slice(0, -1) : backendBaseUrl;
};

export const buildPhotoUrl = (photoUrl) => {
  if (!photoUrl) {
    return '';
  }

  if (photoUrl.startsWith('data:') || /^https?:\/\//i.test(photoUrl)) {
    return photoUrl;
  }

  const relativePath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
  const backendBaseUrl = normalizeBackendBaseUrl();

  if (!backendBaseUrl) {
    return relativePath;
  }

  return `${backendBaseUrl}${relativePath}`;
};
