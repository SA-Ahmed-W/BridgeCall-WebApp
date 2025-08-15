// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/auth/useAuth";
import {firestore} from "../db/firestore"

export default function Login() {
  // Local form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState("");

  // Auth context
  const {
    user,
    login,
    loading: authLoading,
    error: authError,
    clearError,
  } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  // Merge context-level error with local validation error
  const displayError = localError || authError;

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email || !password) {
      setLocalError("Please fill in all fields");
      return;
    }

    try {
      await login(email, password);
      // Optionally update user status in Firestore
      await firestore.updateUser(user.uid, { status: 'online' });
      // Optionally persist email for “remember me”
      if (rememberMe) localStorage.setItem("rememberEmail", email);
      else localStorage.removeItem("rememberEmail");
      // Successful login → redirect happens automatically via useEffect
    } catch {
      /* error already handled in hook */
    }
  }

  /* Re-populate email if user chose “remember me” previously */
  useEffect(() => {
    const saved = localStorage.getItem("rememberEmail");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Decorative blurred circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      </div>

      <div className="max-w-md w-full space-y-8 relative">
        {/* Heading */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {displayError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{displayError}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300"
              />
            </div>

            {/* Password + toggle */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500
                             focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50
                             transition-all duration-300 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400
                             hover:text-white transition-colors duration-200"
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243m-7.243-4.243L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember / forgot */}
            <div className="flex items-center justify-between">
              <label htmlFor="remember-me" className="inline-flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-cyan-400 bg-white/5 border-white/20 rounded focus:ring-cyan-400/50 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white
                         bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                         transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider + register link */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to="/register"
                className="w-full flex justify-center py-3 px-4 border border-white/20 rounded-lg text-sm font-medium
                           text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 focus:outline-none focus:ring-2
                           focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-300 transform
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                Create new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
