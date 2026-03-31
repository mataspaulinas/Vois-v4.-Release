import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

type TableProps = { children: ReactNode; className?: string };

export function Table({ children, className }: TableProps) {
  return <table className={`ui-table ${className ?? ""}`}>{children}</table>;
}

export function Th({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <th className={className} {...rest}>{children}</th>;
}

export function Td({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return <td className={className} {...rest}>{children}</td>;
}
