import { useState } from "react";
import { useAuthStore } from "../../store/authStore";

export function RegisterPage({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("passwords don't match");
      return;
    }
    try {
      await register(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary">budak</h1>
          <p className="text-base-content/60 text-sm mt-1">create your account</p>
        </div>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base-content text-lg">register</h2>

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
                  required
                  autoFocus
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
                  required
                  minLength={6}
                />
              </label>

              <label className="form-control w-full">
                <div className="label py-0 pb-1">
                  <span className="label-text text-base-content/70 text-sm">confirm password</span>
                </div>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="input input-bordered w-full text-sm"
                  required
                  minLength={6}
                />
              </label>

              <button type="submit" className="btn btn-secondary btn-sm mt-2">
                create account
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50">
              already have an account?{" "}
              <button onClick={onSwitch} className="link link-primary">
                sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
