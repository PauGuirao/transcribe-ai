-- Group Invitations Table
DROP TABLE IF EXISTS group_invitations CASCADE;
CREATE TABLE group_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  organization_settings JSONB DEFAULT '{}',
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount_paid INTEGER, -- in cents
  currency TEXT DEFAULT 'eur',
  payment_status TEXT DEFAULT 'completed',
  is_used BOOLEAN DEFAULT FALSE,
  created_organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own group invitations" ON group_invitations
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Indexes for performance
CREATE INDEX idx_group_invitations_token ON group_invitations(token);
CREATE INDEX idx_group_invitations_email ON group_invitations(email);
CREATE INDEX idx_group_invitations_expires_at ON group_invitations(expires_at);

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_group_invitation_token()
RETURNS VARCHAR(64) AS $$
BEGIN
  -- Use base64 encoding and make it URL-safe by replacing characters
  RETURN translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');
END;
$$ LANGUAGE plpgsql;

-- Function to create group invitation
CREATE OR REPLACE FUNCTION create_group_invitation(
  p_email TEXT,
  p_organization_name TEXT,
  p_organization_settings JSONB DEFAULT '{}',
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_amount_paid INTEGER DEFAULT NULL,
  p_currency TEXT DEFAULT 'eur'
)
RETURNS TABLE(token VARCHAR(64), id UUID) AS $$
DECLARE
  new_token VARCHAR(64);
  new_id UUID;
BEGIN
  new_token := generate_group_invitation_token();
  
  INSERT INTO group_invitations (
    token, 
    email, 
    organization_name,
    organization_settings,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_paid, 
    currency
  )
  VALUES (
    new_token, 
    p_email, 
    p_organization_name,
    p_organization_settings,
    p_stripe_payment_intent_id,
    p_stripe_customer_id,
    p_amount_paid, 
    p_currency
  )
  RETURNING group_invitations.id INTO new_id;

  RETURN QUERY SELECT new_token, new_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get group invitation by token
CREATE OR REPLACE FUNCTION get_group_invitation_by_token(token_param VARCHAR(64))
RETURNS TABLE(
  id UUID,
  token VARCHAR(64),
  email TEXT,
  organization_name TEXT,
  organization_settings JSONB,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount_paid INTEGER,
  currency TEXT,
  payment_status TEXT,
  is_used BOOLEAN,
  created_organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gi.id,
    gi.token,
    gi.email,
    gi.organization_name,
    gi.organization_settings,
    gi.stripe_payment_intent_id,
    gi.stripe_customer_id,
    gi.amount_paid,
    gi.currency,
    gi.payment_status,
    gi.is_used,
    gi.created_organization_id,
    gi.created_at,
    gi.expires_at,
    gi.used_at
  FROM group_invitations gi
  WHERE gi.token = token_param;
END;
$$ LANGUAGE plpgsql;

-- Function to mark group invitation as used
CREATE OR REPLACE FUNCTION mark_group_invitation_as_used(
  token_param TEXT,
  organization_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_exists BOOLEAN;
BEGIN
  -- Check if invitation exists and is valid
  SELECT EXISTS(
    SELECT 1 FROM group_invitations
    WHERE token = token_param
      AND NOT is_used
      AND expires_at > NOW()
  ) INTO invitation_exists;
  
  IF NOT invitation_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Mark invitation as used
  UPDATE group_invitations
  SET 
    is_used = TRUE,
    used_at = NOW(),
    created_organization_id = organization_id_param
  WHERE token = token_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;