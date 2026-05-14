import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { roleFromStaffCategory } from '../../lib/workspaceSettings'
import type { UserRole } from '../../types/database'
import { StaffCategoryPicker } from '../staff/StaffCategoryPicker'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type AuthMode = 'login' | 'register'
type RequestedRole = Extract<UserRole, 'receptionist' | 'nurse' | 'dentist'>

function getAuthErrorMessage(message: string) {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('email not confirmed')) {
    return 'Email not confirmed. Confirm the user email in Supabase Auth, or disable email confirmation for this internal app during development.'
  }
  if (lowerMessage.includes('invalid login credentials')) {
    return 'The email or password is incorrect.'
  }
  if (lowerMessage.includes('rate limit')) {
    return 'Too many attempts. Wait a few minutes before trying again.'
  }
  if (lowerMessage.includes('already registered')) {
    return 'An account already exists for that email.'
  }

  return message
}

export function AuthForm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState<RequestedRole | ''>('')
  const [requestedStaffCategory, setRequestedStaffCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isRegistering = mode === 'register'

  function resetMessages() {
    setError('')
    setSuccess('')
  }

  function validateForm() {
    if (isRegistering && fullName.trim().length < 2) {
      return 'Enter your full name.'
    }

    if (!email.includes('@')) {
      return 'Enter a valid email address.'
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters.'
    }

    return ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetMessages()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const safeRole = requestedStaffCategory ? roleFromStaffCategory(requestedStaffCategory) : requestedRole || 'receptionist'

    if (isRegistering) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            requested_role: safeRole,
            requested_staff_category: requestedStaffCategory || null,
          },
        },
      })

      setLoading(false)

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError.message))
        return
      }

      setSuccess(
        'Account created. Confirm the email if Supabase email confirmation is enabled, then a manager must approve access.',
      )
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(getAuthErrorMessage(signInError.message))
      return
    }

    setSuccess('Signed in.')
    navigate('/')
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-full border border-border bg-background p-1">
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !isRegistering ? 'bg-text text-surface' : 'text-muted'
          }`}
          onClick={() => {
            setMode('login')
            resetMessages()
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            isRegistering ? 'bg-text text-surface' : 'text-muted'
          }`}
          onClick={() => {
            setMode('register')
            resetMessages()
          }}
        >
          Register
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegistering ? (
          <>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              autoComplete="name"
            />
            <StaffCategoryPicker
              value={requestedStaffCategory}
              allLabel="What best describes your role?"
              allowCreate={false}
              onChange={(value) => {
                setRequestedStaffCategory(value)
                setRequestedRole(roleFromStaffCategory(value) as RequestedRole)
              }}
            />
          </>
        ) : null}

        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="Email address"
          autoComplete="email"
        />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
        />

        {isRegistering ? (
          <p className="rounded-lg border border-border bg-background px-4 py-3 text-sm leading-6 text-muted">
            Choose your staff role so managers can approve the right access. Manager/admin access is granted only by an existing manager or admin.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-urgent/30 bg-urgent/5 px-4 py-3 text-sm text-urgent">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            {success}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait' : isRegistering ? 'Create account' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
