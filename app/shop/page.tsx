import type { Metadata } from 'next';
import { createServerClient } from '../lib/supabase-server';
import ShopClient from '../shop-client';

// ISR: Revalidate shop every 2 hours
export const revalidate = 7200;

export const metadata: Metadata = {
  title: 'The Nordic Collection - Nordic Getaways',
  description:
    'Discover curated Nordic design and lifestyle products. Unique items sourced from across Scandinavia.',
  keywords: ['Nordic design', 'Scandinavian products', 'gifts', 'lifestyle'],
  openGraph: {
    type: 'website',
    url: 'https://nordic-getaways.com/shop',
    title: 'The Nordic Collection - Nordic Getaways',
    description:
      'Discover curated Nordic design and lifestyle products. Unique items sourced from across Scandinavia.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nordic Getaways Shop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Nordic Collection - Nordic Getaways',
    description: 'Discover curated Nordic design and lifestyle products.',
  },
};

interface ShopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  custom_description?: string;
  custom_price?: number;
  title_override?: string;
  description_override?: string;
  price_override?: number;
  main_image_override?: string;
  additional_images_override?: string[];
  is_visible_shop: boolean;
  is_visible_home: boolean;
  sort_order?: number;
  printful_data?: any;
  product_type?: string;
  color?: string;
  tags?: string[];
}

async function getShopProducts() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('shop_products')
      .select(
        `
        id,
        title,
        description,
        price,
        currency,
        image_url,
        custom_description,
        custom_price,
        title_override,
        description_override,
        price_override,
        main_image_override,
        additional_images_override,
        is_visible_shop,
        is_visible_home,
        sort_order,
        printful_data,
        product_type,
        color,
        tags
      `
      )
      .eq('is_visible_shop', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching shop products:', error);
      return [];
    }

    return (data || []) as ShopProduct[];
  } catch (error) {
    console.error('Failed to fetch shop products:', error);
    return [];
  }
}

export default async function ShopPage() {
  const products = await getShopProducts();

  return <ShopClient initialProducts={products} />;
}
