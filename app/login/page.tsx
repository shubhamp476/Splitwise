"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { Lock, Mail, User, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        toast.error(res.error || "Failed to sign in. Please check your credentials.");
      } else {
        toast.success("Successfully logged in!");
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to register account.");
      } else {
        toast.success("Account created! Logging in...");
        // Auto sign-in after register
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
          callbackUrl,
        });

        if (res?.error) {
          toast.error("Account created, but automatic sign in failed. Please login manually.");
          setIsSignUp(false);
        } else {
          router.refresh();
          router.push(callbackUrl);
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 relative z-10">
      {/* Title */}
      <div className="text-center">
        <Link href="/" className="inline-block">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-cyan-400 backdrop-blur">
            Spreetail Expenses
          </span>
        </Link>
        <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {isSignUp ? "Join and start splitting expenses easily" : "Sign in to manage your shared balances"}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        {/* Toggle Switch */}
        <div className="mb-8 flex rounded-xl bg-slate-950 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              toast.dismiss();
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
              !isSignUp ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              toast.dismiss();
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
              isSignUp ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {isSignUp ? "Register Account" : "Sign In"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Demo Users Tip */}
      <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 text-center text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">💡 Demo Accounts Seeded:</p>
        <p>Login with email <span className="text-cyan-400">aisha@example.com</span> or <span className="text-cyan-400">rohan@example.com</span> and password <span className="text-cyan-400">password123</span>.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-cyan-400 h-10 w-10 mb-4" />
            <p className="text-slate-400 text-sm font-medium">Loading auth module...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
