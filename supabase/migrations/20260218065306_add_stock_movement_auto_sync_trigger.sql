/*
  # Auto-sync stock movements with stock item quantities

  1. New Functions
    - `sync_stock_on_movement_insert` - Automatically updates stock_items.quantity when a movement is created
      - 'in' movements INCREASE the quantity
      - 'out' movements DECREASE the quantity (with validation to prevent negative stock)
    - `sync_stock_on_movement_delete` - Reverses quantity changes when a movement is deleted

  2. New Triggers
    - `trigger_stock_movement_insert` on stock_movements AFTER INSERT
    - `trigger_stock_movement_delete` on stock_movements AFTER DELETE

  3. Important Notes
    - Prevents negative stock by raising an exception on insufficient quantity
    - Uses SECURITY DEFINER to ensure trigger has permission to update stock_items
*/

CREATE OR REPLACE FUNCTION public.sync_stock_on_movement_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty integer;
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE stock_items
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.stock_item_id;
  ELSIF NEW.movement_type = 'out' THEN
    SELECT quantity INTO current_qty
    FROM stock_items
    WHERE id = NEW.stock_item_id;

    IF current_qty IS NULL THEN
      RAISE EXCEPTION 'Article de stock introuvable';
    END IF;

    IF current_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Quantite insuffisante en stock. Disponible: %, Demande: %', current_qty, NEW.quantity;
    END IF;

    UPDATE stock_items
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.stock_item_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stock_on_movement_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.movement_type = 'in' THEN
    UPDATE stock_items
    SET quantity = GREATEST(0, quantity - OLD.quantity),
        updated_at = now()
    WHERE id = OLD.stock_item_id;
  ELSIF OLD.movement_type = 'out' THEN
    UPDATE stock_items
    SET quantity = quantity + OLD.quantity,
        updated_at = now()
    WHERE id = OLD.stock_item_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stock_movement_insert ON stock_movements;
CREATE TRIGGER trigger_stock_movement_insert
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_stock_on_movement_insert();

DROP TRIGGER IF EXISTS trigger_stock_movement_delete ON stock_movements;
CREATE TRIGGER trigger_stock_movement_delete
  AFTER DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_stock_on_movement_delete();
