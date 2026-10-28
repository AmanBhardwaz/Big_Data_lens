import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Bring your data",
    text: "Upload a CSV or Excel file and get a clear picture of columns, missing values, and sample rows.",
    icon: "↗",
  },
  {
    number: "02",
    title: "Clean with confidence",
    text: "Choose how to handle blanks, duplicates, and inconsistent text. Your original file stays untouched.",
    icon: "✳",
  },
  {
    number: "03",
    title: "Find the signal",
    text: "Ask a question in everyday language and explore the answer with results you can inspect.",
    icon: "⌕",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden text-slate-900">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <span>DataLens</span>
        </Link>

        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/login" className="text-slate-600 hover:text-slate-950">
            Log in
          </Link>
          <Link
            href="/signup"
            className="primary-button px-4 py-2.5"
          >
            Get started <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>

      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 top-8 h-[34rem] w-[34rem] rounded-full bg-indigo-200/50 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-72 h-96 w-96 rounded-full bg-sky-100 blur-[90px]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-[11px] font-bold tracking-[0.13em] text-blue-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              A CLEARER WAY TO WORK WITH DATA
            </p>

            <h1 className="mt-7 text-[3.35rem] font-semibold leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">
              Your data has
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                a story to tell.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Turn CSV and Excel files into clear answers. Clean your data,
              ask questions, and uncover useful insights in one thoughtful workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="primary-button inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold"
              >
                Create your workspace <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/login"
                className="quiet-button inline-flex items-center px-5 py-3.5 text-sm font-semibold"
              >
                Explore dashboard
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-600">✓</span> CSV & Excel files
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Your data stays yours
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-emerald-600">✓</span> No SQL required
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[610px]">
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-200/70 via-white/50 to-violet-200/60 blur-2xl"
            />
            <div className="surface-card relative overflow-hidden border-white/80 p-2.5 shadow-[0_30px_90px_-35px_rgba(47,73,158,0.35)]">
              <div className="overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                        <path d="M5 4.75h9l5 5v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
                        <path d="M14 4.75v5h5M8 14h8M8 17h8" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">product_catalog.csv</p>
                      <p className="mt-0.5 text-xs text-slate-400">Your workspace preview</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                    Ready to explore
                  </span>
                </div>

                <div className="space-y-5 bg-slate-50/70 p-5 sm:p-7">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white shadow-md shadow-blue-900/10">
                    Which product has the highest price?
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">
                      <span className="grid h-5 w-5 place-items-center rounded-md bg-blue-50">✦</span>
                      Your answer
                    </div>
                    <p className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                      Laptop has the highest price.
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Here’s the matching result from your dataset.
                    </p>

                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100">
                            <td className="px-4 py-3.5 font-semibold text-slate-800">Laptop</td>
                            <td className="px-4 py-3.5 text-right font-semibold text-blue-700">72,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                    <span>Example preview · Your results use your data</span>
                    <span className="font-medium text-slate-500">DataLens</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-xl shadow-slate-900/10 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-lg text-violet-600">↗</span>
              <div>
                <p className="text-xs font-semibold text-slate-800">Insights, made simple</p>
                <p className="mt-0.5 text-[11px] text-slate-500">From file to finding</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white/65">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="max-w-xl">
            <p className="page-eyebrow">From file to insight</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Make more of the data you have.
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              Everything you need to move from spreadsheet to understanding, without getting in your way.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.025)] transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(30,64,175,0.09)] sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-xl font-medium text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                    {feature.icon}
                  </span>
                  <span className="text-xs font-semibold tracking-widest text-slate-300">{feature.number}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-7 text-xs font-medium text-slate-500 lg:px-10">
        <span className="flex items-center gap-2">
          <span className="brand-mark h-6 w-6 rounded-md text-xs" aria-hidden="true">◈</span>
          DataLens · Big Data AI Lens
        </span>
        <span>Make sense of what you have.</span>
      </footer>
    </main>
  );
}
