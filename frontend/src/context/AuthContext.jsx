import { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [token, setToken] = useState(() => sessionStorage.getItem('authToken'))
	const [isLoading, setIsLoading] = useState(true)

	// On mount (or when token changes), hydrate user from the API
	useEffect(() => {
		if (!token) {
			setUser(null)
			setIsLoading(false)
			return
		}

		apiFetch('/api/auth/me')
			.then((data) => setUser(data.user))
			.catch(() => {
				// Token expired or invalid — clear everything
				sessionStorage.removeItem('authToken')
				sessionStorage.removeItem('currentUser')
				setToken(null)
				setUser(null)
			})
			.finally(() => setIsLoading(false))
	}, [token])

	/** Store credentials after a successful login */
	function login(newToken, userData) {
		sessionStorage.setItem('authToken', newToken)
		sessionStorage.setItem('currentUser', JSON.stringify(userData))
		setToken(newToken)
		setUser(userData)
	}

	/** Clear all session data and navigate home */
	function logout() {
		sessionStorage.removeItem('authToken')
		sessionStorage.removeItem('currentUser')
		sessionStorage.removeItem('verificationEmail')
		setToken(null)
		setUser(null)
		window.history.pushState({}, '', '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}

	/** Refresh the stored user object (e.g. after profile edit) */
	function updateUser(userData) {
		setUser(userData)
		sessionStorage.setItem('currentUser', JSON.stringify(userData))
	}

	return (
		<AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth must be used within an AuthProvider')
	return context
}
