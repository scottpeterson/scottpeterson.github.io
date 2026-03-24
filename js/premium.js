// premium.js - Stripe Checkout Integration for Premium Access
// Supports both single-form (legacy) and multi-form (multi-product) layouts.
//
// Single-form mode: Uses element IDs (id="premium-form", id="email", etc.)
//   and the global STRIPE_CONFIG.paymentLink.
//
// Multi-form mode: Finds all forms with class "premium-form" and reads each
//   form's Stripe Payment Link from its data-stripe-link attribute. Form fields
//   are found via class selectors (.product-email, .product-honor, .product-checkout-button)
//   scoped within each form. Adding a new product requires zero JS changes.

/**
 * Stripe Configuration (used only for single-form legacy mode)
 */
const STRIPE_CONFIG = {
  paymentLink: 'https://buy.stripe.com/8x2bJ24uJ13cgSX89b9sk01',
};

/**
 * Initialize a single premium form with validation and Stripe redirect.
 * Works for both legacy (ID-based) and multi-product (class-based) forms.
 */
function initPremiumForm(
  form,
  stripeLink,
  emailInput,
  honorCheckbox,
  checkoutButton
) {
  function validateForm() {
    const isEmailValid = emailInput.validity.valid && emailInput.value.trim();
    const isHonorChecked = honorCheckbox.checked;
    checkoutButton.disabled = !(isEmailValid && isHonorChecked);
  }

  emailInput.addEventListener('input', validateForm);
  honorCheckbox.addEventListener('change', validateForm);

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const url = new URL(stripeLink);
    url.searchParams.append('prefilled_email', emailInput.value);

    // Redirect to Stripe Payment Link with user email
    // Team will be collected via Stripe's custom field
    window.location.href = url.toString();
  });
}

/**
 * Initialize all premium forms on the page
 */
document.addEventListener('DOMContentLoaded', () => {
  // Try multi-form mode first: find forms with data-stripe-link attributes
  const multiForms = document.querySelectorAll(
    'form.premium-form[data-stripe-link]'
  );

  if (multiForms.length > 0) {
    multiForms.forEach(form => {
      const stripeLink = form.dataset.stripeLink;
      const emailInput = form.querySelector('.product-email');
      const honorCheckbox = form.querySelector('.product-honor');
      const checkoutButton = form.querySelector('.product-checkout-button');

      if (!emailInput || !honorCheckbox || !checkoutButton) {
        return;
      }

      initPremiumForm(
        form,
        stripeLink,
        emailInput,
        honorCheckbox,
        checkoutButton
      );
    });
    console.log(
      `Premium payment forms initialized (${multiForms.length} products)`
    );
  } else {
    // Fallback: single-form legacy mode (ID-based)
    const premiumForm = document.getElementById('premium-form');
    const emailInput = document.getElementById('email');
    const honorCheckbox = document.getElementById('honor-agreement');
    const checkoutButton = document.getElementById('checkout-button');

    if (premiumForm) {
      initPremiumForm(
        premiumForm,
        STRIPE_CONFIG.paymentLink,
        emailInput,
        honorCheckbox,
        checkoutButton
      );
      console.log('Premium payment form initialized');
    }
  }

  // Always initialize countdowns (works in both modes)
  initCountdowns();
});

/**
 * Calculate and display day countdowns for product sections.
 * Finds elements with data-countdown-date attribute and fills in the days remaining.
 */
function initCountdowns() {
  const countdowns = document.querySelectorAll(
    '.product-countdown[data-countdown-date]'
  );

  countdowns.forEach(el => {
    const targetDate = new Date(el.dataset.countdownDate + 'T00:00:00');
    const now = new Date();
    const diffMs = targetDate - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const daysEl = el.querySelector('.countdown-days');
    if (!daysEl) {
      return;
    }

    if (daysRemaining > 0) {
      daysEl.textContent = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    } else {
      // Target date has passed — hide the countdown
      el.style.display = 'none';
    }
  });
}
