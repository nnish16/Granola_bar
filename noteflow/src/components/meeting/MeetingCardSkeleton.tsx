export default function MeetingCardSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse rounded-3xl border border-border bg-white/90 p-5 dark:bg-zinc-950/80">
      <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-zinc-800" />
      <div className="mt-3 h-3 w-1/2 rounded bg-gray-100 dark:bg-zinc-800" />
      <div className="mt-4 h-3 w-full rounded bg-gray-100 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-5/6 rounded bg-gray-100 dark:bg-zinc-800" />
    </div>
  );
}
