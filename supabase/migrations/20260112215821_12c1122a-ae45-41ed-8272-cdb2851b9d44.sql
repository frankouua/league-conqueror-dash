
-- Adicionar coluna para valor total da venda (valor cheio antes de descontos/parcelamentos)
ALTER TABLE public.revenue_records 
ADD COLUMN IF NOT EXISTS total_value numeric;

-- Comentário para documentar a diferença
COMMENT ON COLUMN public.revenue_records.amount IS 'Valor pago/recebido efetivamente';
COMMENT ON COLUMN public.revenue_records.total_value IS 'Valor total da venda (valor cheio antes de descontos)';
