async function request(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options };
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null; // not JSON — usually a hosting error page from a proxy
  }
  if (!res.ok) {
    const serverMessage =
      data && typeof data.error === 'string' && data.error.length <= 300 ? data.error : '';
    const err = new Error(serverMessage || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Multipart upload with progress, used by the studio. */
export function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { error: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
    xhr.send(formData);
  });
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body });
const patch = (path, body) => request(path, { method: 'PATCH', body });
const del = (path) => request(path, { method: 'DELETE' });

export const api = {
  site: () => get('/api/site'),
  track: (key) => get(`/api/tracks/${encodeURIComponent(key)}`),
  countPlay: (id) => post(`/api/tracks/${id}/play`).catch(() => null),
  countView: (id) => post(`/api/video/${id}/view`).catch(() => null),

  createOrder: (payload) => post('/api/orders', payload),
  order: (reference) => get(`/api/orders/${encodeURIComponent(reference)}`),
  message: (payload) => post('/api/messages', payload),

  me: () => get('/api/admin/me'),
  login: (password) => post('/api/admin/login', { password }),
  logout: () => post('/api/admin/logout'),
  overview: () => get('/api/admin/overview'),
  saveSettings: (payload) => patch('/api/admin/settings', payload),
  uploadSiteImage: (form, onProgress) => uploadWithProgress('/api/admin/site-images', form, onProgress),
  resetSiteImage: (target) => del(`/api/admin/site-images/${target}`),

  createTrack: (form, onProgress) => uploadWithProgress('/api/admin/tracks', form, onProgress),
  updateTrack: (id, payload) => patch(`/api/admin/tracks/${id}`, payload),
  replaceCover: (id, form, onProgress) =>
    uploadWithProgress(`/api/admin/tracks/${id}/cover`, form, onProgress),
  deleteTrack: (id) => del(`/api/admin/tracks/${id}`),

  createVideo: (form, onProgress) => uploadWithProgress('/api/admin/videos', form, onProgress),
  updateVideo: (id, payload) => patch(`/api/admin/videos/${id}`, payload),
  deleteVideo: (id) => del(`/api/admin/videos/${id}`),

  updateOrder: (id, status) => patch(`/api/admin/orders/${id}`, { status }),
  deleteOrder: (id) => del(`/api/admin/orders/${id}`),
  readMessage: (id) => post(`/api/admin/messages/${id}/read`),
};
