#!/usr/bin/env node

/**
 * Stripe Customer Sync Script
 *
 * This script fetches paying customers from Stripe and maps them to their selected teams.
 *
 * Prerequisites:
 * 1. Install Stripe SDK: npm install stripe
 * 2. Set STRIPE_SECRET_KEY environment variable with your Stripe secret key
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/sync-stripe-customers.js
 *
 * Output:
 *   Creates data/stripe-customers.json with email-to-team mappings
 */

const fs = require('fs');
const path = require('path');

// Check for Stripe secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('\nUsage:');
  console.error(
    '  STRIPE_SECRET_KEY=sk_test_xxx node scripts/sync-stripe-customers.js'
  );
  process.exit(1);
}

// Initialize Stripe
let stripe;
try {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
} catch (error) {
  console.error('Error: Stripe package not found. Install it with:');
  console.error('  npm install stripe');
  process.exit(1);
}

/**
 * Fetch all paying customers from Stripe
 */
async function fetchPayingCustomers() {
  console.log('Fetching paying customers from Stripe...');

  const customers = [];

  // Fetch all payment intents that succeeded
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = {
      limit: 100,
    };

    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const paymentIntents = await stripe.paymentIntents.list(params);

    for (const pi of paymentIntents.data) {
      // Only include successful payments
      if (pi.status === 'succeeded') {
        const customer = {
          email: pi.receipt_email || pi.customer_email,
          amount: pi.amount / 100, // Convert from cents
          currency: pi.currency,
          paymentDate: new Date(pi.created * 1000).toISOString(),
          clientReferenceId: pi.metadata.client_reference_id,
        };

        // Parse team and conference from client_reference_id
        if (customer.clientReferenceId) {
          const parts = customer.clientReferenceId.split('|');
          customer.team = parts[0] || null;
          customer.conference = parts[1] || null;
        }

        customers.push(customer);
      }
    }

    hasMore = paymentIntents.has_more;
    if (hasMore && paymentIntents.data.length > 0) {
      startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
    }
  }

  console.log(`Found ${customers.length} successful payments`);
  return customers;
}

/**
 * Create email-to-team mapping
 */
function createMapping(customers) {
  const mapping = {};

  customers.forEach(customer => {
    if (customer.email && customer.team) {
      // If email already exists, keep the most recent payment
      if (
        !mapping[customer.email] ||
        new Date(customer.paymentDate) >
          new Date(mapping[customer.email].paymentDate)
      ) {
        mapping[customer.email] = {
          team: customer.team,
          conference: customer.conference,
          paymentDate: customer.paymentDate,
          amount: customer.amount,
          currency: customer.currency,
        };
      }
    }
  });

  return mapping;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Fetch paying customers from Stripe
    const customers = await fetchPayingCustomers();

    // Create email-to-team mapping
    const mapping = createMapping(customers);

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write mapping to file
    const outputPath = path.join(dataDir, 'stripe-customers.json');
    const output = {
      lastUpdated: new Date().toISOString(),
      totalCustomers: Object.keys(mapping).length,
      customers: mapping,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\nSuccess! Customer mapping saved to: ${outputPath}`);
    console.log(`Total paying customers: ${Object.keys(mapping).length}`);

    // Print sample of the mapping
    console.log('\nSample mapping:');
    const sampleEmails = Object.keys(mapping).slice(0, 3);
    sampleEmails.forEach(email => {
      console.log(
        `  ${email} -> ${mapping[email].team} (${mapping[email].conference})`
      );
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
