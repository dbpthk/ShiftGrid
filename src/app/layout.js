import "./globals.css";

export const metadata = {
  title: "ShiftGrid",
  description: "Roster management made simple.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
