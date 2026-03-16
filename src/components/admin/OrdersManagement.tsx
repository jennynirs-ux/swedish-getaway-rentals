// IMP-004: TODO - Add search debouncing to order filters
// IMP-005: TODO - Add bulk actions for orders (filter and export)
// IMP-006: TODO - Add order fulfillment status tracking
// IMP-008: TODO - Add export functionality (CSV/PDF)
// IMP-010: TODO - Add order change audit log

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Package, User, Mail, Phone, MapPin, Search } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  currency: string;
  status: string;
  product_data: any;
  shipping_address: any;
  printful_order_id?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadOrders(0);
  }, []);

  // IMP-006: Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // IMP-006: Filter orders based on search
  useEffect(() => {
    let filtered = orders;
    if (debouncedSearch) {
      filtered = filtered.filter(order =>
        order.customer_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.id.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    setFilteredOrders(filtered);
  }, [orders, debouncedSearch]);

  const loadOrders = async (page: number) => {
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setOrders(data || []);
      setCurrentPage(page);
      // IMP-005: Store total count for pagination display
      if (count !== null) {
        setTotalCount(count);
      }
      // Disable load more if we got fewer items than requested (meaning no more data)
      setHasMore((data?.length ?? 0) >= ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Orders Management</h2>
          <p className="text-muted-foreground">View and manage all shop orders</p>
        </div>
        {/* IMP-006: Add search input for orders */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="border">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Order #{order.id.substring(0, 8)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(order.total_amount, order.currency)}
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Customer Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Name:</strong> {order.customer_name}</p>
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {order.customer_email}
                    </p>
                    {order.customer_phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shipping_address && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </h4>
                    <div className="text-sm">
                      <p>{order.shipping_address.name}</p>
                      <p>{order.shipping_address.address?.line1}</p>
                      {order.shipping_address.address?.line2 && (
                        <p>{order.shipping_address.address.line2}</p>
                      )}
                      <p>
                        {order.shipping_address.address?.postal_code} {order.shipping_address.address?.city}
                      </p>
                      <p>{order.shipping_address.address?.country}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Information */}
              {order.product_data && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Product Details
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {Array.isArray(order.product_data) ? (
                      order.product_data.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div>
                            <strong>{item.name}</strong>
                            {item.description && (
                              <span className="text-muted-foreground"> — {item.description}</span>
                            )}
                          </div>
                          <div className="text-right text-muted-foreground">x{item.quantity}</div>
                        </div>
                      ))
                    ) : (
                      <>
                        <p><strong>Product:</strong> {order.product_data.name || 'Product information not available'}</p>
                        {order.product_data.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {order.product_data.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Order References */}
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {order.printful_order_id && (
                  <div>
                    <strong>Printful Order ID:</strong>
                    <p className="font-mono text-xs bg-muted rounded px-2 py-1 mt-1">
                      {order.printful_order_id}
                    </p>
                  </div>
                )}
                {order.stripe_payment_intent_id && (
                  <div>
                    <strong>Stripe Payment ID:</strong>
                    <p className="font-mono text-xs bg-muted rounded px-2 py-1 mt-1">
                      {order.stripe_payment_intent_id}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-muted-foreground">
            {searchInput ? 'Try adjusting your search criteria' : 'Orders will appear here once customers start purchasing products'}
          </p>
        </div>
      )}

      {/* BUG-020: Pagination controls with IMP-005 total count display */}
      {orders.length > 0 && (
        <div className="flex justify-between items-center pt-4 gap-4">
          <Button
            variant="outline"
            onClick={() => loadOrders(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {/* IMP-005: Show items being displayed and total count */}
            Showing {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount} orders
          </span>
          <Button
            variant="outline"
            onClick={() => loadOrders(currentPage + 1)}
            disabled={!hasMore}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;