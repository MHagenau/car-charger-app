// app/layout.tsx
import './globals.css'; // Make sure this path correctly points to your global CSS file (e.g., Tailwind CSS)
import type { Metadata } from 'next'; // Import Metadata type for Next.js 13+

// Define metadata for your application, which will appear in the <head> section
export const metadata: Metadata = {
  title: 'Car Charger Cost Calculator',
  description: 'Compare different home car charging solutions and their costs over time.',
};

// RootLayout component that wraps all pages
export default function RootLayout({
  children, // The 'children' prop represents the content of the current page or nested layout
}: {
  children: React.ReactNode; // Type definition for children
}) {
  return (
    // Ensure no whitespace immediately after the opening <html> tag or before the closing </html> tag
    <html lang="en">
      {/* Ensure no whitespace immediately after the opening <body> tag or before the closing </body> tag */}
      <body>
        {children} {/* This is where all your page content will be rendered */}
      </body>
    </html>
  );
}
