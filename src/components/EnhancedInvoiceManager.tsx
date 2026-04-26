import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeInvoices, useRealtimeProjects } from '../hooks/useRealtimeSync';
import { safeNumber, safeLocale } from '../utils/safeFormat';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_id?: string;
  amount: number;
  status: string;
  due_date: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  project_id?: string;
  quote_request_id?: string;
  created_at: string;
  project_title?: string;
  tranche_signature_percent?: number;
  tranche_signature_amount?: number;
  tranche_signature_paid?: boolean;
  tranche_signature_date?: string;
  tranche_moitier_percent?: number;
  tranche_moitier_amount?: number;
  tranche_moitier_paid?: boolean;
  tranche_moitier_date?: string;
  tranche_fin_percent?: number;
  tranche_fin_amount?: number;
  tranche_fin_paid?: boolean;
  tranche_fin_date?: string;
  client?: {
    name: string;
    email: string;
    phone?: string;
  };
  project?: {
    title: string;
    location: string;
    status: string;
  };
  quote?: {
    tracking_number: string;
    service_type: string;
    status: string;
  };
  sent_to_client?: boolean;
  sent_at?: string;
  sent_to_email?: string;
}

interface EnhancedInvoiceManagerProps {
  userRole: string;
  darkMode?: boolean;
  currentUserId?: string;
}

const INITIAL_LATE_FEE_PERCENT = 2;
const WEEKLY_LATE_FEE_PERCENT = 5;

const DEFAULT_INVOICE_NOTE =
  `IMPORTANT : Conformement aux conditions generales de TSD et Fils :\n\n1. Tout retard de paiement au-dela de la date d'echeance entrainera des frais de penalite de ${INITIAL_LATE_FEE_PERCENT}% du montant total de la facture, appliques automatiquement des le lendemain de la date d'echeance.\n\n2. En cas de non-reglement prolonge, une penalite supplementaire de ${WEEKLY_LATE_FEE_PERCENT}% sera ajoutee pour chaque semaine de retard supplementaire (a partir de la 2eme semaine).\n\nExemple : Pour une facture de 10 000 000 GNF echue le 21/02/2026 :\n- Le 22/02/2026 : +${INITIAL_LATE_FEE_PERCENT}% = 10 200 000 GNF\n- Le 01/03/2026 (1 semaine) : +${WEEKLY_LATE_FEE_PERCENT}% supplementaire = 10 700 000 GNF\n- Le 08/03/2026 (2 semaines) : +${WEEKLY_LATE_FEE_PERCENT}% supplementaire = 11 200 000 GNF\n\nMerci de respecter les delais de paiement pour eviter ces frais supplementaires.`;

const calculateLateFee = (invoice: Invoice): {
  isLate: boolean;
  daysLate: number;
  weeksLate: number;
  initialPenaltyAmount: number;
  weeklyPenaltyAmount: number;
  penaltyAmount: number;
  totalWithPenalty: number;
  penaltyPercent: number;
} => {
  const baseAmount = Number(invoice.amount);

  if (invoice.status === 'Payee') {
    return { isLate: false, daysLate: 0, weeksLate: 0, initialPenaltyAmount: 0, weeklyPenaltyAmount: 0, penaltyAmount: 0, totalWithPenalty: baseAmount, penaltyPercent: 0 };
  }

  const dueDate = new Date(invoice.due_date);
  dueDate.setHours(23, 59, 59, 999);
  const today = new Date();
  const diffMs = today.getTime() - dueDate.getTime();
  const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysLate <= 0) {
    return { isLate: false, daysLate: 0, weeksLate: 0, initialPenaltyAmount: 0, weeklyPenaltyAmount: 0, penaltyAmount: 0, totalWithPenalty: baseAmount, penaltyPercent: 0 };
  }

  const initialPenaltyAmount = Math.round(baseAmount * INITIAL_LATE_FEE_PERCENT / 100);

  const weeksLate = Math.max(0, Math.floor((daysLate - 1) / 7));
  const weeklyPenaltyAmount = Math.round(baseAmount * WEEKLY_LATE_FEE_PERCENT / 100) * weeksLate;

  const penaltyAmount = initialPenaltyAmount + weeklyPenaltyAmount;
  const penaltyPercent = INITIAL_LATE_FEE_PERCENT + (weeksLate * WEEKLY_LATE_FEE_PERCENT);

  return { isLate: true, daysLate, weeksLate, initialPenaltyAmount, weeklyPenaltyAmount, penaltyAmount, totalWithPenalty: baseAmount + penaltyAmount, penaltyPercent };
};

