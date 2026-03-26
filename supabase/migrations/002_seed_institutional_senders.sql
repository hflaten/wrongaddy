-- Seed data: Australian institutional senders
-- contact_method and undeliverable_email should be verified before going live

INSERT INTO institutional_senders (name, common_names, address_patterns, undeliverable_email, contact_method, notes, verified)
VALUES
  (
    'Commonwealth Bank of Australia',
    ARRAY['CBA', 'CommBank', 'Commonwealth Bank'],
    ARRAY['Commonwealth Bank', 'CBA', 'Darling Park', 'Sydney NSW 2000'],
    NULL,  -- verify: returns@cba.com.au or similar
    'letter',
    'Largest AU bank. Verify undeliverable mail contact before switching to email.',
    false
  ),
  (
    'ANZ Banking Group',
    ARRAY['ANZ', 'ANZ Bank', 'Australia and New Zealand Banking'],
    ARRAY['ANZ', 'Docklands', 'Melbourne VIC 3008'],
    NULL,
    'letter',
    'Verify undeliverable mail contact channel.',
    false
  ),
  (
    'Westpac Banking Corporation',
    ARRAY['Westpac', 'Westpac Bank', 'BankSA', 'St George Bank', 'Bank of Melbourne'],
    ARRAY['Westpac', 'Barangaroo', 'Sydney NSW 2000'],
    NULL,
    'letter',
    'Westpac group includes St George, BankSA, Bank of Melbourne.',
    false
  ),
  (
    'National Australia Bank',
    ARRAY['NAB', 'National Australia Bank'],
    ARRAY['NAB', 'National Australia Bank', 'Docklands', 'Melbourne VIC 3008'],
    NULL,
    'letter',
    'Verify undeliverable mail contact channel.',
    false
  ),
  (
    'Telstra Corporation',
    ARRAY['Telstra', 'Telstra Corp'],
    ARRAY['Telstra', 'Melbourne VIC 3000', 'GPO Box 9901'],
    NULL,
    'letter',
    'No known public undeliverable mail email.',
    false
  ),
  (
    'Optus',
    ARRAY['Optus', 'SingTel Optus', 'Optus Mobile'],
    ARRAY['Optus', 'North Ryde', 'NSW 2113'],
    NULL,
    'letter',
    'Verify channel.',
    false
  ),
  (
    'Australian Taxation Office',
    ARRAY['ATO', 'Australian Tax Office', 'Australian Taxation Office'],
    ARRAY['ATO', 'Australian Taxation Office', 'Alinga Street', 'Civic ACT 2600'],
    NULL,
    'letter',
    'Government agency — physical letter only.',
    false
  ),
  (
    'Services Australia',
    ARRAY['Centrelink', 'Services Australia', 'Medicare', 'Child Support'],
    ARRAY['Services Australia', 'Centrelink', 'Tuggeranong', 'ACT 2901'],
    NULL,
    'letter',
    'Government agency — physical letter only.',
    false
  ),
  (
    'Australia Post',
    ARRAY['AusPost', 'Australia Post', 'Australian Postal Corporation'],
    ARRAY['Australia Post', 'GPO Box 1777', 'Melbourne VIC 3001'],
    NULL,
    'letter',
    'Ironic — must be a letter.',
    false
  ),
  (
    'AGL Energy',
    ARRAY['AGL', 'AGL Energy', 'AGL Sales'],
    ARRAY['AGL', 'North Sydney', 'NSW 2060'],
    NULL,
    'letter',
    'Major AU energy retailer. Verify channel.',
    false
  ),
  (
    'Origin Energy',
    ARRAY['Origin', 'Origin Energy'],
    ARRAY['Origin Energy', 'GPO Box 1199', 'Melbourne VIC 3001'],
    NULL,
    'letter',
    'Major AU energy retailer.',
    false
  ),
  (
    'Energy Australia',
    ARRAY['EnergyAustralia', 'Energy Australia'],
    ARRAY['EnergyAustralia', 'Sydney NSW 2000'],
    NULL,
    'letter',
    'Major AU energy retailer.',
    false
  ),
  (
    'Bupa Australia',
    ARRAY['Bupa', 'Bupa Health', 'Bupa Australia'],
    ARRAY['Bupa', 'Melbourne VIC 3000'],
    NULL,
    'letter',
    'Private health insurer.',
    false
  ),
  (
    'Medibank Private',
    ARRAY['Medibank', 'Medibank Private'],
    ARRAY['Medibank', 'Docklands', 'Melbourne VIC 3008'],
    NULL,
    'letter',
    'Private health insurer.',
    false
  ),
  (
    'NRMA',
    ARRAY['NRMA', 'IAG', 'NRMA Insurance'],
    ARRAY['NRMA', 'NRMA Insurance', 'Sydney NSW 2000'],
    NULL,
    'letter',
    'Insurance — AU.',
    false
  );
