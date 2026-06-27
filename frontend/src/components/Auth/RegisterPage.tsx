import { useState } from "react";
import { useAuthStore } from "../../store/authStore";

export function RegisterPage({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(username, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-lavender">tudo</h1>
          <p className="text-fg-muted mt-2 text-sm">create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-panel rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">register</h2>
          {error && (
            <div className="bg-danger-bg border border-danger/30 text-danger px-4 py-2 rounded-sm text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-fg-soft mb-1.5">username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-elevated border border-border rounded-sm px-3 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lavender/50 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-fg-soft mb-1.5">email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-elevated border border-border rounded-sm px-3 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lavender/50 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-fg-soft mb-1.5">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-elevated border border-border rounded-sm px-3 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lavender/50 transition"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-mint/20 text-mint border border-mint/30 rounded-sm px-4 py-2 text-sm font-medium hover:bg-mint/30 transition"
          >
            create account
          </button>
          <p className="text-center text-sm text-fg-muted">
            already have an account?{" "}
            <button type="button" onClick={onSwitch} className="text-blue hover:underline">
              sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
