
-- Drop and recreate the constraint to add 'recovery' type
ALTER TABLE crm_pipelines DROP CONSTRAINT IF EXISTS crm_pipelines_pipeline_type_check;

ALTER TABLE crm_pipelines ADD CONSTRAINT crm_pipelines_pipeline_type_check 
CHECK (pipeline_type IN ('sdr', 'closer', 'cs', 'farmer', 'influencer', 'custom', 'social_selling', 'rfv_matrix', 'feegow', 'coordinator', 'recovery'));
