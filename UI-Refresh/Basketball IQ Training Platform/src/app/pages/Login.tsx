import { useState } from 'react';
import { Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { Target } from 'lucide-react';
import { useNavigate } from 'react-router';

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[var(--basketball-orange)] to-[var(--basketball-orange)]/70 flex items-center justify-center">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="mb-2">Court Vision</h1>
          <p className="text-muted-foreground">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-[var(--basketball-orange)] hover:underline"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-[var(--basketball-orange)]/10 to-transparent">
          <h3 className="mb-2">Why join Court Vision?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[var(--basketball-orange)]">✓</span>
              <span>Learn to think like a Player, Coach, and GM</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--basketball-orange)]">✓</span>
              <span>Interactive lessons and real-world simulations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--basketball-orange)]">✓</span>
              <span>Track your progress and compete with friends</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
