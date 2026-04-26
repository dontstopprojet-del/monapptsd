/*
  # Synchronisation Automatique Stock et Mouvements
  
  Cette migration ajoute un trigger qui synchronise automatiquement les quantités
  en stock lorsqu'un mouvement est créé ou supprimé.
  
  ## Fonctionnalités
  
  1. **Trigger sur INSERT de stock_movements**
     - Incrémente ou décrémente automatiquement la quantité en stock
     - Type 'in' : ajoute la quantité
     - Type 'out' : soustrait la quantité
  
  2. **Trigger sur DELETE de stock_movements**
     - Annule l'effet du mouvement supprimé
     - Restaure la quantité précédente en stock
  
  ## Sécurité
  
  - Validation que la quantité ne peut pas devenir négative
  - Vérifie l'existence de l'article avant modification
*/

-- Fonction pour synchroniser automatiquement le stock lors de l'ajout d'un mouvement
CREATE OR REPLACE FUNCTION sync_stock_on_movement_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que l'article existe
  IF NOT EXISTS (SELECT 1 FROM stock_items WHERE id = NEW.stock_item_id) THEN
    RAISE EXCEPTION 'Article de stock introuvable';
  END IF;

  -- Mettre à jour la quantité selon le type de mouvement
  IF NEW.movement_type = 'in' THEN
    -- Entrée : augmenter le stock
    UPDATE stock_items
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.stock_item_id;
  ELSIF NEW.movement_type = 'out' THEN
    -- Sortie : diminuer le stock
    -- Vérifier qu'il y a assez de stock
    IF (SELECT quantity FROM stock_items WHERE id = NEW.stock_item_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Quantité insuffisante en stock';
    END IF;
    
    UPDATE stock_items
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.stock_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour restaurer le stock lors de la suppression d'un mouvement
CREATE OR REPLACE FUNCTION sync_stock_on_movement_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler l'effet du mouvement supprimé
  IF OLD.movement_type = 'in' THEN
    -- Si c'était une entrée, on soustrait la quantité
    UPDATE stock_items
    SET quantity = quantity - OLD.quantity
    WHERE id = OLD.stock_item_id;
  ELSIF OLD.movement_type = 'out' THEN
    -- Si c'était une sortie, on rajoute la quantité
    UPDATE stock_items
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.stock_item_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_stock_on_movement_insert ON stock_movements;
DROP TRIGGER IF EXISTS trigger_sync_stock_on_movement_delete ON stock_movements;

-- Créer le trigger pour INSERT
CREATE TRIGGER trigger_sync_stock_on_movement_insert
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_stock_on_movement_insert();

-- Créer le trigger pour DELETE
CREATE TRIGGER trigger_sync_stock_on_movement_delete
  BEFORE DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_stock_on_movement_delete();