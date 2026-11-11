"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

import { NotWiredError } from "@/types/api";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Retrying an unwired operation just repeats the same failure.
              if (error instanceof NotWiredError) return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            color: "#102018",
            border: "1px solid #E2E8E4",
            fontSize: "14px",
            maxWidth: "420px",
          },
          success: { iconTheme: { primary: "#0F9E31", secondary: "#FFFFFF" } },
          error: { iconTheme: { primary: "#D92D20", secondary: "#FFFFFF" } },
        }}
      />
    </QueryClientProvider>
  );
}
