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

	let response
	try {
		response = await fetch(`${API_BASE_URL}${endpoint}`, {
			...options,
			headers,
		})
	} catch (networkErr) {
		const isUpload = options.body instanceof FormData
		let friendlyMessage = 'Unable to connect to the server. Please check your internet connection.'
		if (isUpload) {
			friendlyMessage = 'Upload failed to reach server. The file size may exceed network or server limits. Try uploading fewer or smaller photos.'
		}
		const error = new Error(networkErr.message === 'Failed to fetch' ? friendlyMessage : (networkErr.message || friendlyMessage))
		error.isNetworkError = true
		throw error
	}

	// Handle empty or non-JSON responses (204 No Content, HTML 413/504 pages, etc.)
	const text = await response.text()
	let data = {}
	if (text) {
		try {
			data = JSON.parse(text)
		} catch {
			data = {
				message: response.status === 413
					? 'The uploaded file payload is too large for the server. Please upload fewer or smaller photos.'
					: response.status === 504
					? 'The server timed out while processing the upload. Please try with fewer photos.'
					: `Server returned error (${response.status})`,
			}
		}
	}

	if (!response.ok) {
		const message = data.message || (
			response.status === 413
				? 'The uploaded file payload is too large for the server.'
				: response.status === 504
				? 'The server timed out. Please try again.'
				: 'Something went wrong'
		)
		const error = new Error(message)
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


