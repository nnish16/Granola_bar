import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

type EnhanceButtonProps = {
  isBusy?: boolean;
  onClick: () => void;
};

export default function EnhanceButton({ isBusy = false, onClick }: EnhanceButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBusy}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/80 text-secondary opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-border hover:text-user dark:bg-zinc-900/90",
        isBusy && "cursor-wait opacity-100",
      )}
      aria-label="Enhance note"
      title="Enhance note"
    >
      <Sparkles className={cn("h-4 w-4", isBusy && "animate-pulse text-accent")} />
    </button>
  );
}
