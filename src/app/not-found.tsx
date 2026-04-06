import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        This route has drifted off course.
      </h1>
      <p className="text-base leading-7 text-muted-foreground">
        The page does not exist, or the path has changed.
      </p>
      <Link className="text-sm font-medium text-primary" href="/dashboard">
        Return to the dashboard
      </Link>
    </div>
  );
}
