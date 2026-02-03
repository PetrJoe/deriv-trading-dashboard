import "./globals.css";

export const metadata = {
  title: "Deriv Volatility Signals",
  description: "Real-time trading signal dashboard for Deriv volatility indices."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
