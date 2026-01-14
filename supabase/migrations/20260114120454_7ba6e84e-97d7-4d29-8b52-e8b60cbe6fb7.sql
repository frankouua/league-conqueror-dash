-- Add unique constraint on procedures name for upsert operations
ALTER TABLE procedures ADD CONSTRAINT procedures_name_key UNIQUE (name);

-- Insert all procedures from the spreadsheet
INSERT INTO procedures (code, name, category, subcategory, price, duration_minutes, is_featured, is_active, imported_from)
VALUES
-- Sample of key procedures (full list will be inserted via edge function)
('Ind 101', 'Ind 101 - Abdominoplastia Hd', 'cirurgia', 'cirurgia', 20240, 120, true, true, 'spreadsheet'),
('Ind 103', 'Ind 103 - Remodelação Glútea Ultrassônica - Técnica Unique Bbl', 'cirurgia', 'cirurgia', 9800, 60, true, true, 'spreadsheet'),
('Ind 107', 'Ind 107 - Mastopexia Em L Com Prótese', 'cirurgia', 'cirurgia', 37400, 250, true, true, 'spreadsheet'),
('Com 101', 'Com 101 - Abdominoplastia Hd', 'cirurgia', 'cirurgia', 15000, 120, true, true, 'spreadsheet'),
('End 1.20', 'End 1.20 - Endolifiting - Full Face', 'harmonizacao', 'procedimento', 7700, 120, true, true, 'spreadsheet'),
('Pro 1.10', 'Pro 1.10 - Botox - Terço Superior', 'harmonizacao', 'procedimento', 1700, 60, false, true, 'spreadsheet'),
('Pro 1.118', 'Pro 1.118 - Morpheus Facial - Rosto Completo + Papada + Pescoço', 'harmonizacao', 'procedimento', 6380, 60, true, true, 'spreadsheet'),
('Pro 1.140', 'Pro 1.140 - Morpheus Corporal - Corporal 360º - Centro Cirúrgico', 'harmonizacao', 'procedimento', 16500, 60, true, true, 'spreadsheet'),
('Spa 1.42', 'Spa 1.42 - Spa Day Individual - Experiência Rainha (Para 1 Pessoa)', 'spa', 'procedimento', 1280, 320, false, true, 'spreadsheet'),
('Spa 1.49', 'Spa 1.49 - Spa Day Amigas Diamante (Para Até 4 Pessoas)', 'spa', 'procedimento', 1525, 240, false, true, 'spreadsheet'),
('Pos 1.10', 'Pos 1.10 - Drenagem Pós-Operatório (Método 3R)', 'pos-operatorio', 'procedimento', 170, 60, false, true, 'spreadsheet'),
('Soro 1.01', 'Soro 1.01 - Protocolo Anti-Inflamatório', 'soroterapia', 'procedimento', 446, 60, false, true, 'spreadsheet'),
('IH 1.0', 'Ih 1.0 - Implante Ocitocina 500Ui', 'soroterapia', 'procedimento', 1980, 60, false, true, 'spreadsheet'),
('IH 1.12', 'Ih 1.12 - Implante Oxandrolona 50Mg', 'soroterapia', 'procedimento', 1890, 20, false, true, 'spreadsheet'),
('IH 1.19', 'Ih 1.19 - Implante Testosterona 200Mg', 'soroterapia', 'procedimento', 1590, 60, false, true, 'spreadsheet'),
('AG 1.01', 'Ag 1.01 - Análise Genética - Unique Genetics', 'soroterapia', 'procedimento', 4900, 15, false, true, 'spreadsheet'),
('Pro 2.01', 'Pro 2.01 - Laser De Pico (Full Face)', 'harmonizacao', 'procedimento', 3000, 60, false, true, 'spreadsheet'),
('Pro 1.150', 'Pro 1.150 - Exossomos Facial', 'harmonizacao', 'procedimento', 2500, 60, false, true, 'spreadsheet')
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  duration_minutes = EXCLUDED.duration_minutes,
  imported_from = 'spreadsheet',
  updated_at = NOW();