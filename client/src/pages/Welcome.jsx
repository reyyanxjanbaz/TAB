import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Welcome() {
  const [step, setStep] = useState(1); // 1=name, 2=email
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!username.trim()) return setError('Enter your name');
      return setStep(2);
    }

    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email');
    setLoading(true);
    try {
      await login(username.trim(), email.trim());
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-stone-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <span className="text-4xl">🍔</span>
          </div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">TAB</h1>
          <p className="text-stone-500 mt-1.5 text-base">Group orders, made effortless.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {step === 1 ? (
            <>
              <Input
                label="What's your name?"
                placeholder="Reyyan"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                autoFocus
                autoComplete="name"
                error={error}
              />
              <Button type="submit" size="lg" disabled={!username.trim()}>
                Continue →
              </Button>
            </>
          ) : (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-stone-500 mb-3 flex items-center gap-1"
                >
                  ← Back
                </button>
                <p className="font-semibold text-stone-800 mb-1">Hey {username}! 👋</p>
                <p className="text-stone-500 text-sm mb-4">Enter your email so you can rejoin from any device.</p>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                  autoComplete="email"
                  error={error}
                />
              </div>
              <Button type="submit" size="lg" loading={loading} disabled={!email.trim()}>
                Get started
              </Button>
            </>
          )}
        </form>

        <p className="text-center text-xs text-stone-400 mt-6">
          No passwords. No fuss. Just TAB.
        </p>
      </div>
    </div>
  );
}
