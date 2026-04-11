import './globals.css';

export const metadata = {
  title: 'Construction Leads — Los Gatos & Saratoga',
  description: 'Pending planning projects — Los Gatos & Saratoga',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
