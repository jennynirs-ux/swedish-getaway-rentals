import type { Metadata } from 'next';
import ProductClient from './ProductClient';

export const metadata: Metadata = {
  title: 'Product Details',
  description: 'View product details from the Nordic Collection.',
};

export default function ProductDetailPage() {
  return <ProductClient />;
}
