import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Edit2, Eye, EyeOff, Home, RefreshCw } from "lucide-react";

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
  printful_id?: string;
  created_at?: string;
}

interface ShopProductsManagementProps {
  editingProductId?: string | null;
  onClearEditingProduct?: () => void;
}

const ShopProductsManagement = ({ editingProductId, onClearEditingProduct }: ShopProductsManagementProps) => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [editForm, setEditForm] = useState({
    title_override: "",
    description_override: "",
    price_override: "",
    main_image_override: "",
    is_visible_shop: true,
    is_visible_home: false,
    sort_order: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (editingProductId && products.length > 0) {
      const product = products.find((p) => p.id === editingProductId);
      if (product) {
        handleEdit(product);
        onClearEditingProduct?.();
      }
    }
  }, [editingProductId, products]);

const loadProducts = async () => {
  try {
    setLoading(true);

    // 1. Hämta Printful direkt via Edge-funktion
    const { data: printfulRes, error: printfulError } = await supabase.functions.invoke("fetch-printful-products");
    if (printfulError) throw printfulError;

    const printfulProducts = printfulRes?.result || [];

    // 2. Hämta overrides från Supabase
    const { data: overrides, error: supabaseError } = await supabase.from("shop_products").select("*");
    if (supabaseError) throw supabaseError;

    // 3. Slå ihop baserat på printful_id
    const merged = printfulProducts.map((p: any) => {
      const override = overrides?.find((o) => o.printful_id === String(p.id));

      return {
        id: String(p.id), // alltid samma ID (Printfuls)
        printful_id: String(p.id),
        title: override?.title_override || p.name,
        description: override?.description_override || p.description,
        price: override?.price_override || parseFloat(p.retail_price), // Retailpris direkt från Printful
        currency: p.currency || "EUR",
        image_url: override?.main_image_override || p.thumbnail_url,
        is_visible_shop: override?.is_visible_shop ?? true,
        is_visible_home: override?.is_visible_home ?? false,
        sort_order: override?.sort_order || null,
        // behåll även all override-data ifall vi redigerar senare
        ...override,
      } as ShopProduct;
    });

    setProducts(merged);
  } catch (error) {
    console.error("Error loading products:", error);
    toast({
      title: "Error",
      description: "Failed to load products",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const handleEdit = (product: ShopProduct) => {
    setEditingProduct(product);
    setEditForm({
      title_override: product.title_override || "",
      description_override: product.description_override || "",
      price_override: product.price_override?.toString() || "",
      main_image_override: product.main_image_override || "",
      is_visible_shop: product.is_visible_shop,
      is_visible_home: product.is_visible_home,
      sort_order: product.sort_order?.toString() || "",
    });
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      const updateData: any = {
        printful_id: editingProduct.printful_id,
        is_visible_shop: editForm.is_visible_shop,
        is_visible_home: editForm.is_visible_home,
      };

      if (editForm.title_override.trim()) updateData.title_override = editForm.title_override.trim();
      else updateData.title_override = null;

      if (editForm.description_override.trim()) updateData.description_override = editForm.description_override.trim();
      else updateData.description_override = null;

      if (editForm.price_override.trim()) updateData.price_override = parseInt(editForm.price_override);
      else updateData.price_override = null;

      if (editForm.main_image_override.trim()) updateData.main_image_override = editForm.main_image_override.trim();
      else updateData.main_image_override = null;

      if (editForm.sort_order.trim()) updateData.sort_order = parseInt(editForm.sort_order);
      else updateData.sort_order = null;

      // Upsert = skapa om det inte finns, annars uppdatera
      const { error } = await supabase.from("shop_products").upsert(updateData, { onConflict: "printful_id" });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (
    product: ShopProduct,
    field: "is_visible_shop" | "is_visible_home",
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("shop_products")
        .upsert({ printful_id: product.printful_id, [field]: value }, { onConflict: "printful_id" });

      if (error) throw error;

      await loadProducts();
      toast({
        title: "Success",
        description: `Product visibility updated successfully`,
      });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update product visibility",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
    }).format(price / 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shop Products</h2>
          <p className="text-muted-foreground">Manage your Printful products and overrides</p>
        </div>
        <Button onClick={loadProducts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh from Printful
        </Button>
      </div>

      {editingProduct && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Product: {editingProduct.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title Override (optional)</Label>
                <Input
                  value={editForm.title_override}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title_override: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Price Override (optional, in cents)</Label>
                <Input
                  type="number"
                  value={editForm.price_override}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, price_override: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description Override</Label>
              <Textarea
                value={editForm.description_override}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description_override: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Main Image Override</Label>
              <Input
                value={editForm.main_image_override}
                onChange={(e) => setEditForm((prev) => ({ ...prev, main_image_override: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={editForm.sort_order}
                onChange={(e) => setEditForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.is_visible_shop}
                  onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, is_visible_shop: checked }))}
                />
                <Label>Visible in shop</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.is_visible_home}
                  onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, is_visible_home: checked }))}
                />
                <Label>Show on homepage</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4 flex gap-4 items-start">
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{product.title}</h3>
                  {product.sort_order && <Badge variant="outline">Order: {product.sort_order}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{product.description?.substring(0, 80)}...</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-primary">{formatPrice(product.price, product.currency)}</span>
                  {product.price_override && <Badge variant="secondary">Custom Price</Badge>}
                </div>
                <div className="flex gap-2">
                  <Badge variant={product.is_visible_shop ? "default" : "secondary"}>
                    {product.is_visible_shop ? "Shop" : "Hidden from Shop"}
                  </Badge>
                  <Badge variant={product.is_visible_home ? "default" : "secondary"}>
                    {product.is_visible_home ? "Homepage" : "Hidden from Homepage"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleVisibility(product, "is_visible_shop", !product.is_visible_shop)}
                >
                  {product.is_visible_shop ? <><EyeOff className="w-4 h-4 mr-2" /> Hide Shop</> : <><Eye className="w-4 h-4 mr-2" /> Show Shop</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleVisibility(product, "is_visible_home", !product.is_visible_home)}
                >
                  {product.is_visible_home ? <><Home className="w-4 h-4 mr-2" /> Hide Home</> : <><Home className="w-4 h-4 mr-2" /> Show Home</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Refresh to fetch products from Printful</p>
          <Button onClick={loadProducts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      )}
    </div>
  );
};

export default ShopProductsManagement;
