import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";
import { useCart } from "@/context/CartContext";

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
  printful_data?: any;
  visible?: boolean;
  is_visible_shop?: boolean;
  is_visible_home?: boolean;
  printful_product_id?: string;
  printful_sync_variant_id?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', id)
        .eq('visible', true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description = product.description_override || product.custom_description || product.description;
    const price = product.price_override || product.custom_price || product.price;
    const imageUrl = product.main_image_override || product.image_url;
    
    // Get all available images
    const allImages = [imageUrl];
    if (product.additional_images_override) {
      allImages.push(...product.additional_images_override);
    }
    if (product.printful_data?.all_images && Array.isArray(product.printful_data.all_images)) {
      product.printful_data.all_images.forEach((img: string) => {
        if (!allImages.includes(img)) {
          allImages.push(img);
        }
      });
    }
    
    return { title, description, price, allImages: allImages.filter(Boolean) };
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const getVariantPrice = (variant: any) => {
    if (!variant?.retail_price) return null;
    return Math.round(parseFloat(variant.retail_price) * 100);
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    
    if (selectedVariant && product.printful_data?.variants && Array.isArray(product.printful_data.variants)) {
      const variant = product.printful_data.variants.find((v: any) => v.id?.toString() === selectedVariant);
      const variantPrice = getVariantPrice(variant);
      if (variantPrice) return variantPrice;
    }
    
    const { price } = getDisplayData(product);
    return price;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setPurchasing(true);
    try {
      const { title } = getDisplayData(product);
      const priceToAdd = getCurrentPrice();
      addItem({
        productId: product.id,
        title,
        price: priceToAdd,
        currency: product.currency,
        quantity,
        image: product.main_image_override || product.image_url,
        variantId: selectedVariant,
        variantName: product.printful_data?.variants?.find((v: any) => v.id?.toString() === selectedVariant)?.name || null
      });
      toast({ title: 'Added to cart', description: title });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add to cart.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const nextImage = () => {
    if (!product) return;
    const { allImages } = getDisplayData(product);
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (!product) return;
    const { allImages } = getDisplayData(product);
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Product Not Found</h1>
            <Link to="/shop">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { title, description, allImages } = getDisplayData(product);
  const currentPrice = getCurrentPrice();
  const variants = (product.printful_data?.variants && Array.isArray(product.printful_data.variants)) ? product.printful_data.variants : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="container mx-auto">
          <Link to="/shop">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-foreground border-border bg-background/80 hover:bg-background/90 backdrop-blur-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Shop</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>
      </nav>
      
      <div className="container mx-auto px-4 py-8 pt-20">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={allImages[currentImageIndex] || '/placeholder.svg'}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index 
                        ? 'border-primary' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${title} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              <div className="text-3xl font-bold text-primary mb-4">
                {formatPrice(currentPrice, product.currency)}
              </div>
              <Badge variant="secondary" className="mb-4">
                In Stock
              </Badge>
            </div>

            {description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            )}

            {/* Variant Selection */}
            {variants.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Options</h3>
                <Select value={selectedVariant || ''} onValueChange={setSelectedVariant}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id?.toString()}>
                        {variant.name} {variant.retail_price && `- ${formatPrice(getVariantPrice(variant) || 0, product.currency)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity Selection */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Quantity</h3>
              <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Button */}
            <Card>
              <CardContent className="p-6">
                <Button
                   onClick={handleAddToCart}
                   disabled={purchasing || (variants.length > 1 && !selectedVariant)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg"
                  size="lg"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart - {formatPrice(currentPrice * quantity, product.currency)}
                    </>
                  )}
                </Button>
                
                {variants.length > 1 && !selectedVariant && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Please select an option to continue
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Product Features */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                Free shipping on orders over 500 SEK
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                High-quality printing and materials
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                Sustainable production process
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;