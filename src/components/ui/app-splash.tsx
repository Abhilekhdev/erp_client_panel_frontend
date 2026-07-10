/**
 * Full-screen, brand-forward loading splash. Used for the initial app boot (session restore) and
 * any route-level gate where we briefly wait for auth. The Olympas wordmark sits on a white chip
 * so the dark logo art stays legible in both light and dark themes.
 */
export function AppSplash({ label = 'Preparing your workspace…' }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-8 bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm ring-1 ring-black/5">
          <img
            src="/olympas-logo.png"
            alt="Olympas LLC"
            width={198}
            height={64}
            className="h-12 w-auto object-contain"
            style={{ animation: 'splash-breathe 1.8s ease-in-out infinite' }}
          />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Enterprise ERP
        </span>
      </div>

      {/* Indeterminate progress bar */}
      <div
        className="h-1 w-44 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
      >
        <div
          className="h-full w-1/3 rounded-full bg-primary"
          style={{ animation: 'splash-slide 1.15s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
}
