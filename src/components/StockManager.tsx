import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale, safeDate } from '../utils/safeFormat';

interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  unit_price: number;
  supplier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  stock_item_id: string;
  movement_type: 'in' | 'out';
  quantity: number;
  reference?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  stock_item_name?: string;
  created_by_name?: string;
}

interface StockManagerProps {
  userRole: string;
  userId: string;
  darkMode?: boolean;
}

const StockManager: React.FC<StockManagerProps> = ({ userRole, userId, darkMode = false }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'stock' | 'movements'>('stock');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    category: 'materiel',
    quantity: '',
    min_quantity: '',
    unit: 'piece',
    unit_price: '',
    supplier: '',
    notes: '',
  });
  const [movementFormData, setMovementFormData] = useState({
    stock_item_id: '',
    movement_type: 'in' as 'in' | 'out',
    quantity: '',
    reference: '',
    notes: '',
  });

  const colors = {
    primary: darkMode ? '#3b82f6' : '#2563eb',
    background: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  useEffect(() => {
    loadStockItems();
    loadMovements();

    const stockChannel = supabase
      .channel('stock_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => {
        loadStockItems();
      })
      .subscribe();

    const movementsChannel = supabase
      .channel('movements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => {
        loadMovements();
        loadStockItems();
      })
      .subscribe();

    return () => {
      stockChannel.unsubscribe();
      movementsChannel.unsubscribe();
    };
  }, [filterCategory]);

  const loadStockItems = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('stock_items')
        .select('*')
        .order('name', { ascending: true });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Error loading stock items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          stock_item:stock_items(name),
          creator:app_users!stock_movements_created_by_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map((mov: any) => ({
        ...mov,
        stock_item_name: mov.stock_item?.name,
        created_by_name: mov.creator?.name,
      }));

      setMovements(formatted);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemFormData.name || !itemFormData.quantity || !itemFormData.min_quantity) {
      alert('Tous les champs obligatoires doivent être remplis');
      return;
    }

    try {
      setLoading(true);

      const itemData = {
        name: itemFormData.name,
        category: itemFormData.category,
        quantity: parseInt(itemFormData.quantity),
        min_quantity: parseInt(itemFormData.min_quantity),
        unit: itemFormData.unit,
        unit_price: parseFloat(itemFormData.unit_price) || 0,
        supplier: itemFormData.supplier,
        notes: itemFormData.notes,
      };

      if (editingItemId) {
        const { error } = await supabase
          .from('stock_items')
          .update(itemData)
          .eq('id', editingItemId);

        if (error) throw error;
        alert('Article modifié avec succès');
      } else {
        const { error } = await supabase.from('stock_items').insert(itemData);

        if (error) throw error;
        alert('Article ajouté avec succès');
      }

      setShowItemForm(false);
      setEditingItemId(null);
      setItemFormData({
        name: '',
        category: 'materiel',
        quantity: '',
        min_quantity: '',
        unit: 'piece',
        unit_price: '',
        supplier: '',
        notes: '',
      });
      loadStockItems();
    } catch (error: any) {
      console.error('Error saving stock item:', error);
      alert('Erreur lors de l\'enregistrement de l\'article');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: StockItem) => {
    setEditingItemId(item.id);
    setItemFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      unit: item.unit,
      unit_price: item.unit_price.toString(),
      supplier: item.supplier || '',
      notes: item.notes || '',
    });
    setShowItemForm(true);
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${itemName}" ?\n\nCette action supprimera également tous les mouvements associés.`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      alert('Article supprimé avec succès');
      loadStockItems();
      loadMovements();
    } catch (error: any) {
      console.error('Error deleting stock item:', error);
      alert('Erreur lors de la suppression de l\'article');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowItemForm(false);
    setEditingItemId(null);
    setItemFormData({
      name: '',
      category: 'materiel',
      quantity: '',
      min_quantity: '',
      unit: 'piece',
      unit_price: '',
      supplier: '',
      notes: '',
    });
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!movementFormData.stock_item_id || !movementFormData.quantity) {
      alert('Tous les champs obligatoires doivent être remplis');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('stock_movements').insert({
        stock_item_id: movementFormData.stock_item_id,
        movement_type: movementFormData.movement_type,
        quantity: parseInt(movementFormData.quantity),
        reference: movementFormData.reference,
        notes: movementFormData.notes,
        created_by: userId,
      });

      if (error) throw error;

      alert('Mouvement enregistré avec succès');
      setShowMovementForm(false);
      setMovementFormData({
        stock_item_id: '',
        movement_type: 'in',
        quantity: '',
        reference: '',
        notes: '',
      });
      loadStockItems();
      loadMovements();
    } catch (error: any) {
      console.error('Error creating movement:', error);
      alert(error.message || 'Erreur lors de l\'enregistrement du mouvement');
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = stockItems.filter(item => item.quantity <= item.min_quantity);
  const totalValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.text }}>
          Gestion de Stock
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', background: colors.surface, padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setView('stock')}
              style={{
                padding: '8px 16px',
                background: view === 'stock' ? colors.primary : 'transparent',
                color: view === 'stock' ? '#fff' : colors.text,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Stock
            </button>
            <button
              onClick={() => setView('movements')}
              style={{
                padding: '8px 16px',
                background: view === 'movements' ? colors.primary : 'transparent',
                color: view === 'movements' ? '#fff' : colors.text,
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Mouvements
            </button>
          </div>
          {userRole === 'admin' && view === 'stock' && (
            <button
              onClick={() => {
                setEditingItemId(null);
                setItemFormData({
                  name: '',
                  category: 'materiel',
                  quantity: '',
                  min_quantity: '',
                  unit: 'piece',
                  unit_price: '',
                  supplier: '',
                  notes: '',
                });
                setShowItemForm(!showItemForm);
              }}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${colors.primary}, #60a5fa)`,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Nouvel Article
            </button>
          )}
          {view === 'stock' && (
            <button
              onClick={() => setShowMovementForm(!showMovementForm)}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${colors.success}, #34d399)`,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Mouvement
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Articles en Stock</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
            {stockItems.length}
          </div>
        </div>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Alertes Stock Faible</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: lowStockItems.length > 0 ? colors.danger : colors.success }}>
            {lowStockItems.length}
          </div>
        </div>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Valeur Totale</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
            {safeLocale(totalValue)} GNF
          </div>
        </div>
      </div>

      {view === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['all', 'materiel', 'outillage', 'consommable', 'securite', 'autre'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  padding: '10px 16px',
                  background: filterCategory === cat ? colors.primary : colors.surface,
                  color: filterCategory === cat ? '#fff' : colors.text,
                  border: `2px solid ${filterCategory === cat ? colors.primary : colors.border}`,
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {lowStockItems.length > 0 && (
            <div style={{
              background: `${colors.danger}20`,
              border: `2px solid ${colors.danger}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 'bold', color: colors.danger, marginBottom: '8px' }}>
                Alerte Stock Faible ({lowStockItems.length} articles)
              </div>
              <div style={{ fontSize: '14px', color: colors.text }}>
                {lowStockItems.map(item => item.name).join(', ')}
              </div>
            </div>
          )}

          {showItemForm && userRole === 'admin' && (
            <div style={{
              background: colors.background,
              padding: '24px',
              borderRadius: '16px',
              border: `2px solid ${colors.border}`,
              marginBottom: '30px',
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.text, marginBottom: '20px' }}>
                {editingItemId ? 'Modifier l\'Article' : 'Nouvel Article'}
              </h3>
              <form onSubmit={handleItemSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Nom de l'article *
                    </label>
                    <input
                      type="text"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Catégorie *
                    </label>
                    <select
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, category: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    >
                      <option value="materiel">Matériel</option>
                      <option value="outillage">Outillage</option>
                      <option value="consommable">Consommable</option>
                      <option value="securite">Sécurité</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Quantité *
                    </label>
                    <input
                      type="number"
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                      min="0"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Seuil Minimum *
                    </label>
                    <input
                      type="number"
                      value={itemFormData.min_quantity}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, min_quantity: e.target.value }))}
                      required
                      min="0"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Unité *
                    </label>
                    <select
                      value={itemFormData.unit}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, unit: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    >
                      <option value="piece">Pièce</option>
                      <option value="kg">Kilogramme</option>
                      <option value="litre">Litre</option>
                      <option value="metre">Mètre</option>
                      <option value="carton">Carton</option>
                      <option value="paquet">Paquet</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Prix Unitaire (GNF)
                    </label>
                    <input
                      type="number"
                      value={itemFormData.unit_price}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      min="0"
                      step="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Fournisseur
                    </label>
                    <input
                      type="text"
                      value={itemFormData.supplier}
                      onChange={(e) => setItemFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                    Notes
                  </label>
                  <textarea
                    value={itemFormData.notes}
                    onChange={(e) => setItemFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      background: colors.surface,
                      color: colors.text,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '12px',
                      background: 'transparent',
                      color: colors.text,
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: 'none',
                      borderRadius: '12px',
                      background: loading ? colors.border : `linear-gradient(135deg, ${colors.primary}, #60a5fa)`,
                      color: '#fff',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? (editingItemId ? 'Modification...' : 'Ajout...') : (editingItemId ? 'Modifier' : 'Ajouter')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {showMovementForm && (
            <div style={{
              background: colors.background,
              padding: '24px',
              borderRadius: '16px',
              border: `2px solid ${colors.border}`,
              marginBottom: '30px',
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.text, marginBottom: '20px' }}>
                Enregistrer un Mouvement
              </h3>
              <form onSubmit={handleMovementSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Article *
                    </label>
                    <select
                      value={movementFormData.stock_item_id}
                      onChange={(e) => setMovementFormData(prev => ({ ...prev, stock_item_id: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    >
                      <option value="">Sélectionner un article</option>
                      {stockItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Type de Mouvement *
                    </label>
                    <select
                      value={movementFormData.movement_type}
                      onChange={(e) => setMovementFormData(prev => ({ ...prev, movement_type: e.target.value as 'in' | 'out' }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    >
                      <option value="in">Entrée</option>
                      <option value="out">Sortie</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Quantité *
                    </label>
                    <input
                      type="number"
                      value={movementFormData.quantity}
                      onChange={(e) => setMovementFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      required
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                      Référence
                    </label>
                    <input
                      type="text"
                      value={movementFormData.reference}
                      onChange={(e) => setMovementFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Bon de commande, etc."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        fontSize: '14px',
                        background: colors.surface,
                        color: colors.text,
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                    Notes
                  </label>
                  <textarea
                    value={movementFormData.notes}
                    onChange={(e) => setMovementFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      background: colors.surface,
                      color: colors.text,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowMovementForm(false)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '12px',
                      background: 'transparent',
                      color: colors.text,
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      border: 'none',
                      borderRadius: '12px',
                      background: loading ? colors.border : `linear-gradient(135deg, ${colors.success}, #34d399)`,
                      color: '#fff',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ background: colors.background, borderRadius: '16px', border: `2px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.surface }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Article
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Catégorie
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Quantité
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Seuil Min
                    </th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Prix Unitaire
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      Fournisseur
                    </th>
                    {userRole === 'admin' && (
                      <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stockItems.length === 0 ? (
                    <tr>
                      <td colSpan={userRole === 'admin' ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                        Aucun article en stock
                      </td>
                    </tr>
                  ) : (
                    stockItems.map(item => (
                      <tr key={item.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          {item.name}
                          {item.quantity <= item.min_quantity && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '12px',
                              color: colors.danger,
                              fontWeight: '600',
                            }}>
                              ⚠️ Stock faible
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colors.text }}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                          {item.quantity} {item.unit}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colors.textSecondary, textAlign: 'center' }}>
                          {item.min_quantity} {item.unit}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colors.text, textAlign: 'right' }}>
                          {safeLocale(item.unit_price)} GNF
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: colors.textSecondary }}>
                          {item.supplier || '-'}
                        </td>
                        {userRole === 'admin' && (
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleEditItem(item)}
                                style={{
                                  padding: '8px 16px',
                                  background: `linear-gradient(135deg, ${colors.primary}, #60a5fa)`,
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                style={{
                                  padding: '8px 16px',
                                  background: `linear-gradient(135deg, ${colors.danger}, #f87171)`,
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'movements' && (
        <div style={{ background: colors.background, borderRadius: '16px', border: `2px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.surface }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Date
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Article
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Type
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Quantité
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Référence
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Créé par
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                      Aucun mouvement enregistré
                    </td>
                  </tr>
                ) : (
                  movements.map(movement => (
                    <tr key={movement.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontSize: '14px', color: colors.text }}>
                        {safeDate(movement.created_at)}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                        {movement.stock_item_name}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: movement.movement_type === 'in' ? `${colors.success}20` : `${colors.danger}20`,
                          color: movement.movement_type === 'in' ? colors.success : colors.danger,
                        }}>
                          {movement.movement_type === 'in' ? '↑ Entrée' : '↓ Sortie'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: colors.text, textAlign: 'center' }}>
                        {movement.quantity}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: colors.textSecondary }}>
                        {movement.reference || '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: colors.textSecondary }}>
                        {movement.created_by_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager;
