-- Migration: adicionar campo client_phone à tabela tickets
ALTER TABLE tickets ADD COLUMN client_phone TEXT;
