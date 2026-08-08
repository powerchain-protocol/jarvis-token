"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="shell"><section className="card"><h1>Token Sale unavailable</h1><p>The request could not be completed safely.</p><button onClick={reset}>Try again</button></section></main>;
}
