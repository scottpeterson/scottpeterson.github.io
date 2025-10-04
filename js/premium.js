// premium.js - Stripe Checkout Integration for Premium Access
// This file handles the Stripe payment flow for premium subscriptions

/**
 * Stripe Configuration
 * NOTE: These are TEST keys for development. Replace with production keys before going live.
 *
 * To get your Stripe keys:
 * 1. Sign up at https://stripe.com
 * 2. Go to Developers > API keys
 * 3. Copy your publishable key (starts with pk_test_ or pk_live_)
 * 4. Create a product and price in Stripe Dashboard > Products
 * 5. Copy the price ID (starts with price_)
 */
const STRIPE_CONFIG = {
  // Stripe Payment Link - Replace with your actual payment link URL
  // Create one at: https://dashboard.stripe.com/test/payment-links
  paymentLink: 'https://buy.stripe.com/test_9B66oI1aS49aceUavV2ZO00',
};

/**
 * Initialize payment link redirect
 */
document.addEventListener('DOMContentLoaded', () => {
  // Get the checkout button
  const checkoutButton = document.getElementById('checkout-button');

  if (!checkoutButton) {
    console.warn(
      'Checkout button not found. Premium.js loaded on non-premium page?'
    );
    return;
  }

  // Add click handler to redirect to Stripe Payment Link
  checkoutButton.addEventListener('click', function () {
    // Redirect to Stripe Payment Link
    window.location.href = STRIPE_CONFIG.paymentLink;
  });

  console.log('Premium payment link initialized');
});
