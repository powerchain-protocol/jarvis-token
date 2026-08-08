"use client";
import { useState } from "react";
import Link from "next/link";
export function CookieNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <div className="cookie-notice"><span>Essential cookies are used for security and preferences.</span><Link href="/legal/cookies">Cookies</Link><button onClick={() => setVisible(false)}>Dismiss</button></div>;
}
