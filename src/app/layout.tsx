import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Finance Dashboard",
  description: "Track all your financial accounts in one place",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} text-gray-900`}>
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar Navigation */}
            <nav className="w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-8 text-blue-700">
                Personal Finance
              </h2>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/"
                    className="block px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-blue-100 transition-colors"
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/transactions"
                    className="block px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-blue-100 transition-colors"
                  >
                    Transactions
                  </a>
                </li>
                <li>
                  <a
                    href="/accounts"
                    className="block px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-blue-100 transition-colors"
                  >
                    Accounts
                  </a>
                </li>
              </ul>
            </nav>
            {/* Main Content */}
            <div className="flex-1 p-8">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
