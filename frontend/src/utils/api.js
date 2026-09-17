export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Centralised fetch wrapper that auto-attaches the JWT token, sets
 * Content-Type for JSON payloads (skips it for FormData so the browser
 * can set the multipart boundary), and converts non-ok responses into
 * thrown errors with a .status property.
 *
 * @param {string}        endpoint  Path starting with '/' (e.g. '/api/auth/login')
 * @param {RequestInit}   [options] Standard fetch options
 * @returns {Promise<any>}          Parsed JSON body
 */
export async function apiFetch(endpoint, options = {}) {
	const token = sessionStorage.getItem('authToken')
	const headers = { ...options.headers }

	if (token) {
		headers['Authorization'] = `Bearer ${token}`
	}

	// Let the browser set Content-Type (with boundary) for FormData
	if (!(options.body instanceof FormData)) {
		headers['Content-Type'] = headers['Content-Type'] || 'application/json'
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers,
	})

	// Handle empty responses (204 No Content, etc.)
	const text = await response.text()
	const data = text ? JSON.parse(text) : {}

	if (!response.ok) {
		const error = new Error(data.message || 'Something went wrong')
		error.status = response.status
		error.data = data
		throw error
	}

	return data
}

/**
 * Returns a fully qualified URL for an asset, whether relative (/uploads/...) or absolute (http...).
 * @param {string} url
 * @returns {string}
 */
export function getFileUrl(url) {
	if (!url) return ''
	if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
		return url
	}
	return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}


