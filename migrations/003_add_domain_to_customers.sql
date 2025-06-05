-- Add domain field to sales_pipeline_customers table
ALTER TABLE sales_pipeline_customers 
ADD COLUMN domain text;

-- Create index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_customers_domain 
ON sales_pipeline_customers (domain);

-- Function to extract domain from email
CREATE OR REPLACE FUNCTION extract_domain(email text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  domain_part text;
  personal_domains text[] := ARRAY[
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'icloud.com', 'aol.com', 'protonmail.com', 'tutanota.com'
  ];
BEGIN
  -- Return null if email is empty or invalid
  IF email IS NULL OR email = '' OR position('@' in email) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Extract domain part (everything after @)
  domain_part := lower(trim(split_part(email, '@', 2)));
  
  -- Return null for personal email domains
  IF domain_part = ANY(personal_domains) THEN
    RETURN NULL;
  END IF;
  
  -- Return the business domain
  RETURN domain_part;
END;
$$;

-- Populate domain field for existing customers
UPDATE sales_pipeline_customers 
SET domain = extract_domain(contact_email)
WHERE contact_email IS NOT NULL AND domain IS NULL;

-- Create trigger to auto-populate domain when contact_email is updated
CREATE OR REPLACE FUNCTION update_customer_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate domain when contact_email changes
  IF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN
    NEW.domain := extract_domain(NEW.contact_email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_customer_domain ON sales_pipeline_customers;
CREATE TRIGGER trigger_update_customer_domain
  BEFORE UPDATE ON sales_pipeline_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_domain();

-- Create trigger for inserts too
DROP TRIGGER IF EXISTS trigger_insert_customer_domain ON sales_pipeline_customers;
CREATE TRIGGER trigger_insert_customer_domain
  BEFORE INSERT ON sales_pipeline_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_domain(); 