
-- Remover constraint antiga e adicionar nova com tipo coordinator
ALTER TABLE crm_pipelines DROP CONSTRAINT crm_pipelines_pipeline_type_check;

ALTER TABLE crm_pipelines ADD CONSTRAINT crm_pipelines_pipeline_type_check 
CHECK (pipeline_type = ANY (ARRAY['sdr'::text, 'closer'::text, 'cs'::text, 'farmer'::text, 'influencer'::text, 'custom'::text, 'social_selling'::text, 'rfv_matrix'::text, 'feegow'::text, 'coordinator'::text]));
