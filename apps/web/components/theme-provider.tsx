"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentType, ReactNode } from "react";

const NextThemeProvider = NextThemesProvider as ComponentType<{
  attribute: "class";
  defaultTheme: string;
  enableSystem: boolean;
  children: ReactNode;
}>;

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
    >
      {children}
    </NextThemeProvider>
  );
}
