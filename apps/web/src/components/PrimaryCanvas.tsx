import { PropsWithChildren } from "react";

type PrimaryCanvasProps = PropsWithChildren<{
  padding?: string;
  maxWidth?: string;
}>;

export function PrimaryCanvas({ children, padding, maxWidth }: PrimaryCanvasProps) {
  return (
    <div
      className="primary-canvas"
      style={{
        ...(padding ? { padding } : {}),
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      {children}
    </div>
  );
}
