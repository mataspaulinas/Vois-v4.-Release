type LoadingStateProps = {
  variant?: "card" | "list" | "canvas" | "inspector";
};

export function LoadingState({ variant = "canvas" }: LoadingStateProps) {
  const rows = variant === "card" ? 1 : variant === "list" ? 5 : variant === "inspector" ? 3 : 2;

  return (
    <div className={`loading-state loading-state--${variant}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="loading-state__shimmer" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}
