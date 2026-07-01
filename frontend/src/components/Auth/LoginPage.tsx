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
    <div className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary">budak</h1>
          <p className="text-base-content/60 text-sm mt-1">tree-based todo app</p>
        </div>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base-content text-lg">sign in</h2>

            {error && (
              <div role="alert" className="alert alert-error text-sm py-2">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="form-control w-full">
                <div className="label py-0 pb-1">
                  <span className="label-text text-base-content/70 text-sm">username</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full text-sm"
                  placeholder="your username"
                  required
                />
              </label>

              <label className="form-control w-full">
                <div className="label py-0 pb-1">
                  <span className="label-text text-base-content/70 text-sm">password</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full text-sm"
                  placeholder="••••••••"
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary btn-sm mt-2">
                sign in
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50">
              no account?{" "}
              <button onClick={onSwitch} className="link link-primary">
                register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
