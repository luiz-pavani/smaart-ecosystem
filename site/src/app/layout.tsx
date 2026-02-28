
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Sora:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{fontFamily:'Inter, Sora, Arial, Helvetica, sans-serif'}}>
        {children}
      </body>
    </html>
  );
}
