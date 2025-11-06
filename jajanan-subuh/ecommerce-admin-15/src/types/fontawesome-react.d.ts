declare module "@fortawesome/react-fontawesome" {
  import * as React from "react";
  import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

  export interface FontAwesomeIconProps {
    icon: IconDefinition | [string, string] | string;
    className?: string;
    title?: string;
    spin?: boolean;
    pulse?: boolean;
    beat?: boolean;
    fixedWidth?: boolean;
    inverse?: boolean;
    transform?: string | object;
    mask?: unknown;
  }

  export const FontAwesomeIcon: React.FC<FontAwesomeIconProps>;
  export default FontAwesomeIcon;
}
