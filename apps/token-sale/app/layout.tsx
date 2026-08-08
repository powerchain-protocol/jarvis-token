import "./styles.css";
import { CookieNotice } from "../components/cookie-notice";
export const metadata = { title: "JARVIS Token Sale", description: "Official JARVIS token sale interface" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<CookieNotice /></body></html>;
}
