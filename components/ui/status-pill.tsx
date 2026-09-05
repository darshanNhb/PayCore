import { getStatusVariant } from "@/lib/utils/status";

export function StatusPill({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  return (
    <span className={`pill ${variant}`}>
      <i />
      {status}
    </span>
  );
}
