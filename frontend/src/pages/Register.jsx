import { useState } from 'react'
import Button from '../components/Button'
import FormInput from '../components/FormInput'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function Register({ navigate }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', id: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')

  const update = (key, value) => setForm({ ...form, [key]: value })

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name) nextErrors.name = 'Please enter your full name.'
    if (!form.id) nextErrors.id = 'Please enter your college or university ID.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Please enter a valid college email.'
    if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    if (form.confirm !== form.password) nextErrors.confirm = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSubmitting(true)
    try {
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          collegeId: form.id,
          email: form.email,
          password: form.password,
          role: 'student'
        })
      })
      setRegisteredEmail(form.email)
      if (response?.data?.devOtp) {
        setOtp(response.data.devOtp)
        setResendMsg(`Local testing: verification code auto-filled (${response.data.devOtp})`)
      }
      setShowOtpModal(true)
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError('Please enter the 6-digit code sent to your email.')
      return
    }
    setOtpSubmitting(true)
    setOtpError('')
    try {
      const res = await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: registeredEmail, otp })
      })
      const authToken = res?.token || res?.data?.token
      const userData = res?.user || res?.data?.user
      if (authToken && userData) {
        login(authToken, userData)
      }
      setShowOtpModal(false)
      navigate('/dashboard')
    } catch (error) {
      setOtpError(error.message || 'Invalid or expired code. Please try again.')
    } finally {
      setOtpSubmitting(false)
    }
  }

  const resendOtp = async () => {
    setResending(true)
    setResendMsg('')
    setOtpError('')
    try {
      const response = await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: registeredEmail })
      })
      if (response?.data?.devOtp) {
        setOtp(response.data.devOtp)
        setResendMsg(`Local testing: new code auto-filled (${response.data.devOtp})`)
      } else {
        setResendMsg('A new code has been sent to your email.')
      }
    } catch (error) {
      setOtpError(error.message || 'Could not resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <AuthLayout
        title="Create your account."
        intro="Join a focused academic community built around sharing what helps."
        aside="One account. A whole archive of better preparation."
      >
        <form className="auth-form register-form" onSubmit={submit} noValidate>
          {errors.form && <p className="field-error">{errors.form}</p>}
          <FormInput
            label="Full name" id="register-name" autoComplete="name"
            placeholder="Your full name" value={form.name} error={errors.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <FormInput
            label="College / university ID" id="register-id"
            placeholder="e.g. KL2026-0142" value={form.id} error={errors.id}
            onChange={(e) => update('id', e.target.value)}
          />
          <FormInput
            label="College email" id="register-email" type="email"
            autoComplete="email" placeholder="you@college.edu"
            value={form.email} error={errors.email}
            onChange={(e) => update('email', e.target.value)}
          />
          <div className="form-split">
            <FormInput
              label="Password" id="register-password" type="password"
              autoComplete="new-password" placeholder="8+ characters"
              value={form.password} error={errors.password}
              onChange={(e) => update('password', e.target.value)}
            />
            <FormInput
              label="Confirm password" id="register-confirm" type="password"
              autoComplete="new-password" placeholder="Repeat password"
              value={form.confirm} error={errors.confirm}
              onChange={(e) => update('confirm', e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}{' '}
            {!submitting && <span aria-hidden="true">↗</span>}
          </Button>
          <p className="auth-switch">
            Already registered?{' '}
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>Log in</a>
          </p>
        </form>
      </AuthLayout>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="otp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowOtpModal(false) }}>
          <div className="otp-modal">
            <div className="otp-modal-header">
              <p className="eyebrow">Email Verification</p>
              <h2 className="otp-modal-title">Check your inbox.</h2>
              <p className="otp-modal-sub">
                We sent a 6-digit code to <strong>{registeredEmail}</strong>.<br />
                Enter it below to verify your account.
              </p>
            </div>

            <div className="otp-input-group">
              <label htmlFor="otp-code" className="otp-label">Verification code</label>
              <input
                id="otp-code"
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                autoFocus
              />
              {otpError && <p className="field-error" style={{ marginTop: '8px' }}>{otpError}</p>}
              {resendMsg && <p style={{ color: 'var(--teal)', fontSize: '.8rem', marginTop: '8px' }}>{resendMsg}</p>}
            </div>

            <Button
              type="button"
              disabled={otpSubmitting}
              onClick={verifyOtp}
              style={{ width: '100%', marginTop: '8px', color: 'var(--white)', background: 'var(--ink)' }}
            >
              {otpSubmitting ? 'Verifying...' : 'Verify email'}{' '}
              {!otpSubmitting && <span aria-hidden="true">↗</span>}
            </Button>

            <p className="auth-switch" style={{ textAlign: 'center', marginTop: '20px' }}>
              Didn't receive a code?{' '}
              <button
                type="button"
                disabled={resending}
                onClick={resendOtp}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function AuthLayout({ title, intro, aside, children }) {
  return (
    <section className="auth-page">
      <div className="auth-aside">
        <div>
          <p className="eyebrow">KLExamPrep</p>
          <p className="aside-quote">{aside}</p>
        </div>
        <span className="aside-index">03 / 04</span>
      </div>
      <div className="auth-panel">
        <div className="auth-heading">
          <p className="eyebrow">Join the archive</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

export default Register