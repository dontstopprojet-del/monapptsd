import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeExpenses, useRealtimeProjects } from '../hooks/useRealtimeSync';
import { safeLocale, safeDate } from '../utils/safeFormat';

interface Expense {
  id: string;
  project_id: string;
  technician_id: string;
  category: string;
  amount: number;
  description: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  expense_date: string;
  created_at: string;
  technician_name?: string;
  project_name?: string;
}

interface ExpenseTrackerProps {
  userId: string;
  userRole: string;
  darkMode?: boolean;
}

interface FormState {
  project_id: string;
  category: string;
  amount: string;
  description: string;
  expense_date: string;
}

const INITIAL_FORM: FormState = {
  project_id: '',
  category: 'transport',
  amount: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
};

const CATEGORIES: Record<string, string> = {
  transport: 'Transport',
  materiel: 'Materiel',
  repas: 'Repas',
  hebergement: 'Hebergement',
  autre: 'Autre',
};

const CATEGORY_ICONS: Record<string, string> = {
  transport: '🚗',
  materiel: '🔧',
  repas: '🍽️',
  hebergement: '🏨',
  autre: '📦',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuve',
  rejected: 'Rejete',
};

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ userId, userRole, darkMode = false }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [projects, setProjects] = useState<any[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin';

  const C = {
    primary: darkMode ? '#3b82f6' : '#2563eb',
    secondary: darkMode ? '#60a5fa' : '#3b82f6',
    bg: darkMode ? '#0f172a' : '#f1f5f9',
    card: darkMode ? '#1e293b' : '#ffffff',
    surface: darkMode ? '#334155' : '#f8fafc',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#475569' : '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select(`
          *,
          technician:app_users!expenses_technician_id_fkey(name),
          project:chantiers(title)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('technician_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = (data || []).map((exp: any) => ({
        ...exp,
        technician_name: exp.technician?.name,
        project_name: exp.project?.title,
      }));
      setExpenses(formatted);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    loadExpenses();
    loadProjects();
  }, [loadExpenses, loadProjects]);

  useRealtimeExpenses(loadExpenses);
  useRealtimeProjects(loadProjects);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingExpense(null);
    setReceiptFile(null);
    setReceiptPreview('');
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier ne doit pas depasser 5 Mo');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadReceipt = async (file: File, expenseId: string): Promise<string | null> => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const filePath = `expenses/${expenseId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_id || !formData.amount || !formData.description) {
      alert('Tous les champs obligatoires doivent etre remplis');
      return;
    }

    try {
      setLoading(true);

      const expenseData: any = {
        project_id: formData.project_id,
        technician_id: userId,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        expense_date: formData.expense_date,
      };

      if (editingExpense) {
        let receiptUrl = editingExpense.receipt_url;
        if (receiptFile) {
          const url = await uploadReceipt(receiptFile, editingExpense.id);
          if (url) receiptUrl = url;
        }

        const { error } = await supabase
          .from('expenses')
          .update({
            ...expenseData,
            receipt_url: receiptUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExpense.id);

        if (error) throw error;
        alert('Depense modifiee avec succes');
      } else {
        expenseData.status = 'pending';

        const { data: inserted, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .maybeSingle();

        if (error) throw error;

        if (receiptFile && inserted) {
          const url = await uploadReceipt(receiptFile, inserted.id);
          if (url) {
            await supabase
              .from('expenses')
              .update({ receipt_url: url })
              .eq('id', inserted.id);
          }
        }

        alert('Depense enregistree avec succes');
      }

      resetForm();
      loadExpenses();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      project_id: expense.project_id,
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description,
      expense_date: expense.expense_date,
    });
    setReceiptPreview(expense.receipt_url || '');
    setShowForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      alert('Depense supprimee');
      setConfirmDelete(null);
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expenseId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
        .eq('id', expenseId);
      if (error) throw error;
      loadExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (expenseId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'rejected', approved_by: userId, approved_at: new Date().toISOString() })
        .eq('id', expenseId);
      if (error) throw error;
      loadExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return C.success;
    if (status === 'rejected') return C.danger;
    return C.warning;
  };

  const filteredExpenses = filterStatus === 'all'
    ? expenses
    : expenses.filter(e => e.status === filterStatus);

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending').length;
  const approvedExpenses = expenses.filter(exp => exp.status === 'approved').length;
  const approvedTotal = expenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: C.text, margin: 0 }}>
          Gestion des Depenses
        </h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            padding: '12px 24px',
            background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Nouvelle Depense
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: C.card, padding: '18px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>Total Depenses</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: C.text }}>{safeLocale(totalExpenses)} GNF</div>
        </div>
        <div style={{ background: C.card, padding: '18px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>Approuvees</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: C.success }}>{safeLocale(approvedTotal)} GNF</div>
        </div>
        <div style={{ background: C.card, padding: '18px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>En Attente</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: C.warning }}>{pendingExpenses}</div>
        </div>
        <div style={{ background: C.card, padding: '18px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>Nb Approuvees</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: C.success }}>{approvedExpenses}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: filterStatus === s ? 'none' : `1px solid ${C.border}`,
              background: filterStatus === s ? C.primary : C.card,
              color: filterStatus === s ? '#fff' : C.text,
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, padding: '20px', overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: '20px', padding: '0', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#FFF' }}>
                {editingExpense ? 'Modifier la Depense' : 'Nouvelle Depense'}
              </h3>
              <button onClick={resetForm} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: '#FFF', fontSize: '16px', cursor: 'pointer' }}>x</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Projet *</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', background: C.surface, color: C.text, boxSizing: 'border-box' }}
                  >
                    <option value="">Selectionner...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Categorie *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', background: C.surface, color: C.text, boxSizing: 'border-box' }}
                  >
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{CATEGORY_ICONS[k]} {v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Montant (GNF) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    min="0"
                    style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', background: C.surface, color: C.text, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Date *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', background: C.surface, color: C.text, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: '10px', fontSize: '14px', background: C.surface, color: C.text, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Justificatif (image)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${C.border}`,
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: C.surface,
                    transition: 'border-color 0.2s',
                  }}
                >
                  {receiptPreview ? (
                    <div style={{ position: 'relative' }}>
                      {receiptPreview.startsWith('data:image') || receiptPreview.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                        <img src={receiptPreview} alt="Justificatif" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: '14px', color: C.success, fontWeight: '600' }}>Fichier selectionne</div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: C.danger, color: '#fff', border: 'none', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                      <div style={{ fontSize: '13px', color: C.textSecondary }}>Cliquer pour ajouter un justificatif</div>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '4px' }}>JPG, PNG, PDF - Max 5 Mo</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{ flex: 1, padding: '14px', border: `1px solid ${C.border}`, borderRadius: '12px', background: 'transparent', color: C.text, fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderRadius: '12px',
                    background: (loading || uploading) ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
                    color: '#fff',
                    fontWeight: '600',
                    cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {uploading ? 'Televersement...' : loading ? 'Enregistrement...' : editingExpense ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ background: C.card, borderRadius: '16px', padding: '60px 20px', textAlign: 'center', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💰</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: C.text, marginBottom: '8px' }}>Aucune depense</div>
            <div style={{ fontSize: '13px', color: C.textSecondary }}>
              {filterStatus !== 'all' ? 'Aucune depense avec ce statut' : 'Les depenses apparaitront ici'}
            </div>
          </div>
        ) : (
          filteredExpenses.map(expense => {
            const statusColor = getStatusColor(expense.status);

            return (
              <div
                key={expense.id}
                style={{
                  background: C.card,
                  borderRadius: '16px',
                  border: `1px solid ${C.border}`,
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: `${statusColor}15`,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        fontSize: '22px', flexShrink: 0,
                      }}>
                        {CATEGORY_ICONS[expense.category] || '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>{CATEGORIES[expense.category] || expense.category}</h4>
                          <span style={{ background: `${statusColor}15`, color: statusColor, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                            {STATUS_LABELS[expense.status] || expense.status}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSecondary }}>
                          {expense.project_name || 'Projet inconnu'}
                          {isAdmin && expense.technician_name && ` - ${expense.technician_name}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: C.primary }}>{safeLocale(Number(expense.amount))}</div>
                      <div style={{ fontSize: '11px', color: C.textSecondary }}>GNF</div>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: C.textSecondary, lineHeight: '1.5' }}>{expense.description}</p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: C.textSecondary }}>
                        {safeDate(expense.expense_date)}
                      </span>
                      {expense.receipt_url && (
                        <button
                          onClick={() => { setSelectedExpense(expense); setShowImageViewer(true); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: `${C.primary}10`, border: `1px solid ${C.primary}30`,
                            borderRadius: '8px', padding: '4px 10px', cursor: 'pointer',
                            fontSize: '12px', color: C.primary, fontWeight: '600',
                          }}
                        >
                          📷 Justificatif
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {isAdmin && expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense.id)}
                            disabled={loading}
                            style={{ padding: '6px 14px', background: C.success, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => handleReject(expense.id)}
                            disabled={loading}
                            style={{ padding: '6px 14px', background: C.danger, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(expense)}
                        style={{
                          padding: '6px 14px',
                          background: `${C.primary}10`, border: `1px solid ${C.primary}30`,
                          borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                          cursor: 'pointer', color: C.primary,
                        }}
                      >
                        Modifier
                      </button>
                      {isAdmin && (
                        confirmDelete === expense.id ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              style={{ padding: '6px 12px', background: C.danger, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ padding: '6px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px', color: C.text, cursor: 'pointer' }}
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(expense.id)}
                            style={{
                              padding: '6px 14px',
                              background: `${C.danger}10`, border: `1px solid ${C.danger}30`,
                              borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                              cursor: 'pointer', color: C.danger,
                            }}
                          >
                            Supprimer
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showImageViewer && selectedExpense?.receipt_url && (
        <div onClick={() => setShowImageViewer(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: '20px', padding: '20px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: C.text }}>Justificatif - {CATEGORIES[selectedExpense.category]}</h4>
              <button onClick={() => setShowImageViewer(false)} style={{ background: C.surface, border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', color: C.text }}>x</button>
            </div>
            <img
              src={selectedExpense.receipt_url}
              alt="Justificatif"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '12px', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '12px', fontSize: '13px', color: C.textSecondary }}>
              {safeLocale(Number(selectedExpense.amount))} GNF - {safeDate(selectedExpense.expense_date)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
