import { useState } from 'react'
import Button from '../components/Button'
import FormInput from '../components/FormInput'
import { apiFetch } from '../utils/api'

function ForgotPassword({ navigate }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Please enter a valid college email.'); return }
    setSubmitting(true)
    try {
      const result = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      setMessage(result.message)
    } catch (error) { setError(error.message) } finally { setSubmitting(false) }
  }

  return <section className="auth-page"><div className="auth-aside"><div><p className="eyebrow">KLExamPrep</p><p className="aside-quote">A small reset can get your study rhythm back.</p></div><span className="aside-index">03 / 04</span></div><div className="auth-panel"><div className="auth-heading"><p className="eyebrow">Account recovery</p><h1>Reset your password.</h1><p>Enter your college email and we&apos;ll send you a secure reset link.</p></div>{message ? <div className="auth-form"><p className="verify-email">{message}</p><Button type="button" onClick={() => navigate('/login')}>Back to log in</Button></div> : <form className="auth-form" onSubmit={submit} noValidate>{error && <p className="field-error">{error}</p>}<FormInput label="College email" id="reset-email" type="email" autoComplete="email" placeholder="you@college.edu" value={email} error="" onChange={(event) => setEmail(event.target.value)} /><Button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send reset link'} {!submitting && <span aria-hidden="true">↗</span>}</Button><p className="auth-switch"><a href="/login" onClick={(event) => { event.preventDefault(); navigate('/login') }}>Back to log in</a></p></form>}</div></section>
}

export default ForgotPassword