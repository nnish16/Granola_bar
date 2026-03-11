import { cn } from "../../lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export default function Badge({ className, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent",
        className,
      )}
      {...props}
    />
  );
}
