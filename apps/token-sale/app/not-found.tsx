import Link from "next/link";
export default function NotFound() {
  return <main className="shell"><section className="card"><h1>Page not found</h1><p>The requested Token Sale page does not exist.</p><Link href="/">Return to sale</Link></section></main>;
}
