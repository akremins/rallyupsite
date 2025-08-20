import type { Context } from "@netlify/functions";
import Stripe from "stripe";

// Initialize Stripe with your secret key.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export default async (req: Request, context: Context) => {
    // This endpoint should be a POST request from your frontend after a successful redirect.
    try {
        // Parse the request body to get the session ID.
        // For testing, you can uncomment the line below and use a hardcoded session ID.
        // In production, you must use the sessionId from the request body.
        const { sessionId } = await req.json();

        // 1. Retrieve the Stripe Checkout Session
        // We need to expand the customer and line_items to get all the necessary data.
        // We now also expand the subscription to get its ID.
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["customer", "line_items.data.price.product", "subscription"],
        });

        // The Fix: Check if session.customer is an object and not a string.
        // This is a "type guard" that ensures we can safely access customer properties later.
        if (!session.customer || typeof session.customer === 'string') {
            return new Response("Customer ID not found or invalid in session", { status: 400 });
        }

        // We can now safely access the customer ID.
        const customerId = session.customer.id;

        const price = session.line_items?.data[0]?.price;
        // The Fix: Check if the price exists and is an object with an 'id'.
        // This is a more robust check for your 'price' variable.
        if (!price || typeof price !== 'object' || !price.id) {
             return new Response("Price ID not found in session line items", { status: 400 });
        }
        
        // We can now safely access the price ID.
        const priceId = price.id;
        
        // The subscription ID is now available directly on the session object
        const subscription = session.subscription;

        // Check if the subscription exists and is a subscription object
        if (!subscription || typeof subscription === 'string') {
            return new Response("Subscription not found in session", { status: 400 });
        }

        // You can now use subscription.id to update the subscription
        console.log("Subscription ID from session:", subscription.id);
        
        // 2. Update the subscription with a trial end date.
        // This is the correct way to update an existing subscription.
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
            trial_end: Math.floor(new Date("2025-10-01T00:00:00Z").getTime() / 1000), // end trial on October 1, 2025
        });

        console.log("Subscription Updated:", updatedSubscription.id);

        // 3. Return a success response
        return new Response(JSON.stringify({
            message: "Subscription updated successfully with trial!",
            subscriptionId: updatedSubscription.id,
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Error updating Stripe subscription:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
