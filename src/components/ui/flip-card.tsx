"use client";

import * as React from "react";

export interface FlipCardProps {
  children: React.ReactNode;
  back?: React.ReactNode;
  axis?: "y" | "x";
  duration?: number; // milliseconds
  className?: string;
  id?: string;
}

type FlipCardGroupState = {
  current: string | null;
  setCurrent: (id: string | null) => void;
};

const FlipCardGroupContext = React.createContext<FlipCardGroupState | null>(
  null
);

export function FlipCardGroup({
  children,
  defaultOpenId,
}: {
  children: React.ReactNode;
  defaultOpenId?: string | null;
}) {
  const [current, setCurrent] = React.useState<string | null>(
    defaultOpenId ?? null
  );
  const value = React.useMemo(() => ({ current, setCurrent }), [current]);
  return (
    <FlipCardGroupContext.Provider value={value}>
      {children}
    </FlipCardGroupContext.Provider>
  );
}

export default function FlipCard({
  children,
  back,
  axis = "y",
  duration = 600,
  className = "",
  id,
}: FlipCardProps) {
  const group = React.useContext(FlipCardGroupContext);

  // local fallback state when not used inside a group
  const [localFlipped, setLocalFlipped] = React.useState(false);

  const isGrouped = !!group && typeof id === "string";
  const flipped = isGrouped ? group.current === id : localFlipped;

  const rotateClass =
    axis === "y"
      ? flipped
        ? "[transform:rotateY(180deg)]"
        : "[transform:rotateY(0deg)]"
      : flipped
      ? "[transform:rotateX(180deg)]"
      : "[transform:rotateX(0deg)]";
  const backRotateClass =
    axis === "y"
      ? "[transform:rotateY(180deg)]"
      : "[transform:rotateX(180deg)]";

  const toggle = () => {
    if (isGrouped && group) {
      // if already open, close; otherwise open this id
      group.setCurrent(group.current === id ? null : id ?? null);
    } else {
      setLocalFlipped((s) => !s);
    }
  };

  // try to mirror background/text classes from the front child
  let mirroredBgClass = "bg-card";
  let mirroredTextClass = "text-card-foreground";
  try {
    if (React.isValidElement(children)) {
      const childProps = (children as React.ReactElement).props || {};
      const classes = String(
        (childProps as { className?: string }).className || ""
      );
      // pick bg-... (including arbitrary values like bg-[#0691ff]) and text-...
      const bgMatch = classes.match(/\b(bg-\[[^\]]+\]|bg-[^\s]+)/);
      const textMatch = classes.match(/\b(text-[^\s]+)/);
      if (bgMatch) mirroredBgClass = bgMatch[0];
      if (textMatch) mirroredTextClass = textMatch[0];
    }
  } catch {
    // ignore parsing errors
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl h-full w-full [perspective:1000px] ${className}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div
        className={`h-full w-full [transform-style:preserve-3d] transition-transform will-change-transform ${rotateClass} origin-center`}
        style={{ transitionDuration: `${duration}ms` }}
      >
        <div className="h-full w-full [backface-visibility:hidden]">
          {children}
        </div>

        <div
          className={`absolute inset-0 h-full w-full [backface-visibility:hidden] ${backRotateClass}`}
        >
          <div
            className={`h-full w-full ${mirroredBgClass} ${mirroredTextClass} rounded-xl border p-3 shadow-sm flex items-center justify-center`}
          >
            {back ? (
              typeof back === "string" ? (
                <div className="text-center">
                  <div className="text-sm mb-1 font-medium">Detail</div>
                  <div className="text-xs max-w-[160px]">{back}</div>
                </div>
              ) : (
                back
              )
            ) : (
              <div className="text-sm">Info</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
