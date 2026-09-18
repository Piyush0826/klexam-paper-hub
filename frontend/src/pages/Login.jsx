import { useState } from 'react'
import Button from '../components/Button'
import FormInput from '../components/FormInput'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function Login({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.email) nextErrors.email = 'Please enter your college email.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Please enter a valid college email.'
    if (!form.password) nextErrors.password = 'Please enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      login(result.token, result.user)
      if (result.user?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      setErrors({ form: error.message || 'Could not connect to the backend. Make sure it is running.' })
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Welcome back." intro="Pick up where you left off and keep your preparation moving." aside="Your next good study session can start here."><form className="auth-form" onSubmit={submit} noValidate>{errors.form && <p className="field-error">{errors.form}</p>}<FormInput label="College email" id="login-email" type="email" autoComplete="email" placeholder="you@college.edu" value={form.email} error={errors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><FormInput label="Password" id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" value={form.password} error={errors.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><div className="form-row"><label className="checkbox-label"><input type="checkbox" /> <span>Remember me</span></label><a href="/forgot-password" onClick={(event) => { event.preventDefault(); navigate('/forgot-password') }}>Forgot password?</a></div><Button type="submit" disabled={submitting}>{submitting ? 'Logging in...' : 'Log in'} {!submitting && <span aria-hidden="true">↗</span>}</Button><p className="auth-switch">Don&apos;t have an account? <a href="/register" onClick={(event) => { event.preventDefault(); navigate('/register') }}>Create one</a></p></form></AuthLayout>
}

function AuthLayout({ title, intro, aside, children }) { return <section className="auth-page"><div className="auth-aside"><div><p className="eyebrow">KLExamPrep</p><p className="aside-quote">{aside}</p></div><span className="aside-index">02 / 04</span></div><div className="auth-panel"><div className="auth-heading"><p className="eyebrow">Member access</p><h1>{title}</h1><p>{intro}</p></div>{children}</div></section> }

export default Login