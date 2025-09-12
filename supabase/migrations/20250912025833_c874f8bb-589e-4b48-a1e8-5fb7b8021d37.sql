-- Create orders table for shop purchases
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  stripe_payment_intent_id TEXT,
  printful_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  product_data JSONB,
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shop_products table for Printful product management
CREATE TABLE public.shop_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  printful_product_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  image_url TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  custom_description TEXT,
  custom_price INTEGER,
  printful_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own orders, admins can view all" 
ON public.orders 
FOR SELECT 
USING (
  is_user_admin_safe(auth.uid()) OR 
  (user_id IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "Admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (is_user_admin_safe(auth.uid()));

-- Shop products policies
CREATE POLICY "Products are viewable by everyone when visible" 
ON public.shop_products 
FOR SELECT 
USING (visible = true OR is_user_admin_safe(auth.uid()));

CREATE POLICY "Admins can manage shop products" 
ON public.shop_products 
FOR ALL 
USING (is_user_admin_safe(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_products_updated_at
BEFORE UPDATE ON public.shop_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();