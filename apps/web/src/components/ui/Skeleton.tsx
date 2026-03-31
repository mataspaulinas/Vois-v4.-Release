type SkeletonProps = {
  shape?: "line" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  className?: string;
};

export function Skeleton({ shape = "line", width, height, className }: SkeletonProps) {
  const cls = [
    "ui-skeleton",
    `ui-skeleton--${shape}`,
    className ?? "",
  ].filter(Boolean).join(" ");

  return <div className={cls} style={{ width, height }} />;
}
