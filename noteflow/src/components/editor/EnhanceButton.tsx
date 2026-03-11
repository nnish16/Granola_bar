import { Sparkles } from "lucide-react";

type EnhanceButtonProps = {
  onClick: () => void;
};

export default function EnhanceButton({ onClick }: EnhanceButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/85 text-secondary opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-border hover:text-user dark:bg-zinc-900/90"
      aria-label="Enhance note"
      title="Enhance note"
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );
}
