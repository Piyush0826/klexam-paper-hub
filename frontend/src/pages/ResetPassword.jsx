import { useState } from 'react'
import Button from '../components/Button'
import FormInput from '../components/FormInput'
import { apiFetch } from '../utils/api'

function ResetPassword({ navigate }) {
  const token = new URLSearchParams(window.location.search).get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!token) { setError('This password reset link is invalid.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      setComplete(true)
    } catch (error) { setError(error.message) } finally { setSubmitting(false) }
  }

  return <section className="auth-page"><div className="auth-aside"><div><p className="eyebrow">KLExamPrep</p><p className="aside-quote">Back to the work that matters.</p></div><span className="aside-index">04 / 04</span></div><div className="auth-panel"><div className="auth-heading"><p className="eyebrow">Account recovery</p><h1>Choose a new password.</h1><p>{complete ? 'Your password has been updated.' : 'Use at least 8 characters for your new password.'}</p></div>{complete ? <Button type="button" onClick={() => navigate('/login')}>Back to log in</Button> : <form className="auth-form" onSubmit={submit} noValidate>{error && <p className="field-error">{error}</p>}<FormInput label="New password" id="new-password" type="password" autoComplete="new-password" placeholder="Enter a new password" value={password} error="" onChange={(event) => setPassword(event.target.value)} /><FormInput label="Confirm password" id="confirm-password" type="password" autoComplete="new-password" placeholder="Re-enter your password" value={confirmation} error="" onChange={(event) => setConfirmation(event.target.value)} /><Button type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Update password'} {!submitting && <span aria-hidden="true">↗</span>}</Button></form>}</div></section>
}

export default ResetPassword