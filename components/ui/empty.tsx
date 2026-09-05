import { Sparkles } from "lucide-react";

interface EmptyProps {
  title: string;
  message?: string;
}

export function Empty({
  title,
  message = "Try changing your filters or create a new record.",
}: EmptyProps) {
  return (
    <div className="empty">
      <Sparkles size={25} />
      <b>{title}</b>
      <span>{message}</span>
    </div>
  );
}
