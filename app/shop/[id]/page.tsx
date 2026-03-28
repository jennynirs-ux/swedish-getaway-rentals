import type { Metadata } from 'next';
import ProductClient from './ProductClient';
import { createServerClient } from '../../lib/supabase-server';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createServerClient();
    const { data: product } = await supabase
      .from('shop_products')
      .select('title, description, image_url, price, currency')
      .eq('id', id)
      .eq('visible', true)
      .single();

    if (product) {
      const priceFormatted = new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: product.currency || 'SEK',
      }).format((product.price || 0) / 100);

      return {
        title: product.title,
        description: product.description?.substring(0, 160) || `${product.title} — ${priceFormatted} from the Nordic Collection.`,
        openGraph: {
          title: `${product.title} | Nordic Collection`,
          description: product.description?.substring(0, 160) || `Shop ${product.title} from the Nordic Collection.`,
          images: product.image_url ? [{ url: product.image_url, width: 800, height: 600, alt: product.title }] : [],
        },
        alternates: {
          canonical: `/shop/${id}`,
        },
      };
    }
  } catch {
    // Fallback to defaults
  }

  return {
    title: 'Product Details',
    description: 'View product details from the Nordic Collection.',
  };
}

export default function ProductDetailPage() {
  return <ProductClient />;
}
