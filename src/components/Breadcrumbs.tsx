import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // omit on the current page
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible breadcrumb navigation with schema.org microdata.
 * JSON-LD BreadcrumbList should be emitted separately via SEO component.
 */
const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-[0.2em] uppercase text-muted-foreground"
      >
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const position = idx + 1;
          return (
            <li
              key={`${item.label}-${idx}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-2"
            >
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  itemProp="item"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors focus:outline-none focus-visible:text-foreground"
                >
                  {idx === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-foreground" : undefined}
                  itemProp="name"
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(position)} />
              {!isLast && (
                <ChevronRight
                  className="h-3 w-3 text-foreground/30 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
