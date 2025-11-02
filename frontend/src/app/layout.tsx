export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>FHEVM Lottery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ 
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
        margin: 0,
        padding: 0,
        backgroundColor: '#2b2d30',
        color: '#e8e8e8',
        minHeight: '100vh'
      }}>
        {children}
      </body>
    </html>
  );
}


