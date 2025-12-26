-- Add show_qr column to live_state table
ALTER TABLE live_state ADD COLUMN IF NOT EXISTS show_qr BOOLEAN DEFAULT true;
