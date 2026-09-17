import { useState } from 'react'
import Button from '../components/Button'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function VerifyAccount({ navigate }) {
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [email] = useState(() => new URLSearchParams(window.location.search).get('email') || window.sessionStorage.getItem('verificationEmail') || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!email) {
      setError('No verification email was found. Please register again.')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code to continue.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      })
      const authToken = res?.token || res?.data?.token
      const userData = res?.user || res?.data?.user
      if (authToken && userData) {
        login(authToken, userData)
      }
      window.sessionStorage.removeItem('verificationEmail')
      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    if (!email) {
      setError('No verification email was found. Please register again.')
      return
    }
    try {
      await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setError('A new verification code was sent.')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <section className="verify-page">
      <div className="verify-card">
        <div className="verify-icon" aria-hidden="true">✦</div>
        <p className="eyebrow">Almost there</p>
        <h1>Verify your college account.</h1>
        <p className="verify-copy">Enter the verification code sent to your college email address.</p>
        {email && <p className="verify-email">Code sent to {email}</p>}
        <form onSubmit={submit} noValidate>
          <label htmlFor="otp">Verification code</label>
          <input
            id="otp"
            className="otp-input"
            inputMode="numeric"
            maxLength="6"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''))
              setError('')
            }}
          />
          {error && <p className="field-error">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Verifying...' : 'Verify account'} {!submitting && <span aria-hidden="true">↗</span>}
          </Button>
        </form>
        <div className="verify-actions">
          <button type="button" onClick={resend}>Resend code</button>
          <button type="button" onClick={() => navigate('/register')}>← Back</button>
        </div>
      </div>
    </section>
  )
}

export default VerifyAccount