"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, signup } from "@/lib/auth";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isSignup) {
        await signup(name.trim(), email.trim(), password);
        setPassword("");
        setCreated(true);
      } else {
        await login(email.trim(), password);
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-2">
      <section className="relative isolate overflow-hidden bg-[#101a35] px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-32 -z-10 h-80 w-80 rounded-full bg-blue-600/30 blur-3xl"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 bottom-0 -z-10 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <span>DataLens</span>
        </Link>

        <div className="relative my-12 max-w-lg lg:my-20">
          <p className="mb-5 text-[11px] font-semibold tracking-[0.2em] text-blue-300">
            YOUR DATA. A CLEARER PICTURE.
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.04em] lg:text-5xl">
            Less spreadsheet work.
            <br />
            <span className="text-blue-300">More understanding.</span>
          </h1>
          <p className="mt-6 max-w-md leading-7 text-slate-300/75">
            Upload your dataset, clean it, and ask questions in everyday
            language. Keep the data at the centre of every answer.
          </p>

          <div className="mt-9 flex flex-wrap gap-3 text-sm text-slate-300">
            {["CSV & Excel", "Data cleaning", "AI questions"].map((text) => (
              <span
                key={text}
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2"
              >
                {text}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs font-medium text-slate-400">
          Big Data AI Lens · Your analytics workspace
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-blue-600">
            ← Back to home
          </Link>

          {created ? (
            <div className="surface-card mt-10 p-8">
              <span className="text-3xl text-emerald-600">✓</span>
              <h2 className="mt-4 text-2xl font-bold">Account created</h2>
              <p className="mt-3 leading-7 text-slate-500">
                Your account is ready. Log in to open your workspace.
              </p>
              <Link
                href="/login"
                className="mt-7 block rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
              >
                Continue to login →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mt-10 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {isSignup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-3 text-slate-500">
                {isSignup
                  ? "Start exploring what your data can tell you."
                  : "Log in to open your analytics workspace."}
              </p>

              <form onSubmit={handleSubmit} className="mt-8">
                <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
                  {isSignup && (
                    <div>
                      <label htmlFor="name" className="text-sm font-medium">
                        Full name
                      </label>
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={inputClass}
                        placeholder="Your name"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          isSignup ? "new-password" : "current-password"
                        }
                        required
                        minLength={isSignup ? 12 : 1}
                        maxLength={128}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${inputClass} pr-20`}
                        placeholder={
                          isSignup ? "At least 12 characters" : "Your password"
                        }
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-5 text-sm font-medium text-blue-600"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="primary-button w-full px-5 py-3.5 font-semibold disabled:cursor-wait"
                  >
                    {busy
                      ? "Please wait..."
                      : isSignup
                        ? "Create account →"
                        : "Log in →"}
                  </button>
                </fieldset>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                {isSignup ? "Already have an account? " : "New to DataLens? "}
                <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {isSignup ? "Log in" : "Create an account"}
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}