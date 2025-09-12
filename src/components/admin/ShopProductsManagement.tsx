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
  visible: boolean;
  printful_data: any;
  created_at: string;
}

const ShopProductsManagement = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [editForm, setEditForm] = useState({
    custom_description: '',
    custom_price: '',
    visible: true,
    show_on_homepage: false
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
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
      const { error } = await supabase.functions.invoke('fetch-printful-products');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Products synced with Printful",
      });
      
      await loadProducts();
    } catch (error) {
      console.error('Error syncing with Printful:', error);
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
      custom_description: product.custom_description || '',
      custom_price: product.custom_price?.toString() || '',
      visible: product.visible,
      show_on_homepage: false // This would need to be fetched from a separate field
    });
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      const updateData: any = {
        visible: editForm.visible,
      };

      if (editForm.custom_description.trim()) {
        updateData.custom_description = editForm.custom_description.trim();
      }

      if (editForm.custom_price.trim()) {
        updateData.custom_price = parseInt(editForm.custom_price);
      }

      const { error } = await supabase
        .from('shop_products')
        .update(updateData)
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (productId: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from('shop_products')
        .update({ visible })
        .eq('id', productId);

      if (error) throw error;

      await loadProducts();
      toast({
        title: "Success",
        description: `Product ${visible ? 'shown' : 'hidden'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update product visibility",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
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
          <p className="text-muted-foreground">Manage your Printful products and visibility settings</p>
        </div>
        <Button onClick={syncWithPrintful} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sync with Printful
        </Button>
      </div>

      {editingProduct && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Product: {editingProduct.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Description (optional)</Label>
              <Textarea
                value={editForm.custom_description}
                onChange={(e) => setEditForm(prev => ({ ...prev, custom_description: e.target.value }))}
                placeholder="Override the default description..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Custom Price (optional, in cents)</Label>
              <Input
                type="number"
                value={editForm.custom_price}
                onChange={(e) => setEditForm(prev => ({ ...prev, custom_price: e.target.value }))}
                placeholder="e.g. 2500 for 25.00 SEK"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editForm.visible}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, visible: checked }))}
              />
              <Label>Visible in shop</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {products.map((product) => {
          const finalPrice = product.custom_price || product.price;
          const finalDescription = product.custom_description || product.description;
          
          return (
            <Card key={product.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={product.image_url || '/placeholder.svg'}
                    alt={product.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {finalDescription?.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-primary">
                        {formatPrice(finalPrice, product.currency)}
                      </span>
                      {product.custom_price && (
                        <Badge variant="secondary">Custom Price</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={product.visible ? "default" : "secondary"}>
                        {product.visible ? "Visible" : "Hidden"}
                      </Badge>
                      {product.custom_description && (
                        <Badge variant="outline">Custom Description</Badge>
                      )}
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
                      onClick={() => toggleVisibility(product.id, !product.visible)}
                    >
                      {product.visible ? (
                        <><EyeOff className="h-4 w-4 mr-2" />Hide</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-2" />Show</>
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
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync with Printful
          </Button>
        </div>
      )}
    </div>
  );
};

export default ShopProductsManagement;