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
  paymentLink: 'https://buy.stripe.com/eVq4gA3qFdPY6ej2OR9sk00',
};

/**
 * Load teams data and populate the dropdown
 */
async function loadTeams() {
  try {
    const response = await fetch('/data/teams.json');
    const conferences = await response.json();

    const teamSelect = document.getElementById('team');

    // Populate dropdown with conference optgroups
    conferences.forEach(conf => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = conf.conference;

      conf.teams.forEach(team => {
        const option = document.createElement('option');
        option.value = `${team}|${conf.conference}`;
        option.textContent = team;
        optgroup.appendChild(option);
      });

      teamSelect.appendChild(optgroup);
    });
  } catch (error) {
    console.error('Error loading teams:', error);
  }
}

/**
 * Validate form and enable/disable checkout button
 */
function validateForm() {
  const emailInput = document.getElementById('email');
  const teamSelect = document.getElementById('team');
  const honorCheckbox = document.getElementById('honor-agreement');
  const checkoutButton = document.getElementById('checkout-button');

  const isEmailValid = emailInput.validity.valid && emailInput.value.trim();
  const isTeamSelected = teamSelect.value !== '';
  const isHonorChecked = honorCheckbox.checked;

  // Enable button only if email, team, and honor agreement are all valid
  checkoutButton.disabled = !(isEmailValid && isTeamSelected && isHonorChecked);
}

/**
 * Initialize premium form and payment link redirect
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load teams data
  await loadTeams();

  const premiumForm = document.getElementById('premium-form');
  const emailInput = document.getElementById('email');
  const teamSelect = document.getElementById('team');
  const honorCheckbox = document.getElementById('honor-agreement');

  if (!premiumForm) {
    console.warn(
      'Premium form not found. Premium.js loaded on non-premium page?'
    );
    return;
  }

  // Add validation listeners
  emailInput.addEventListener('input', validateForm);
  teamSelect.addEventListener('change', validateForm);
  honorCheckbox.addEventListener('change', validateForm);

  // Handle form submission
  premiumForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = emailInput.value;
    const teamData = teamSelect.value.split('|');
    const team = teamData[0];
    const conference = teamData[1];

    // Save email and team to localStorage for tracking
    // This helps us track all form submissions, even if payment isn't completed
    const submission = {
      email: email,
      team: team,
      conference: conference,
      timestamp: new Date().toISOString(),
    };

    // Get existing submissions or initialize empty array
    const submissions =
      JSON.parse(localStorage.getItem('premiumSubmissions')) || [];
    submissions.push(submission);
    localStorage.setItem('premiumSubmissions', JSON.stringify(submissions));

    // Build URL with email and team as query parameters
    const url = new URL(STRIPE_CONFIG.paymentLink);
    url.searchParams.append('prefilled_email', email);
    url.searchParams.append('client_reference_id', `${team}|${conference}`);

    // Redirect to Stripe Payment Link with user data
    window.location.href = url.toString();
  });

  console.log('Premium payment form initialized');
});
