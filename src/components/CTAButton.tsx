import { ArrowRight, Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CTAVariant = "primary" | "secondary" | "ghost";
type CTASize = "sm" | "md" | "lg";

type BaseProps = {
  variant?: CTAVariant;
  size?: CTASize;
  icon?: "arrow" | "phone" | "message" | "none";
  iconPosition?: "left" | "right";
  children: ReactNode;
  className?: string;
};

type AnchorProps = BaseProps & ComponentPropsWithoutRef<"a"> & { as?: "a" };
type ButtonProps = BaseProps & ComponentPropsWithoutRef<"button"> & { as: "button" };

export type CTAButtonProps = AnchorProps | ButtonProps;

const sizeStyles: Record<CTASize, string> = {
  sm: "h-10 px-5 text-xs",
  md: "h-12 px-7 text-sm",
  lg: "h-14 px-8 md:px-9 text-sm md:text-base",
};

const variantStyles: Record<CTAVariant, string> = {
  primary:
    "bg-gradient-primary text-primary-foreground border border-primary/40 shadow-glow hover:shadow-glow-soft hover:scale-[1.03]",
  secondary:
    "glass-subtle text-foreground border border-white/10 hover:border-primary/40 hover:bg-white/5",
  ghost:
    "bg-transparent text-foreground/80 border border-transparent hover:text-foreground hover:bg-white/5",
};

export const CTAButton = (props: CTAButtonProps) => {
  const {
    variant = "primary",
    size = "md",
    icon = "arrow",
    iconPosition = "right",
    className,
    children,
    ...rest
  } = props;

  const Icon = icon === "phone" ? Phone : icon === "arrow" ? ArrowRight : icon === "message" ? MessageCircle : null;

  const content = (
    <>
      {Icon && iconPosition === "left" && (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            icon === "arrow" && "group-hover:-translate-x-1",
            icon === "phone" && variant === "primary" && "text-primary-foreground",
            icon === "phone" && variant !== "primary" && "text-primary",
          )}
        />
      )}
      <span className="font-heading tracking-[0.15em] uppercase">{children}</span>
      {Icon && iconPosition === "right" && (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            icon === "arrow" && "group-hover:translate-x-1",
            icon === "phone" && variant === "primary" && "text-primary-foreground",
            icon === "phone" && variant !== "primary" && "text-primary",
          )}
        />
      )}
    </>
  );

  const baseClass = cn(
    "group inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:pointer-events-none",
    sizeStyles[size],
    variantStyles[variant],
    className,
  );

  if ((props as ButtonProps).as === "button") {
    const { as: _as, ...buttonRest } = rest as ButtonProps;
    return (
      <button className={baseClass} {...buttonRest}>
        {content}
      </button>
    );
  }

  const { as: _as, ...anchorRest } = rest as AnchorProps;
  return (
    <a className={baseClass} {...anchorRest}>
      {content}
    </a>
  );
};

export default CTAButton;
