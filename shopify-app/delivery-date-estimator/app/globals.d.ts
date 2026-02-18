import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "*.css";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ui-nav-menu": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export {};
