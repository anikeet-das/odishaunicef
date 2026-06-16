import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Sidebar, useSidebarWidth } from "@/components/layout/Sidebar";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { ViewModeProvider } from "@/components/layout/view-mode";
import { AIChatFab } from "@/components/ai/AIChatFab";
import { SettingsProvider, useSettings } from "@/components/layout/settings-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AdminSessionProvider } from "@/lib/admin/session";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UNICEF WASH by ANIKET" },
      { name: "description", content: "Futuristic AI command center for climate-resilient WASH & sustainable schools across Odisha." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "UNICEF WASH by ANIKET" },
      { property: "og:description", content: "Futuristic AI command center for climate-resilient WASH & sustainable schools across Odisha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "UNICEF WASH by ANIKET" },
      { name: "twitter:description", content: "Futuristic AI command center for climate-resilient WASH & sustainable schools across Odisha." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/lC3zIBYxHxcHQuVu6MiYsrKGMnW2/social-images/social-1780818505793-ChatGPT_Image_Jun_7,_2026,_01_17_56_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/lC3zIBYxHxcHQuVu6MiYsrKGMnW2/social-images/social-1780818505793-ChatGPT_Image_Jun_7,_2026,_01_17_56_PM.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AdminSessionProvider>
            <SettingsProvider>
              <ViewModeProvider>
                <Shell />
              </ViewModeProvider>
            </SettingsProvider>
          </AdminSessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const { settings } = useSettings();
  const sw = useSidebarWidth();
  return (
    <>
      <div className="app-shell relative">
        <Sidebar />
        <main
          className="app-main min-w-0"
          style={{ ["--sw" as any]: `${sw}px` }}
        >
          <SectionTabs />
          <Outlet />
        </main>
      </div>
      {settings.showAiFab && <AIChatFab />}
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
