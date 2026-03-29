import { PropsWithChildren, ReactNode } from "react";
import { SurfaceHeader, SurfaceHeaderProps } from "./SurfaceHeader";
import { PrimaryCanvas } from "./PrimaryCanvas";

type PageLayoutProps = PropsWithChildren<{
  header: SurfaceHeaderProps;
  inspector?: ReactNode;
  drawer?: ReactNode;
  canvasMaxWidth?: string;
  canvasPadding?: string;
}>;

export function PageLayout({ header, inspector, drawer, canvasMaxWidth, canvasPadding, children }: PageLayoutProps) {
  return (
    <div className="page-layout">
      <SurfaceHeader {...header} />
      <div className="page-layout__body">
        <PrimaryCanvas maxWidth={canvasMaxWidth} padding={canvasPadding}>
          {children}
        </PrimaryCanvas>
        {inspector && <div className="page-layout__inspector">{inspector}</div>}
      </div>
      {drawer}
    </div>
  );
}
