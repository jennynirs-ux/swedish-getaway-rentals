import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

export type CartItem = {
  productId: string;
  title: string;
  price: number; // in cents
  currency: string; // e.g. 'SEK'
  quantity: number;
  image?: string;
  variantId?: string | null;
  variantName?: string | null;
};

type CartContextType = {
  items: CartItem[];
  total: number; // in cents
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("ng_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("ng_cart", JSON.stringify(items));
  }, [items]);

  const addItem: CartContextType["addItem"] = (item) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          (i.variantId || null) === (item.variantId || null)
      );

      let updated: CartItem[];

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + item.quantity,
        };
        updated = next;
      } else {
        updated = [...prev, item];
      }

      toast({
        title: "Added to cart",
        description: `${item.title} x${item.quantity}`,
      });

      return updated;
    });
  };

  const updateQuantity: CartContextType["updateQuantity"] = (
    productId,
    variantId,
    quantity
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && (i.variantId || null) === (variantId || null)
          ? { ...i, quantity: Math.max(1, quantity) }
          : i
      )
    );
  };

  const removeItem: CartContextType["removeItem"] = (productId, variantId) => {
    setItems((prev) => {
      const item = prev.find(
        (i) =>
          i.productId === productId && (i.variantId || null) === (variantId || null)
      );

      const updated = prev.filter(
        (i) =>
          !(i.productId === productId && (i.variantId || null) === (variantId || null))
      );

      if (item) {
        toast({
          title: "Removed from cart",
          description: item.title,
        });
      }

      return updated;
    });
  };

  const clear = () => {
    setItems([]);
    toast({ title: "Cart cleared" });
  };

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value: CartContextType = {
    items,
    total,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
