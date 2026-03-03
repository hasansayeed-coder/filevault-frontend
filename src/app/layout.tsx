'use client';

import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30 * 1000 },
    },
  }));

  return (
    <html lang="en">
      <head>
        <title>FileVault — Subscription-Based Storage</title>
        <meta name="description" content="Manage your files and folders with subscription-based storage" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1a24',
                color: '#e8e8f0',
                border: '1px solid #2e2e42',
                borderRadius: '10px',
                fontSize: '0.875rem',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#1a1a24' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a24' } },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}