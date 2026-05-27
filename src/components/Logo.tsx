import { Link } from "react-router-dom";

interface LogoProps {
  /** Render as a link to the homepage. Defaults to true. */
  asLink?: boolean;
  /** Visual size of the wordmark. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * PICKUP HAUL brand lockup — wordless v11 mark + Oswald wordmark.
 * Single source of truth for header, footer, and any other surface.
 */
const Logo = ({ asLink = true, size = "md", className = "" }: LogoProps) => {
  const wordmarkClass =
    size === "sm"
      ? "font-heading text-base font-semibold tracking-[0.18em] text-foreground"
      : "font-heading text-lg md:text-xl font-semibold tracking-[0.18em] text-foreground";

  const content = (
    <span className={`flex items-center gap-2.5 group ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        aria-hidden="true"
        focusable="false"
        className="h-[50px] w-[50px] md:h-[60px] md:w-[60px] shrink-0"
      >
        <rect width="512" height="512" rx="108" fill="#070707" fillOpacity="0.4" />
        <path d="M108 319h103l36-62c10-17 27-27 49-27h52c51 0 91 40 91 91v25H108z" fill="#F7F2EA" />
        <path d="M249 257h82c31 0 57 24 62 55H211z" fill="#070707" />
        <path d="M273 273h51c22 0 40 16 46 38H243z" fill="#F7F2EA" />
        <path d="M108 346h331v27H108z" fill="#F7F2EA" />
        <path d="M127 330h82" stroke="#070707" strokeWidth="15" strokeLinecap="round" />
        <path d="M244 259l-35 60" stroke="#070707" strokeWidth="9" strokeLinecap="round" />
        <rect x="130" y="267" width="35" height="31" rx="5" fill="#F7F2EA" />
        <rect x="168" y="250" width="38" height="48" rx="5" fill="#F7F2EA" />
        <rect x="208" y="269" width="32" height="29" rx="5" fill="#F7F2EA" />
        <path d="M148 267v31M168 274h38M187 250v48M224 269v29" stroke="#070707" strokeWidth="6" strokeLinecap="round" />
        <path d="M103 190c53-45 128-60 191-29 45 22 75 65 121 32" fill="none" stroke="#FF5A14" strokeWidth="23" strokeLinecap="round" />
        <circle cx="103" cy="190" r="13" fill="#FF5A14" />
        <circle cx="415" cy="193" r="13" fill="#FF5A14" />
        <circle cx="175" cy="383" r="39" fill="#FF5A14" />
        <circle cx="175" cy="383" r="23" fill="#070707" />
        <circle cx="356" cy="383" r="39" fill="#FF5A14" />
        <circle cx="356" cy="383" r="23" fill="#070707" />
      </svg>
      <span className={wordmarkClass}>PICKUP HAUL</span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link to="/" aria-label="PICKUP HAUL — go to homepage" className="inline-flex">
      {content}
    </Link>
  );
};

export default Logo;
