"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AuthError, getMe, logout, type User } from "@/lib/auth";

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-950/20"
      >
        ◈
      </span>
      <span className="text-xl font-bold tracking-tight">DataLens</span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const isDatasetPage = pathname.startsWith("/dashboard/datasets/");

  useEffect(() => {
    let active = true;

    getMe()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch((err: unknown) => {
        if (!active) return;

        if (err instanceof AuthError && err.status === 401) {
          router.replace("/login");
        } else {
          setError(
            err instanceof Error ? err.message : "Unable to check session.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    if (leaving) return;

    setLeaving(true);
    setError("");

    try {
      await logout();
      setUser(null);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
      setLeaving(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-6 text-slate-900">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-3xl text-white"
          >
            ◈
          </span>

          <h1 className="mt-5 text-xl font-semibold">DataLens</h1>

          <p
            role={error ? "alert" : "status"}
            className={`mt-3 text-sm leading-6 ${
              error ? "text-red-700" : "text-slate-500"
            }`}
          >
            {error || (leaving ? "Signing you out..." : "Opening your workspace...")}
          </p>

          {error ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600 motion-reduce:animate-none"
            />
          )}
        </div>
      </div>
    );
  }

  const initials =
    user.name.trim().split(/\s+/).slice(0, 2)
      .map((part) => part.charAt(0)).join("").toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-blue-700"
      >
        Skip to workspace
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#101b35] text-white lg:flex">
        <div className="px-6 pb-8 pt-8">
          <Brand />
          <p className="ml-[52px] mt-1 text-xs text-slate-400">
            Analytics workspace
          </p>
        </div>

        <nav aria-label="Main navigation" className="space-y-2 px-4">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>

          <Link
            href="/dashboard"
            aria-current={!isDatasetPage ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              !isDatasetPage
                ? "bg-blue-600 text-white shadow-md shadow-blue-950/20"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="text-lg">▦</span>
            Dashboard
          </Link>

          <Link
            href="/dashboard#saved-datasets"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span aria-hidden="true" className="text-lg">▤</span>
            Saved datasets
          </Link>

          {isDatasetPage && (
            <div className="ml-4 border-l border-slate-700 py-2 pl-6 text-xs text-blue-300">
              Current dataset workspace
            </div>
          )}
        </nav>

        <div className="mx-4 mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-slate-200">
            Start something new
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            Upload a spreadsheet and explore what it can tell you.
          </p>
          <Link
            href="/dashboard#upload-dataset"
            className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            Upload dataset →
          </Link>
        </div>

        <div className="mt-auto border-t border-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/15 text-sm font-semibold text-blue-200">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" title={user.name}>
                {user.name}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={leaving}
            className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {leaving ? "Logging out..." : "Log out →"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Brand />
            </div>

            <div className="hidden items-center gap-2 text-sm lg:flex">
              <Link href="/dashboard" className="text-slate-500 hover:text-blue-600">
                Workspace
              </Link>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span className="font-medium text-slate-800">
                {isDatasetPage ? "Dataset analysis" : "Dashboard"}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden max-w-48 truncate text-sm text-slate-600 sm:block">
                {user.name}
              </span>
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700"
              >
                {initials}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={leaving}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 lg:hidden"
              >
                {leaving ? "Exiting..." : "Log out"}
              </button>
            </div>
          </div>

          {/* Mobile navigation */}
          <nav
            aria-label="Mobile navigation"
            className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden"
          >
            <Link
              href="/dashboard"
              className="whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard#saved-datasets"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Saved datasets
            </Link>
            <Link
              href="/dashboard#upload-dataset"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Upload
            </Link>
          </nav>
        </header>

        {error && (
          <p role="alert" className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}