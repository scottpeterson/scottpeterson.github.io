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
  paymentLink: 'https://buy.stripe.com/8x2bJ24uJ13cgSX89b9sk01',
};

/**
 * Validate form and enable/disable checkout button
 */
function validateForm() {
  const emailInput = document.getElementById('email');
  const honorCheckbox = document.getElementById('honor-agreement');
  const checkoutButton = document.getElementById('checkout-button');

  const isEmailValid = emailInput.validity.valid && emailInput.value.trim();
  const isHonorChecked = honorCheckbox.checked;

  // Enable button only if email and honor agreement are both valid
  checkoutButton.disabled = !(isEmailValid && isHonorChecked);
}

/**
 * Initialize premium form and payment link redirect
 */
document.addEventListener('DOMContentLoaded', async () => {
  const premiumForm = document.getElementById('premium-form');
  const emailInput = document.getElementById('email');
  const honorCheckbox = document.getElementById('honor-agreement');

  if (!premiumForm) {
    console.warn(
      'Premium form not found. Premium.js loaded on non-premium page?'
    );
    return;
  }

  // Add validation listeners
  emailInput.addEventListener('input', validateForm);
  honorCheckbox.addEventListener('change', validateForm);

  // Handle form submission
  premiumForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = emailInput.value;

    // Build URL with prefilled email
    const url = new URL(STRIPE_CONFIG.paymentLink);
    url.searchParams.append('prefilled_email', email);

    // Redirect to Stripe Payment Link with user email
    // Team will be collected via Stripe's custom field
    window.location.href = url.toString();
  });

  console.log('Premium payment form initialized');
});
