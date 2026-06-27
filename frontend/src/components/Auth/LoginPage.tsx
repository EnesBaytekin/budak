import { useState } from "react";
import { useAuthStore } from "../../store/authStore";

export function LoginPage({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-lavender">tudo</h1>
          <p className="text-fg-muted mt-2 text-sm">tree-based todo app</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-panel rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">sign in</h2>
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
              placeholder="your username"
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
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-lavender/20 text-lavender border border-lavender/30 rounded-sm px-4 py-2 text-sm font-medium hover:bg-lavender/30 transition"
          >
            sign in
          </button>
          <p className="text-center text-sm text-fg-muted">
            no account?{" "}
            <button type="button" onClick={onSwitch} className="text-blue hover:underline">
              register
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
