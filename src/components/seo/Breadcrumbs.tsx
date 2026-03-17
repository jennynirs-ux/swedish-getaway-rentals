import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbJsonLd } from './JsonLd';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const BASE_URL = 'https://nordic-getaways.com';

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const allItems = [{ label: 'Home', href: '/' }, ...items];
  const jsonLdItems = allItems
    .filter((item) => item.href)
    .map((item) => ({
      name: item.label,
      url: `${BASE_URL}${item.href}`,
    }));

  // Add the last item (current page) even if it has no href
  const lastItem = allItems[allItems.length - 1];
  if (!lastItem.href) {
    jsonLdItems.push({
      name: lastItem.label,
      url: `${BASE_URL}${window.location.pathname}`,
    });
  }

  return (
    <>
      <BreadcrumbJsonLd items={jsonLdItems} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground py-3">
        <ol className="flex items-center flex-wrap gap-1">
          {allItems.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === 0 && <Home className="h-3 w-3 mr-0.5" />}
              {item.href && i < allItems.length - 1 ? (
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
