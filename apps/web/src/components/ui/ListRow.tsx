import type { ReactNode, HTMLAttributes } from "react";

type ListRowProps = HTMLAttributes<HTMLDivElement> & {
  left: ReactNode;
  right?: ReactNode;
};

export function ListRow({ left, right, className, ...rest }: ListRowProps) {
  return (
    <div className={`ui-list-row ${className ?? ""}`} {...rest}>
      <div className="ui-list-row__left">{left}</div>
      {right && <div className="ui-list-row__right">{right}</div>}
    </div>
  );
}
