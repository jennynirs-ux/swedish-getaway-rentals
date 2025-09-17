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
  printful_data?: any;
  created_at: string;
}

interface ShopProductsManagementProps {
  editingProductId?: string | null;
  onClearEditingProduct?: () => void;
}

const ShopProductsManagement = ({
  editingProductId,
  onClearEditingProduct,
}: ShopProductsManagementProps) => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
    if (editingProductId) {
      const product = products.find((p) => p.id === editingProductId);
      if (product) {
        handleEdit(product);
        onClearEditingProduct?.();
      }
    }
  }, [editingProductId, products]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!Array.isArray(data)) {
        console.warn("⚠️ shop_products is not an array:", data);
        setProducts([]);
      } else {
        setProducts(data);
      }
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

  const syncWithPrintful = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-printful-products"
      );

      if (error) throw error;

      console.log("👉 Printful sync response:", data);

      toast({
        title: "Success",
        description: "Products synced with Printful",
      });

      await loadProducts();
    } catch (error) {
      console.error("Error syncing with Printful:", error);
      toast({
        title: "Error",
        description: "Failed to sync with Printful",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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
        is_visible_shop: editForm.is_visible_shop,
        is_visible_home: editForm.is_visible_home,
      };

      updateData.title_override = editForm.title_override.trim() || null;
      updateData.description_override =
        editForm.description_override.trim() || null;
      updateData.price_override = editForm.price_override.trim()
        ? parseInt(editForm.price_override)
        : null;
      updateData.main_image_override =
        editForm.main_image_override.trim() || null;
      updateData.sort_order = editForm.sort_order.trim()
        ? parseInt(editForm.sort_order)
        : null;

      const { error } = await supabase
        .from("shop_products")
        .update(updateData)
        .eq("id", editingProduct.id);

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
    productId: string,
    field: "is_visible_shop" | "is_visible_home",
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("shop_products")
        .update({ [field]: value })
        .eq("id", productId);

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

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description =
      product.description_override ||
      product.custom_description ||
      product.description;
    const price =
      product.price_override || product.custom_price || product.price;
    const imageUrl = product.main_image_override || product.image_url;

    return { title, description, price, imageUrl };
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
          <p className="text-muted-foreground">
            Manage your Printful products and visibility settings
          </p>
        </div>
        <Button onClick={syncWithPrintful} disabled={syncing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
          />
          Sync with Printful
        </Button>
      </div>

      {editingProduct && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Product: {getDisplayData(editingProduct).title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title Override (optional)</Label>
                <Input
                  value={editForm.title_override}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      title_override: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Price Override (optional, in cents)</Label>
                <Input
                  type="number"
                  value={editForm.price_override}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      price_override: e.target.value,
                    }))
                  }
                  placeholder="e.g. 2500 for 25.00 SEK"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description Override (optional)</Label>
              <Textarea
                value={editForm.description_override}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description_override: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Main Image Override (optional)</Label>
              <Input
                value={editForm.main_image_override}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    main_image_override: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order (optional)</Label>
              <Input
                type="number"
                value={editForm.sort_order}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    sort_order: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.is_visible_shop}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({ ...prev, is_visible_shop: checked }))
                  }
                />
                <Label>Visible in shop</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.is_visible_home}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({ ...prev, is_visible_home: checked }))
                  }
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
        {products.map((product) => {
          const { title, description, price, imageUrl } = getDisplayData(product);

          return (
            <Card key={product.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={title}
                    className="w-20 h-20 object-cover rounded-lg"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{title}</h3>
                      {product.sort_order && (
                        <Badge variant="outline">Order: {product.sort_order}</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {description?.substring(0, 100)}...
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-primary">
                        {formatPrice(price, product.currency)}
                      </span>
                      {product.price_override && (
                        <Badge variant="secondary">Custom Price</Badge>
                      )}
                      {product.title_override && (
                        <Badge variant="outline">Custom Title</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={product.is_visible_shop ? "default" : "secondary"}
                      >
                        {product.is_visible_shop ? "Shop" : "Hidden from Shop"}
                      </Badge>
                      <Badge
                        variant={product.is_visible_home ? "default" : "secondary"}
                      >
                        {product.is_visible_home
                          ? "Homepage"
                          : "Hidden from Homepage"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleVisibility(
                          product.id,
                          "is_visible_shop",
                          !product.is_visible_shop
                        )
                      }
                    >
                      {product.is_visible_shop ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Shop
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Shop
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        toggleVisibility(
                          product.id,
                          "is_visible_home",
                          !product.is_visible_home
                        )
                      }
                    >
                      {product.is_visible_home ? (
                        <>
                          <Home className="h-4 w-4 mr-2" />
                          Hide Home
                        </>
                      ) : (
                        <>
                          <Home className="h-4 w-4 mr-2" />
                          Show Home
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            Click "Sync with Printful" to import your products
          </p>
          <Button onClick={syncWithPrintful} disabled={syncing}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            Sync with Printful
          </Button>
        </div>
      )}
    </div>
  );
};

export default ShopProductsManagement;
