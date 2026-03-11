import { LoaderCircle, Sparkles } from "lucide-react";
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
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/85 text-secondary opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-border hover:text-user disabled:cursor-wait disabled:opacity-100 dark:bg-zinc-900/90",
        isBusy && "border-border text-user",
      )}
      aria-label="Enhance note"
      title="Enhance note"
    >
      {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
    </button>
  );
}
