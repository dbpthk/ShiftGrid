import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "ShiftGrid",
  description: "Roster management made simple.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({ children }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-gray-600 sm:px-6 lg:px-8">
            © {year} ShiftGrid · made by Dhruv
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
