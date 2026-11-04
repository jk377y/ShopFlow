import { apiFetch } from '/js/api.js';

const statusEl = document.getElementById('api-status');

// textContent (not innerHTML) so nothing from the server can be interpreted as HTML.
try {
  const health = await apiFetch('/api/health');
  statusEl.textContent = health.status;
  statusEl.className = 'status-ok';
} catch (err) {
  statusEl.textContent = `unreachable (${err.message})`;
  statusEl.className = 'status-error';
}
