#!/usr/bin/env node

/**
 * Manual Account Trigger Script
 * 
 * This script manually triggers the account creation process
 * that normally happens via Stripe webhooks.
 * 
 * Usage: node manual-account-trigger.js
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mock maileroo service (replace with actual implementation if needed)
const mockMailerooService = {
  async sendGroupInvitationEmail(email, joinUrl, organizationName, amount, currency) {
    console.log(`📧 [MOCK EMAIL] Sending invitation to: ${email}`);
    console.log(`🔗 Join URL: ${joinUrl}`);
    console.log(`🏢 Organization: ${organizationName}`);
    console.log(`💰 Amount: ${amount/100} ${currency.toUpperCase()}`);
    console.log('✅ Email would be sent in production');
  }
};

async function triggerAccountCreation(userData) {
  const {
    invitationEmail,
    organizationName,
    paymentIntentId = `pi_test_${Date.now()}`,
    customerId = `cus_test_${Date.now()}`,
    amountTotal = 5000, // 50.00 EUR in cents
    currency = 'eur',
    organizationSettings = {},
    userTokens = 1000,
    organizationId = "5ec4123d-8743-4f1c-9767-33c7ad062eec"
  } = userData;

  console.log('🚀 Starting manual account creation process...');
  console.log('📋 User Data:', {
    invitationEmail,
    organizationName,
    paymentIntentId,
    customerId,
    amountTotal: `${amountTotal/100} ${currency.toUpperCase()}`,
    userTokens
  });

  try {
    /*
    // Generate a unique token for the invitation
    const token = crypto.randomUUID();
    console.log('🎫 Generated token:', token);

    // Create group invitation record
    const { data: invitationData, error: invitationError } = await supabaseAdmin
      .from("group_invitations")
      .insert({
        email: invitationEmail,
        organization_name: organizationName,
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: customerId,
        amount_paid: amountTotal,
        currency: currency,
        organization_settings: organizationSettings,
        user_tokens: userTokens,
        payment_status: 'completed',
        token: token,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_organization_id: organizationId
      })
      .select()
      .single();

    if (invitationError) {
      console.error("❌ Failed to create group invitation:", invitationError);
      throw new Error("Failed to create group invitation");
    }

    console.log("✅ Group invitation created successfully:", invitationData);
    
    // Send group invitation email with join button
    */
    const joinUrl = `https://www.transcriu.com/dashboard`;
    console.log("🔗 Generated join URL:", joinUrl);

    await mockMailerooService.sendGroupInvitationEmail(
      invitationEmail,
      joinUrl,
      organizationName,
      amountTotal,
      currency
    );
    
    console.log("✅ Group invitation email sent successfully to:", invitationEmail);
    console.log("🎉 Manual account creation completed successfully!");
    
    return {
      success: true,
      joinUrl
    };

  } catch (error) {
    console.error("❌ Account creation error:", error);
    throw error;
  }
}

// Example usage - modify these values for your testing
async function main() {
  const testUserData = {
    invitationEmail: "b7900035@xtec.cat",
    organizationName: "CREDA Narcís Masó",
    amountTotal: 18, // 50.00 EUR
    currency: "eur",
    userTokens: 80,
    organizationSettings: {},
    customerId: "cus_test_1234567890",
    paymentIntentId: "pi_test_1234567890",
    organizationSettings : {},
    organizationId: "5ec4123d-8743-4f1c-9767-33c7ad062eec"
  };

  try {
    const result = await triggerAccountCreation(testUserData);
    console.log('\n🎯 SUCCESS! Account creation triggered manually.');
    console.log('📧 Check the user\'s email for the invitation link.');
    console.log('🔗 Join URL:', result.joinUrl);
  } catch (error) {
    console.error('\n💥 FAILED! Account creation failed:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { triggerAccountCreation };