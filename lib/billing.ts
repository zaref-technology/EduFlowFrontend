// Paying for EduFlow online: Plan & billing data and Razorpay Checkout.
import { api } from "@/lib/api";
import type { Access, PlatformPlan } from "@/lib/platform";

export type Cycle = "monthly" | "yearly";
/** A plan on offer; `trial` marks the plan new schools try for free. */
export type OfferedPlan = Omit<PlatformPlan, "schools" | "isDefault" | "archived"> & { trial?: boolean };

/** After signing up from a plan's "Get …" button, open Plan & billing (kept in this tab only). */
export const AFTER_SIGNUP_KEY = "eduflow.after-signup";

export interface BillingPayment {
  id: string;
  planName: string;
  amount: number;
  method: string;
  reference: string;
  cycle: Cycle;
  periods: number;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
}

export interface BillingOverview {
  subscription: Access;
  plans: OfferedPlan[];
  onlinePayments: boolean;
  payments: BillingPayment[];
}

interface CheckoutOrder {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  cycle: Cycle;
  school: string;
  prefill: { name: string; email: string; contact: string };
}

/** What a year costs against 12 monthly payments: the saving, in rupees and as a percentage. */
export function yearlySaving(p: Pick<PlatformPlan, "priceMonthly" | "priceYearly">) {
  const full = p.priceMonthly * 12;
  if (!p.priceMonthly || !p.priceYearly || p.priceYearly >= full) return null;
  return { amount: full - p.priceYearly, percent: Math.round(((full - p.priceYearly) / full) * 100) };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let script: Promise<void> | null = null;
/** Loads Razorpay Checkout once. */
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      script = null;
      reject(new Error("Couldn't load Razorpay. Check your internet connection and try again."));
    };
    document.body.appendChild(s);
  });
  return script;
}

/**
 * Pays for a plan: creates the order, opens Razorpay Checkout and confirms the payment.
 * Resolves with the updated billing (or null if the payer closed the window).
 */
export async function payForPlan(planId: string, cycle: Cycle): Promise<BillingOverview | null> {
  const [order] = await Promise.all([api<CheckoutOrder>("/api/billing/checkout", { method: "POST", body: { planId, cycle } }), loadCheckout()]);
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "EduFlow",
      description: `${order.planName} plan · ${order.cycle === "yearly" ? "1 year" : "1 month"}`,
      image: `${window.location.origin}/icons/icon-192.png`,
      prefill: order.prefill,
      notes: { school: order.school },
      theme: { color: "#2b3a8c" },
      handler: (r: RazorpayResponse) => {
        api<BillingOverview>("/api/billing/confirm", { method: "POST", body: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }).then(resolve, reject);
      },
      modal: { ondismiss: () => resolve(null) },
    });
    // A failed attempt keeps Razorpay open (it shows why) so the payer can try another way
    rzp.on("payment.failed", () => {});
    rzp.open();
  });
}
