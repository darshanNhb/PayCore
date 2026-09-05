type AvatarProps = {
  initials: string;
  color?: string; // e.g. "bg-indigo-100 text-indigo-700"
  small?: boolean;
};

export function Avatar({ initials, color = "bg-slate-200 text-slate-700", small = false }: AvatarProps) {
  return (
    <span className={`${color} avatar ${small ? "avatar-sm" : ""}`}>
      {initials}
    </span>
  );
}
