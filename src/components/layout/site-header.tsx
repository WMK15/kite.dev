import Image from "next/image";
import Link from "next/link";

export function SiteHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-3" href="/">
            <Image
              src="/brand/wordmark-transparent.svg"
              alt="Kite.dev"
              width={132}
              height={36}
              priority
              style={{ width: "auto", height: "36px" }}
            />
          </Link>
          <p className="hidden text-sm text-muted-foreground md:block">
            Keep Notion tasks and GitHub branches aligned.
          </p>
        </div>
        <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link
            className="transition-colors hover:text-foreground"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/integrations"
          >
            Integrations
          </Link>
        </nav>
      </div>
    </header>
  );
}
