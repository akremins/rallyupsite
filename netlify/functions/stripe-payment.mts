import type { Context } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export default async (req: Request, context: Context) => {
    const plans = {
        'starter': 'price_1RyC6KPufpxYYo1jz4NZiQNU',
        'pro': 'price_1RyC7TPufpxYYo1jY5pbjTfY'
    };

    const plan = new URL(req.url).searchParams.get("plan") ?? "starter";
    const priceId = plans[plan] || plans['starter'];

    const isLocal = process.env.NETLIFY_DEV === "true";
    const baseUrl = isLocal
        ? "http://localhost:8888"
        : process.env.URL;

    try {
         const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
        {
            // Use the Price ID created in your Stripe Dashboard for subscriptions
            price: priceId,
            quantity: 1,
        },
    ],
                automatic_tax: {
                enabled: false, //not working on development, set to false
            },
            // Collect the customer's billing address and tax ID for accurate calculation
            tax_id_collection: {
                enabled: true,
            },

        mode: "subscription",
        billing_address_collection: "required",
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/q4`,
    });

    return new Response(JSON.stringify({ url: session.url }));

    } catch (error) {
        console.error("Error creating Stripe session:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};
   
