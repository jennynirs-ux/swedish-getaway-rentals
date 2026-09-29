import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdmin, alertAdminOnce, sendEmail, SUPPORT_EMAIL } from "./alert.ts";
import { escapeHtml } from "./auth.ts";
import { pickVariant } from "./shop-variants.ts";

// A paid shop checkout (Stripe account STRIPE_SECRET_KEY_SHOP) becomes an
// order and a Printful order. Called by handle-shop-payment-success from both
// the shop Stripe webhook and the customer's /order-success page; the first
// to claim the session does the work.

export interface ShopResult {
  success: boolean;
  orderId: string | null;
  message?: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  variantId?: string | null;
}

interface OrderLine {
  product_id: string;
  title: string;
  variant_name: string | null;
  sync_variant_id: number | null;
  quantity: number;
  unit_price: number; // öre
}

export async function processShopSession(
  stripe: Stripe,
  supabase: SupabaseClient,
  sessionId: string,
  origin: { ip: string | null; userAgent: string },
): Promise<ShopResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { success: false, orderId: null, message: "Payment not completed" };
  }
  const type = session.metadata?.type;
  if (type !== "cart" && type !== "product") {
    return { success: false, orderId: null, message: "Not a shop checkout" };
  }

  // Claim first: the unique session_id makes this atomic across the webhook
  // and the success page
  const { data: claim, error: claimError } = await supabase
    .from("processed_sessions")
    .insert({ session_id: sessionId, session_type: `shop_${type}`, ip_address: origin.ip, user_agent: origin.userAgent })
    .select("id")
    .single();
  if (claimError) {
    if (claimError.code !== "23505") throw claimError;
    const { data: existing } = await supabase
      .from("processed_sessions")
      .select("created_record_id")
      .eq("session_id", sessionId)
      .single();
    return { success: true, orderId: existing?.created_record_id ?? null, message: "Already processed" };
  }

  try {
    const metadata = session.metadata ?? {};
    // items_0, items_1, ... (older sessions: one "items" value)
    const itemsJson = metadata.items ?? Object.keys(metadata).filter((k) => /^items_\d+$/.test(k))
      .sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((k) => metadata[k]).join("");
    const cart: CartItem[] = type === "cart"
      ? JSON.parse(itemsJson || "[]")
      : [{ productId: metadata.product_id, quantity: parseInt(metadata.quantity || "1"), variantId: metadata.printful_variant_id }];

    const lines: OrderLine[] = [];
    for (const item of cart) {
      const { data: product, error } = await supabase.from("shop_products").select("*").eq("id", item.productId).single();
      if (error) throw error;
      const variant = pickVariant(product, item.variantId);
      lines.push({
        product_id: product.id,
        title: product.title_override || product.title,
        variant_name: variant?.name ?? null,
        sync_variant_id: variant?.id ?? null,
        quantity: item.quantity,
        unit_price: variant ? Math.round(parseFloat(variant.retail_price || "0") * 100) : (product.price_override || product.custom_price || product.price || 0),
      });
    }

    // Stripe API 2025-03-31+ moved the address under collected_information
    const shipping = (session as any).collected_information?.shipping_details ?? (session as any).shipping_details ?? null;
    const address = shipping?.address ?? null;
    const email = session.customer_details?.email || session.customer_email || "";
    const name = shipping?.name || session.customer_details?.name || "";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: name,
        customer_email: email,
        customer_phone: session.customer_details?.phone || null,
        total_amount: session.amount_total ?? 0,
        currency: (session.currency || "sek").toUpperCase(),
        status: "paid",
        product_data: {
          items: lines,
          shipping_cost: parseInt(metadata.shipping_cost || "0"),
          discount: parseInt(metadata.discount_amount || "0"),
          coupon_code: metadata.coupon_code || null,
        },
        shipping_address: shipping,
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .select("id")
      .single();
    if (orderError) throw orderError;

    await supabase.from("processed_sessions").update({ created_record_id: order.id }).eq("id", claim.id);

    if (metadata.coupon_id) {
      const { error: couponError } = await supabase.rpc("record_coupon_use", {
        _coupon_id: metadata.coupon_id,
        _booking_id: null,
        _discount_amount: parseInt(metadata.discount_amount || "0"),
      });
      if (couponError) console.error("Failed to record coupon use:", couponError);
    }

    const printful = await submitToPrintful(order.id, lines, shipping, email, session.customer_details?.phone ?? null, metadata);
    await supabase
      .from("orders")
      .update({
        printful_order_id: printful.id,
        status: printful.confirmed ? "processing" : "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const total = `${((session.amount_total ?? 0) / 100).toLocaleString("sv-SE")} ${(session.currency || "sek").toUpperCase()}`;
    const itemList = lines.map((l) => `${l.quantity} × ${l.title}${l.variant_name ? ` (${l.variant_name.split(" / ").slice(1).join(" / ") || l.variant_name})` : ""}`);

    if (email) {
      await sendEmail(
        email,
        "Your Nordic Getaways order is confirmed",
        `<p>Hi ${escapeHtml(name || "there")},</p>
         <p>Thank you for your order! We've received your payment of ${total}.</p>
         <ul>${itemList.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
         <p>Your items are printed to order and usually ship within 2–7 business days. You'll get tracking details by e-mail when the parcel is on its way.</p>
         <p>Order reference: ${order.id.slice(0, 8).toUpperCase()}. Questions? Reply to this e-mail or write to ${SUPPORT_EMAIL}.</p>
         <p>Jenny &amp; Jon, Nordic Getaways</p>`,
      );
    }

    await alertAdmin(printful.confirmed ? "New shop order – sent to Printful" : "New shop order – needs your attention in Printful", [
      `Order ${order.id.slice(0, 8).toUpperCase()}: ${itemList.join(", ")}`,
      `Paid: ${total}. Ship to: ${name}, ${[address?.line1, address?.postal_code, address?.city, address?.country].filter(Boolean).join(", ")}`,
      printful.confirmed
        ? `Printful order ${printful.id} is confirmed and goes into production.`
        : `Printful: ${printful.problem}. ${printful.id ? `A draft (${printful.id}) is waiting in Printful – check and confirm it there.` : "Create it in Printful by hand, or refund in Stripe."}`,
    ]);

    return { success: true, orderId: order.id };
  } catch (error) {
    // Release the claim so a retry (webhook redelivery, page reload) can succeed
    await supabase.from("processed_sessions").delete().eq("id", claim.id);
    // The customer has paid (checked above), so a person must look
    await alertAdminOnce(supabase, `shop-failed:${sessionId}`, "Paid shop order could not be saved", [
      `Stripe session (shop account): ${sessionId}`,
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      "Fix the cause, or create the order in Printful by hand / refund in Stripe.",
    ]).catch((alertError) => console.error("[SHOP] Alert failed:", alertError));
    throw error;
  }
}

// Confirmed orders go straight into production; anything incomplete is left as
// a draft (or not created) and support is told what's missing.
async function submitToPrintful(
  orderId: string,
  lines: OrderLine[],
  shipping: any,
  email: string,
  phone: string | null,
  metadata: Record<string, string>,
): Promise<{ id: string | null; confirmed: boolean; problem?: string }> {
  const token = Deno.env.get("PRINTFUL_API_TOKEN");
  if (!token) return { id: null, confirmed: false, problem: "PRINTFUL_API_TOKEN is not set" };

  const address = shipping?.address;
  const unmapped = lines.filter((l) => !l.sync_variant_id);
  if (unmapped.length === lines.length || !address?.line1 || !address?.country) {
    return { id: null, confirmed: false, problem: !address?.line1 ? "no shipping address" : "no Printful variant for the items" };
  }
  const ready = unmapped.length === 0;

  const body = {
    // Printful allows 32 characters: the order UUID without dashes
    external_id: orderId.replace(/-/g, ""),
    recipient: {
      name: shipping.name || "",
      email,
      phone: phone || undefined,
      address1: address.line1,
      address2: address.line2 || undefined,
      city: address.city || "",
      state_code: address.state || undefined,
      country_code: address.country,
      zip: address.postal_code || "",
    },
    items: lines
      .filter((l) => l.sync_variant_id)
      .map((l) => ({ sync_variant_id: l.sync_variant_id, quantity: l.quantity, retail_price: (l.unit_price / 100).toFixed(2) })),
    retail_costs: {
      currency: "SEK",
      shipping: (parseInt(metadata.shipping_cost || "0") / 100).toFixed(2),
      discount: (parseInt(metadata.discount_amount || "0") / 100).toFixed(2),
    },
  };

  const response = await fetch(`https://api.printful.com/orders${ready ? "?confirm=true" : ""}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const problem = `Printful refused the order (${response.status}): ${result?.error?.message ?? result?.result ?? "unknown error"}`;
    console.error(problem);
    return { id: null, confirmed: false, problem };
  }
  const id = result?.result?.id?.toString() ?? null;
  return ready
    ? { id, confirmed: true }
    : { id, confirmed: false, problem: `${unmapped.length} item(s) have no Printful variant` };
}
