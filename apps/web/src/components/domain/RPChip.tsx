type RPChipProps = {
  code: string;
  name: string;
  onClick?: () => void;
};

export function RPChip({ code, name, onClick }: RPChipProps) {
  const interactive = !!onClick;

  return (
    <button
      type="button"
      className={[
        "rp-chip",
        interactive ? "rp-chip--interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={!interactive}
    >
      <span className="rp-chip__code">{code}</span>
      <span className="rp-chip__name">{name}</span>
    </button>
  );
}
