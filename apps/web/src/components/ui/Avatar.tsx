type AvatarProps = {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2)
    : "?";

  return (
    <div className={`ui-avatar ui-avatar--${size} ${className ?? ""}`}>
      {src ? <img src={src} alt={name ?? "Avatar"} /> : initials}
    </div>
  );
}