const EnhancedInvoiceManager: React.FC<EnhancedInvoiceManagerProps> = ({ userRole, darkMode = false, currentUserId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    amount: '',
    due_date: '',
    project_id: '',
    notes: DEFAULT_INVOICE_NOTE,
    tranche_signature_percent: '65',
    tranche_moitier_percent: '20',
    tranche_fin_percent: '15',
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
  const [sendEmail, setSendEmail] = useState('');

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

  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, name, email, phone')
        .eq('role', 'client')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chantiers')
        .select(`
          id,
          title,
          status,
          location,
          quote:quote_requests!chantier_id(
            id,
            estimated_price,
            status,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:client_id(name, email, phone),
          project:project_id(title, location, status),
          quote:quote_request_id(tracking_number, service_type, status)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des factures:', error);
        throw error;
      }

      console.log('Factures chargées:', data?.length || 0);

      const formatted = (data || []).map((inv: any) => ({
        ...inv,
        client_name: inv.client?.name || inv.client_name || 'Client inconnu',
        project_title: inv.project?.title,
      }));

      setInvoices(formatted);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadInvoices();
    loadProjects();
    loadClients();
  }, [loadInvoices, loadProjects, loadClients]);

  useRealtimeInvoices(loadInvoices);
  useRealtimeProjects(loadProjects);

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleProjectChange = (projectId: string) => {
    setFormData(prev => ({ ...prev, project_id: projectId }));

    if (projectId) {
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject && selectedProject.quote) {
        const quote = Array.isArray(selectedProject.quote)
          ? selectedProject.quote[0]
          : selectedProject.quote;

        if (quote && quote.estimated_price) {
          setFormData(prev => ({
            ...prev,
            project_id: projectId,
            amount: String(quote.estimated_price ?? ''),
            client_name: quote.name || prev.client_name,
          }));
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!formData.client_id && !formData.client_name) || !formData.amount || !formData.due_date) {
      alert('Tous les champs obligatoires doivent être remplis');
      return;
    }

    const totalPercent = parseFloat(formData.tranche_signature_percent) +
                         parseFloat(formData.tranche_moitier_percent) +
                         parseFloat(formData.tranche_fin_percent);

    if (totalPercent !== 100) {
      alert(`Le total des pourcentages doit être égal à 100% (actuel: ${totalPercent}%)`);
      return;
    }

    try {
      setLoading(true);

      const selectedClient = clients.find(c => c.id === formData.client_id);
      const totalAmount = parseFloat(formData.amount);
      const signaturePercent = parseFloat(formData.tranche_signature_percent);
      const moitierPercent = parseFloat(formData.tranche_moitier_percent);
      const finPercent = parseFloat(formData.tranche_fin_percent);

      const invoiceData: any = {
        client_id: formData.client_id || null,
        client_name: selectedClient?.name || formData.client_name,
        amount: totalAmount,
        due_date: formData.due_date,
        project_id: formData.project_id || null,
        notes: formData.notes,
        tranche_signature_percent: signaturePercent,
        tranche_signature_amount: (totalAmount * signaturePercent) / 100,
        tranche_moitier_percent: moitierPercent,
        tranche_moitier_amount: (totalAmount * moitierPercent) / 100,
        tranche_fin_percent: finPercent,
        tranche_fin_amount: (totalAmount * finPercent) / 100,
      };

      if (editingInvoiceId) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoiceId);

        if (error) {
          console.error('Erreur Supabase détaillée:', error);
          throw error;
        }

        alert('Facture modifiée avec succès');
      } else {
        invoiceData.invoice_number = generateInvoiceNumber();
        invoiceData.status = 'En attente';

        const { error } = await supabase.from('invoices').insert(invoiceData);

        if (error) {
          console.error('Erreur Supabase détaillée:', error);
          throw error;
        }

        alert('Facture créée avec succès');
      }

      setShowForm(false);
      setEditingInvoiceId(null);
      setFormData({
        client_id: '',
        client_name: '',
        amount: '',
        due_date: '',
        project_id: '',
        notes: DEFAULT_INVOICE_NOTE,
        tranche_signature_percent: '65',
        tranche_moitier_percent: '20',
        tranche_fin_percent: '15',
      });
      loadInvoices();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      const errorMessage = error?.message || 'Erreur lors de la sauvegarde de la facture';
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, newStatus: string, paymentDate?: string, paymentMethod?: string) => {
    try {
      setLoading(true);
      const updateData: any = { status: newStatus };

      if (newStatus === 'Payee' && paymentDate) {
        updateData.payment_date = paymentDate;
        updateData.payment_method = paymentMethod || 'Espèces';
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;
      alert('Statut mis à jour');
      loadInvoices();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleTranchePayment = async (invoiceId: string, trancheType: 'signature' | 'moitier' | 'fin', isPaid: boolean) => {
    try {
      setLoading(true);
      const updateData: any = {};

      if (trancheType === 'signature') {
        updateData.tranche_signature_paid = isPaid;
        updateData.tranche_signature_date = isPaid ? new Date().toISOString() : null;
      } else if (trancheType === 'moitier') {
        updateData.tranche_moitier_paid = isPaid;
        updateData.tranche_moitier_date = isPaid ? new Date().toISOString() : null;
      } else if (trancheType === 'fin') {
        updateData.tranche_fin_paid = isPaid;
        updateData.tranche_fin_date = isPaid ? new Date().toISOString() : null;
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;
      loadInvoices();
    } catch (error) {
      console.error('Error updating tranche:', error);
      alert('Erreur lors de la mise à jour de la tranche');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToClient = (invoice: Invoice) => {
    setInvoiceToSend(invoice);
    const clientEmail = invoice.client?.email || '';
    setSendEmail(clientEmail);
    setShowSendModal(true);
  };

  const confirmSendToClient = async () => {
    if (!invoiceToSend || !sendEmail) {
      alert('Veuillez entrer une adresse email');
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          sent_to_client: true,
          sent_at: new Date().toISOString(),
          sent_to_email: sendEmail,
        })
        .eq('id', invoiceToSend.id);

      if (updateError) throw updateError;

      if (invoiceToSend.client_id && currentUserId) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_1_id.eq.${invoiceToSend.client_id},participant_2_id.eq.${currentUserId}),and(participant_1_id.eq.${currentUserId},participant_2_id.eq.${invoiceToSend.client_id})`)
          .maybeSingle();

        let conversationId = existingConv?.id;

        if (!conversationId && invoiceToSend.client_id) {
          const participant1 = currentUserId < invoiceToSend.client_id ? currentUserId : invoiceToSend.client_id;
          const participant2 = currentUserId < invoiceToSend.client_id ? invoiceToSend.client_id : currentUserId;

          const { data: newConv, error: newConvError } = await supabase
            .from('conversations')
            .insert({
              participant_1_id: participant1,
              participant_2_id: participant2,
            })
            .select('id')
            .single();

          if (newConvError) throw newConvError;
          conversationId = newConv?.id;
        }

        if (conversationId) {
          const { error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: currentUserId,
              content: `Facture N° ${invoiceToSend.invoice_number}`,
              message_type: 'invoice',
              invoice_id: invoiceToSend.id,
            });

          if (messageError) console.error('Error sending message:', messageError);
        }
      }

      alert(`Facture ${invoiceToSend.invoice_number} envoyée à ${sendEmail} et notifiée dans l'application`);
      setShowSendModal(false);
      setInvoiceToSend(null);
      setSendEmail('');
      loadInvoices();
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Erreur lors de l\'envoi de la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setFormData({
      client_id: invoice.client_id || '',
      client_name: invoice.client_name || '',
      amount: String(invoice.amount ?? ''),
      due_date: (invoice.due_date ?? '').split('T')[0],
      project_id: invoice.project_id || '',
      notes: invoice.notes || '',
      tranche_signature_percent: invoice.tranche_signature_percent?.toString() || '65',
      tranche_moitier_percent: invoice.tranche_moitier_percent?.toString() || '20',
      tranche_fin_percent: invoice.tranche_fin_percent?.toString() || '15',
    });
    setShowForm(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.invoice_number} ?`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;

      alert('Facture supprimée avec succès');
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Erreur lors de la suppression de la facture');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'En attente': colors.warning,
      'Payee': colors.success,
      'En retard': colors.danger,
    };
    return statusColors[status] || colors.textSecondary;
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'Payee').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'En attente').reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalLateFees = invoices.reduce((sum, inv) => sum + calculateLateFee(inv).penaltyAmount, 0);
  const lateInvoicesCount = invoices.filter(inv => calculateLateFee(inv).isLate).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.text }}>
          Gestion des Factures
        </h1>
        {userRole === 'admin' && (
          <button
            onClick={() => {
              if (showForm && editingInvoiceId) {
                setEditingInvoiceId(null);
                setFormData({
                  client_id: '',
                  client_name: '',
                  amount: '',
                  due_date: '',
                  project_id: '',
                  notes: '',
                  tranche_signature_percent: '65',
                  tranche_moitier_percent: '20',
                  tranche_fin_percent: '15',
                });
              }
              setShowForm(!showForm);
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
            + Nouvelle Facture
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Total Facturé</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
            {safeLocale(totalAmount)} GNF
          </div>
        </div>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>Payé</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.success }}>
            {safeLocale(paidAmount)} GNF
          </div>
        </div>
        <div style={{ background: colors.surface, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.border}` }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>En Attente</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.warning }}>
            {safeLocale(pendingAmount)} GNF
          </div>
        </div>
        {lateInvoicesCount > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${colors.danger}10, ${colors.danger}05)`, padding: '20px', borderRadius: '16px', border: `2px solid ${colors.danger}40` }}>
            <div style={{ fontSize: '14px', color: colors.danger, marginBottom: '8px', fontWeight: '600' }}>Penalites retard ({lateInvoicesCount} facture{lateInvoicesCount > 1 ? 's' : ''})</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.danger }}>
              +{safeLocale(totalLateFees)} GNF
            </div>
          </div>
        )}
      </div>

      {lateInvoicesCount > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.danger}08, ${colors.danger}04)`,
          border: `2px solid ${colors.danger}30`,
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>&#9888;</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: colors.danger, marginBottom: '2px' }}>
              {lateInvoicesCount} facture{lateInvoicesCount > 1 ? 's' : ''} en retard - Penalite de {INITIAL_LATE_FEE_PERCENT}% + {WEEKLY_LATE_FEE_PERCENT}%/semaine
            </div>
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
              Penalite initiale de {INITIAL_LATE_FEE_PERCENT}% des le lendemain + {WEEKLY_LATE_FEE_PERCENT}% supplementaire par semaine de retard.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['all', 'En attente', 'Payee', 'En retard'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '10px 16px',
              background: filterStatus === status ? colors.primary : colors.surface,
              color: filterStatus === status ? '#fff' : colors.text,
              border: `2px solid ${filterStatus === status ? colors.primary : colors.border}`,
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {status === 'all' ? 'Toutes' : status}
          </button>
        ))}
      </div>

      {showForm && userRole === 'admin' && (
        <div style={{
          background: colors.background,
          padding: '24px',
          borderRadius: '16px',
          border: `2px solid ${colors.border}`,
          marginBottom: '30px',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.text, marginBottom: '20px' }}>
            {editingInvoiceId ? 'Modifier Facture' : 'Nouvelle Facture'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                  Client *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
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
                  <option value="">Sélectionner un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.email && `(${client.email})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                  Projet / Devis (optionnel)
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => handleProjectChange(e.target.value)}
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
                  <option value="">Aucun projet</option>
                  {projects.map(proj => {
                    const quote = Array.isArray(proj.quote) ? proj.quote[0] : proj.quote;
                    const amount = quote?.estimated_price
                      ? ` - ${new Intl.NumberFormat('fr-FR').format(quote.estimated_price)} GNF`
                      : '';
                    return (
                      <option key={proj.id} value={proj.id}>
                        {proj.title} - {proj.location || 'Sans localisation'}{amount}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                  Montant (GNF) *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
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
                  Date d'échéance *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
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
            </div>
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              background: `linear-gradient(135deg, ${colors.danger}08, ${colors.warning}06)`,
              borderRadius: '12px',
              border: `2px solid ${colors.danger}30`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>&#9888;</span>
                <label style={{ fontSize: '14px', fontWeight: '700', color: colors.danger }}>
                  Note de facturation (Penalites de retard : {INITIAL_LATE_FEE_PERCENT}% + {WEEKLY_LATE_FEE_PERCENT}%/semaine)
                </label>
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.textSecondary,
                marginBottom: '10px',
                padding: '8px 12px',
                background: colors.background,
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.danger}`,
              }}>
                Cette note rappelle au client : {INITIAL_LATE_FEE_PERCENT}% de penalite des le 1er jour de retard, puis {WEEKLY_LATE_FEE_PERCENT}% supplementaire pour chaque semaine de retard.
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: colors.surface,
                  color: colors.text,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{
              marginBottom: '20px',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(96, 165, 250, 0.05))',
              borderRadius: '12px',
              border: `2px solid ${colors.primary}30`,
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: colors.text, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💰</span>
                Pourcentages de paiement
              </h4>
              <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '16px' }}>
                Le total des pourcentages doit être égal à 100%
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                    Signature (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tranche_signature_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, tranche_signature_percent: e.target.value }))}
                    min="0"
                    max="100"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: colors.background,
                      color: colors.text,
                      fontWeight: '600',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                    Mi-parcours (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tranche_moitier_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, tranche_moitier_percent: e.target.value }))}
                    min="0"
                    max="100"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: colors.background,
                      color: colors.text,
                      fontWeight: '600',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text, marginBottom: '6px' }}>
                    Fin (%)
                  </label>
                  <input
                    type="number"
                    value={formData.tranche_fin_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, tranche_fin_percent: e.target.value }))}
                    min="0"
                    max="100"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `2px solid ${colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: colors.background,
                      color: colors.text,
                      fontWeight: '600',
                    }}
                  />
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: colors.background,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textSecondary }}>Total:</span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: (parseFloat(formData.tranche_signature_percent) + parseFloat(formData.tranche_moitier_percent) + parseFloat(formData.tranche_fin_percent)) === 100 ? colors.success : colors.danger
                }}>
                  {parseFloat(formData.tranche_signature_percent) + parseFloat(formData.tranche_moitier_percent) + parseFloat(formData.tranche_fin_percent)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
                {loading ? 'Création...' : 'Créer'}
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
                  N° Facture
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Client
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Projet
                </th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Montant
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Échéance
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  Statut
                </th>
                {userRole === 'admin' && (
                  <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 7 : 6} style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                    Aucune facture trouvée
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => (
                  <tr
                    key={invoice.id}
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setShowDetailModal(true);
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.surface}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{invoice.invoice_number || `#${invoice.id.substring(0, 8)}`}</span>
                        {invoice.sent_to_client && (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '600',
                            background: `${colors.success}20`,
                            color: colors.success,
                          }}>
                            Envoyée
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: colors.text }}>
                      <div>{invoice.client_name}</div>
                      {invoice.client?.email && (
                        <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                          {invoice.client?.email ?? ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: colors.textSecondary }}>
                      {invoice.project_title || '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {(() => {
                        const fee = calculateLateFee(invoice);
                        return (
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                              {safeLocale(invoice.amount)} GNF
                            </div>
                            {fee.isLate && (
                              <div style={{ fontSize: '11px', fontWeight: '700', color: colors.danger, marginTop: '2px' }}>
                                +{safeLocale(fee.penaltyAmount)} GNF ({fee.penaltyPercent}%)
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: colors.text }}>
                      {(() => {
                        const fee = calculateLateFee(invoice);
                        return (
                          <div>
                            <div>{new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
                            {fee.isLate && (
                              <div style={{ fontSize: '11px', fontWeight: '700', color: colors.danger, marginTop: '2px' }}>
                                {fee.daysLate} jour{fee.daysLate > 1 ? 's' : ''} de retard
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: `${getStatusColor(invoice.status)}20`,
                        color: getStatusColor(invoice.status),
                      }}>
                        {invoice.status}
                      </span>
                    </td>
                    {userRole === 'admin' && (
                      <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        {!invoice.sent_to_client && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToClient(invoice);
                            }}
                            disabled={loading}
                            style={{
                              padding: '6px 12px',
                              background: colors.primary,
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Envoyer
                          </button>
                        )}
                        {invoice.status !== 'Payee' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(invoice.id, 'Payee', new Date().toISOString().split('T')[0], 'Espèces');
                            }}
                            disabled={loading}
                            style={{
                              padding: '6px 12px',
                              background: colors.success,
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Marquer Payé
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(invoice);
                          }}
                          disabled={loading}
                          style={{
                            padding: '6px 12px',
                            background: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(invoice);
                          }}
                          disabled={loading}
                          style={{
                            padding: '6px 12px',
                            background: colors.danger,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailModal && selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              background: colors.background,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text }}>
                Détails de la Facture
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: `${getStatusColor(selectedInvoice.status)}20`,
                  color: getStatusColor(selectedInvoice.status),
                }}>
                  {selectedInvoice.status}
                </div>

                {selectedInvoice.status !== 'Payee' && (() => {
                  const dueDate = new Date(selectedInvoice.due_date);
                  const today = new Date();
                  const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                  if (daysDiff > 0) {
                    return (
                      <div style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: `${colors.danger}20`,
                        color: colors.danger,
                      }}>
                        En retard de {daysDiff} jour{daysDiff > 1 ? 's' : ''}
                      </div>
                    );
                  } else if (daysDiff >= -7) {
                    return (
                      <div style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: `${colors.warning}20`,
                        color: colors.warning,
                      }}>
                        Echeance dans {Math.abs(daysDiff)} jour{Math.abs(daysDiff) > 1 ? 's' : ''}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Numéro de facture</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                  {selectedInvoice.invoice_number || `#${selectedInvoice.id.substring(0, 8)}`}
                </div>
              </div>

              <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Client</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                  {selectedInvoice.client_name}
                </div>
                {selectedInvoice.client?.email && (
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '4px' }}>
                    Email: {selectedInvoice.client?.email ?? ''}
                  </div>
                )}
                {selectedInvoice.client?.phone && (
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '2px' }}>
                    Tél: {selectedInvoice.client?.phone ?? ''}
                  </div>
                )}
              </div>

              {selectedInvoice.sent_to_client && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.success}40`,
                }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>✉️</span>
                    Facture envoyée
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.success, marginBottom: '4px' }}>
                    Envoyée à: {selectedInvoice.sent_to_email}
                  </div>
                  {selectedInvoice.sent_at && (
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      Le {new Date(selectedInvoice.sent_at).toLocaleDateString('fr-FR')} à {new Date(selectedInvoice.sent_at).toLocaleTimeString('fr-FR')}
                    </div>
                  )}
                </div>
              )}

              {selectedInvoice.quote && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.success}40`,
                }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>📋</span>
                    Devis source
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.success }}>
                    #{selectedInvoice.quote?.tracking_number ?? ''}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '4px' }}>
                    Service: {selectedInvoice.quote?.service_type ?? ''}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '2px' }}>
                    Statut: {selectedInvoice.quote.status === 'accepted' ? 'Accepté' : selectedInvoice.quote.status}
                  </div>
                </div>
              )}

              {selectedInvoice.project && (
                <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Projet associé</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                    {selectedInvoice.project.title}
                  </div>
                  {selectedInvoice.project.location && (
                    <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '4px' }}>
                      Lieu: {selectedInvoice.project.location}
                    </div>
                  )}
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '2px' }}>
                    Statut: {selectedInvoice.project.status}
                  </div>
                </div>
              )}

              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                padding: '20px',
                borderRadius: '16px',
                border: `2px solid ${selectedInvoice.status === 'Payee' ? colors.success : colors.danger}40`,
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, marginBottom: '12px' }}>
                  Résumé du paiement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Montant total</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
                      {safeLocale(selectedInvoice.amount)} GNF
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Déjà payé</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.success }}>
                      {safeLocale(
                        (selectedInvoice.tranche_signature_paid ? safeNumber(selectedInvoice.tranche_signature_amount) : 0) +
                        (selectedInvoice.tranche_moitier_paid ? safeNumber(selectedInvoice.tranche_moitier_amount) : 0) +
                        (selectedInvoice.tranche_fin_paid ? safeNumber(selectedInvoice.tranche_fin_amount) : 0)
                      )} GNF
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Reste à payer</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.danger }}>
                      {safeLocale(
                        safeNumber(selectedInvoice.amount) -
                        (selectedInvoice.tranche_signature_paid ? safeNumber(selectedInvoice.tranche_signature_amount) : 0) -
                        (selectedInvoice.tranche_moitier_paid ? safeNumber(selectedInvoice.tranche_moitier_amount) : 0) -
                        (selectedInvoice.tranche_fin_paid ? safeNumber(selectedInvoice.tranche_fin_amount) : 0)
                      )} GNF
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '12px',
                  height: '8px',
                  background: colors.border,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${colors.success}, ${colors.success}dd)`,
                    width: `${((
                      (selectedInvoice.tranche_signature_paid ? safeNumber(selectedInvoice.tranche_signature_amount) : 0) +
                      (selectedInvoice.tranche_moitier_paid ? safeNumber(selectedInvoice.tranche_moitier_amount) : 0) +
                      (selectedInvoice.tranche_fin_paid ? safeNumber(selectedInvoice.tranche_fin_amount) : 0)
                    ) / (safeNumber(selectedInvoice.amount) || 1)) * 100}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '6px', textAlign: 'center' }}>
                  {Math.round(((
                    (selectedInvoice.tranche_signature_paid ? safeNumber(selectedInvoice.tranche_signature_amount) : 0) +
                    (selectedInvoice.tranche_moitier_paid ? safeNumber(selectedInvoice.tranche_moitier_amount) : 0) +
                    (selectedInvoice.tranche_fin_paid ? safeNumber(selectedInvoice.tranche_fin_amount) : 0)
                  ) / (safeNumber(selectedInvoice.amount) || 1)) * 100)}% payé
                </div>
              </div>

              {(() => {
                const fee = calculateLateFee(selectedInvoice);
                return fee.isLate ? (
                  <div style={{
                    background: `linear-gradient(135deg, ${colors.danger}12, ${colors.danger}06)`,
                    padding: '20px',
                    borderRadius: '16px',
                    border: `2px solid ${colors.danger}50`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{ fontSize: '22px' }}>&#9888;</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: colors.danger }}>
                        PENALITE DE RETARD - {fee.penaltyPercent}%
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ background: colors.background, padding: '12px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Retard</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: colors.danger }}>
                          {fee.daysLate} jour{fee.daysLate > 1 ? 's' : ''} {fee.weeksLate > 0 && `(${fee.weeksLate} sem.)`}
                        </div>
                      </div>
                      <div style={{ background: colors.background, padding: '12px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '4px' }}>Total penalites ({fee.penaltyPercent}%)</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: colors.danger }}>
                          +{safeLocale(fee.penaltyAmount)} GNF
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: '8px', fontSize: '13px' }}>
                        <span style={{ color: colors.textSecondary }}>Penalite initiale ({INITIAL_LATE_FEE_PERCENT}%)</span>
                        <span style={{ fontWeight: '700', color: colors.danger }}>+{safeLocale(fee.initialPenaltyAmount)} GNF</span>
                      </div>
                      {fee.weeksLate > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: colors.background, borderRadius: '8px', fontSize: '13px' }}>
                          <span style={{ color: colors.textSecondary }}>Penalite hebdomadaire ({fee.weeksLate} x {WEEKLY_LATE_FEE_PERCENT}%)</span>
                          <span style={{ fontWeight: '700', color: colors.danger }}>+{safeLocale(fee.weeklyPenaltyAmount)} GNF</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: `${colors.danger}15`, borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}>
                        <span style={{ color: colors.danger }}>NOUVEAU TOTAL</span>
                        <span style={{ color: colors.danger }}>{safeLocale(fee.totalWithPenalty)} GNF</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.textSecondary,
                      padding: '10px 12px',
                      background: colors.background,
                      borderRadius: '8px',
                      borderLeft: `3px solid ${colors.danger}`,
                      lineHeight: '1.5',
                    }}>
                      Echeance depassee depuis le {new Date(selectedInvoice.due_date).toLocaleDateString('fr-FR')}.
                      {' '}{INITIAL_LATE_FEE_PERCENT}% applique le 1er jour (+{safeLocale(fee.initialPenaltyAmount)} GNF)
                      {fee.weeksLate > 0 && `, puis ${fee.weeksLate} semaine${fee.weeksLate > 1 ? 's' : ''} x ${WEEKLY_LATE_FEE_PERCENT}% (+${safeLocale(fee.weeklyPenaltyAmount)} GNF)`}.
                    </div>
                  </div>
                ) : null;
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Montant total</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primary }}>
                    {safeLocale(selectedInvoice.amount)} GNF
                  </div>
                  {(() => {
                    const fee = calculateLateFee(selectedInvoice);
                    return fee.isLate ? (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: colors.danger, marginTop: '4px' }}>
                        Avec penalite: {safeLocale(fee.totalWithPenalty)} GNF
                      </div>
                    ) : null;
                  })()}
                </div>
                <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Date d'echeance</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                    {new Date(selectedInvoice.due_date).toLocaleDateString('fr-FR')}
                  </div>
                  {(() => {
                    const fee = calculateLateFee(selectedInvoice);
                    return fee.isLate ? (
                      <div style={{ fontSize: '12px', fontWeight: '700', color: colors.danger, marginTop: '4px' }}>
                        Depassee de {fee.daysLate} jour{fee.daysLate > 1 ? 's' : ''}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(96, 165, 250, 0.05))',
                padding: '20px',
                borderRadius: '16px',
                border: `2px solid ${colors.primary}30`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span style={{ fontSize: '20px' }}>💰</span>
                    Tranches de paiement
                  </h4>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: selectedInvoice.status === 'Payee' ? `${colors.success}20` : `${colors.warning}20`,
                    color: selectedInvoice.status === 'Payee' ? colors.success : colors.warning,
                  }}>
                    {(() => {
                      const paidCount = [
                        selectedInvoice.tranche_signature_paid,
                        selectedInvoice.tranche_moitier_paid,
                        selectedInvoice.tranche_fin_paid
                      ].filter(Boolean).length;
                      return `${paidCount}/3 payées`;
                    })()}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{
                    background: selectedInvoice.tranche_signature_paid
                      ? `linear-gradient(135deg, ${colors.success}10, ${colors.success}05)`
                      : colors.background,
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedInvoice.tranche_signature_paid ? colors.success : colors.danger}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {!selectedInvoice.tranche_signature_paid && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: colors.danger,
                        color: '#fff',
                      }}>
                        NON PAYÉE
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          1. Signature ({selectedInvoice.tranche_signature_percent}%)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: selectedInvoice.tranche_signature_paid ? colors.success : colors.danger, marginTop: '4px' }}>
                          {safeLocale(selectedInvoice.tranche_signature_amount)} GNF
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedInvoice.tranche_signature_paid || false}
                            onChange={(e) => handleTranchePayment(selectedInvoice.id, 'signature', e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '600', color: selectedInvoice.tranche_signature_paid ? colors.success : colors.danger }}>
                            {selectedInvoice.tranche_signature_paid ? 'Payée' : 'Non payée'}
                          </span>
                        </label>
                      )}
                    </div>
                    {selectedInvoice.tranche_signature_paid && selectedInvoice.tranche_signature_date ? (
                      <div style={{ fontSize: '12px', color: colors.success, marginTop: '4px', fontWeight: '600' }}>
                        ✓ Payée le {new Date(selectedInvoice.tranche_signature_date).toLocaleDateString('fr-FR')}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: colors.danger, marginTop: '4px', fontWeight: '600' }}>
                        ⚠ En attente de paiement
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: selectedInvoice.tranche_moitier_paid
                      ? `linear-gradient(135deg, ${colors.success}10, ${colors.success}05)`
                      : colors.background,
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedInvoice.tranche_moitier_paid ? colors.success : colors.danger}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {!selectedInvoice.tranche_moitier_paid && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: colors.danger,
                        color: '#fff',
                      }}>
                        NON PAYÉE
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          2. Mi-parcours ({selectedInvoice.tranche_moitier_percent}%)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: selectedInvoice.tranche_moitier_paid ? colors.success : colors.danger, marginTop: '4px' }}>
                          {safeLocale(selectedInvoice.tranche_moitier_amount)} GNF
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedInvoice.tranche_moitier_paid || false}
                            onChange={(e) => handleTranchePayment(selectedInvoice.id, 'moitier', e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '600', color: selectedInvoice.tranche_moitier_paid ? colors.success : colors.danger }}>
                            {selectedInvoice.tranche_moitier_paid ? 'Payée' : 'Non payée'}
                          </span>
                        </label>
                      )}
                    </div>
                    {selectedInvoice.tranche_moitier_paid && selectedInvoice.tranche_moitier_date ? (
                      <div style={{ fontSize: '12px', color: colors.success, marginTop: '4px', fontWeight: '600' }}>
                        ✓ Payée le {new Date(selectedInvoice.tranche_moitier_date).toLocaleDateString('fr-FR')}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: colors.danger, marginTop: '4px', fontWeight: '600' }}>
                        ⚠ En attente de paiement
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: selectedInvoice.tranche_fin_paid
                      ? `linear-gradient(135deg, ${colors.success}10, ${colors.success}05)`
                      : colors.background,
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedInvoice.tranche_fin_paid ? colors.success : colors.danger}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {!selectedInvoice.tranche_fin_paid && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: colors.danger,
                        color: '#fff',
                      }}>
                        NON PAYÉE
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                          3. Fin de projet ({selectedInvoice.tranche_fin_percent}%)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: selectedInvoice.tranche_fin_paid ? colors.success : colors.danger, marginTop: '4px' }}>
                          {safeLocale(selectedInvoice.tranche_fin_amount)} GNF
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedInvoice.tranche_fin_paid || false}
                            onChange={(e) => handleTranchePayment(selectedInvoice.id, 'fin', e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '600', color: selectedInvoice.tranche_fin_paid ? colors.success : colors.danger }}>
                            {selectedInvoice.tranche_fin_paid ? 'Payée' : 'Non payée'}
                          </span>
                        </label>
                      )}
                    </div>
                    {selectedInvoice.tranche_fin_paid && selectedInvoice.tranche_fin_date ? (
                      <div style={{ fontSize: '12px', color: colors.success, marginTop: '4px', fontWeight: '600' }}>
                        ✓ Payée le {new Date(selectedInvoice.tranche_fin_date).toLocaleDateString('fr-FR')}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: colors.danger, marginTop: '4px', fontWeight: '600' }}>
                        ⚠ En attente de paiement
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: colors.success + '20',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>Total payé:</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: colors.success }}>
                    {safeLocale(
                      (selectedInvoice.tranche_signature_paid ? safeNumber(selectedInvoice.tranche_signature_amount) : 0) +
                      (selectedInvoice.tranche_moitier_paid ? safeNumber(selectedInvoice.tranche_moitier_amount) : 0) +
                      (selectedInvoice.tranche_fin_paid ? safeNumber(selectedInvoice.tranche_fin_amount) : 0)
                    )} GNF
                  </span>
                </div>
              </div>

              {selectedInvoice.payment_date && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Date de paiement</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.success }}>
                      {new Date(selectedInvoice.payment_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Mode de paiement</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
                      {selectedInvoice.payment_method || '-'}
                    </div>
                  </div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Notes</div>
                  <div style={{ fontSize: '14px', color: colors.text, lineHeight: '1.5' }}>
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}

              <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>Date de création</div>
                <div style={{ fontSize: '14px', color: colors.text }}>
                  {new Date(selectedInvoice.created_at).toLocaleDateString('fr-FR')} à {new Date(selectedInvoice.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {userRole === 'admin' && selectedInvoice.status !== 'Payee' && (
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedInvoice.id, 'Payee', new Date().toISOString().split('T')[0], 'Espèces');
                    setShowDetailModal(false);
                  }}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: colors.success,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Marquer comme Payée
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '12px 24px',
                  background: colors.surface,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && invoiceToSend && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSendModal(false)}
        >
          <div
            style={{
              background: colors.background,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, marginBottom: '8px' }}>
                Envoyer la facture au client
              </h2>
              <p style={{ fontSize: '14px', color: colors.textSecondary }}>
                Facture: {invoiceToSend.invoice_number}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
                Détails de la facture:
              </label>
              <div style={{ background: colors.surface, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
                  <strong>Client:</strong> {invoiceToSend.client_name}
                </p>
                <p style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
                  <strong>Montant:</strong> {new Intl.NumberFormat('fr-FR').format(invoiceToSend.amount)} GNF
                </p>
                <p style={{ fontSize: '14px', color: colors.text }}>
                  <strong>Échéance:</strong> {new Date(invoiceToSend.due_date).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '8px' }}>
                Email du client *
              </label>
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="email@exemple.com"
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
              <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
                La facture sera marquée comme envoyée à cette adresse email.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: colors.surface,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmSendToClient}
                disabled={loading || !sendEmail}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: loading || !sendEmail ? colors.border : colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading || !sendEmail ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Envoi...' : 'Confirmer l\'envoi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedInvoiceManager;
