// Shared fetch helper that every page uses to talk to the backend.

// Calls the API and returns parsed JSON. Throws an Error with a readable message on failure.
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    // The backend will send ProblemDetails JSON for errors; fall back to the status text if not.
    let message = `${response.status} ${response.statusText}`;
    try {
      const problem = await response.json();
      message = problem.detail || problem.title || message;
    } catch {
      // Body wasn't JSON, so the status text is all we have.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}
