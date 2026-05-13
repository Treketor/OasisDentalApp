import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function LoginForm() {
  return (
    <form className="space-y-4">
      <Input type="email" placeholder="Email address" />
      <Input type="password" placeholder="Password" />
      <Button type="button" className="w-full">
        Sign in
      </Button>
    </form>
  )
}
