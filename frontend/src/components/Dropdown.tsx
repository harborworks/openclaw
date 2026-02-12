import { useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownProps {
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

/**
 * Generic dropdown with click-outside-to-close behavior.
 * `trigger` renders the button; `children` receives a close callback.
 */
export function Dropdown({ trigger, children, className, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className={className} ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}>{trigger(open)}</div>
      {open && (
        <div className="dropdown-panel" data-align={align}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 6 }}>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
