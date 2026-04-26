import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale, safeDate } from '../utils/safeFormat';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  project_id: string | null;
  project_title: string | null;
  notes: string | null;
  tranche_signature_percent: number;
  tranche_signature_amount: number;
  tranche_signature_paid: boolean;
  tranche_moitier_percent: number;
  tranche_moitier_amount: number;
  tranche_moitier_paid: boolean;
  tranche_fin_percent: number;
  tranche_fin_amount: number;
  tranche_fin_paid: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
}

interface UnpaidInvoicesManagerProps {
  darkMode?: boolean;
}

export default function UnpaidInvoicesManager({ darkMode = false }: UnpaidInvoicesManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTranchePaid = async (invoiceId: string, tranche: 'signature' | 'moitier' | 'fin', paid: boolean) => {
    try {
      const field = `tranche_${tranche}_paid`;
      const { error } = await supabase
        .from('invoices')
        .update({ [field]: paid })
        .eq('id', invoiceId);

      if (error) throw error;
      await fetchInvoices();

      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updated = invoices.find(inv => inv.id === invoiceId);
        if (updated) setSelectedInvoice(updated);
      }
    } catch (error) {
      console.error('Error updating tranche:', error);
    }
  };

  const unpaidInvoices = invoices.filter(inv => {
    const hasUnpaidTranche = !inv.tranche_signature_paid || !inv.tranche_moitier_paid || !inv.tranche_fin_paid;
    return inv.status !== 'Payee' && hasUnpaidTranche;
  });

  const computePenalty = (inv: Invoice) => {
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(23, 59, 59, 999);
    const today = new Date();
    const diffMs = today.getTime() - dueDate.getTime();
    const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysLate <= 0) return { isOverdue: false, daysLate: 0, weeksLate: 0, penaltyPercent: 0, penaltyAmount: 0 };

    const base = Number(inv.amount);
    const initialPenalty = Math.round(base * 0.02);
    const weeksLate = Math.max(0, Math.floor((daysLate - 1) / 7));
    const weeklyPenalty = Math.round(base * 0.05) * weeksLate;
    const penaltyAmount = initialPenalty + weeklyPenalty;
    const penaltyPercent = 2 + (weeksLate * 5);
    return { isOverdue: true, daysLate, weeksLate, penaltyPercent, penaltyAmount };
  };

  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => {
    const unpaid = Number(inv.amount) -
      (inv.tranche_signature_paid ? Number(inv.tranche_signature_amount) : 0) -
      (inv.tranche_moitier_paid ? Number(inv.tranche_moitier_amount) : 0) -
      (inv.tranche_fin_paid ? Number(inv.tranche_fin_amount) : 0);

    const { penaltyAmount } = computePenalty(inv);
    return sum + unpaid + penaltyAmount;
  }, 0);

  const overdueInvoices = unpaidInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    return today > dueDate;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ fontSize: '18px', color: colors.textSecondary }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.danger, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '36px' }}>⚠️</span>
          Factures Impayées
        </h1>
        <p style={{ fontSize: '16px', color: colors.textSecondary }}>
          Suivi détaillé de toutes les factures avec paiements en attente
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${colors.danger}15, ${colors.danger}05)`,
          padding: '24px',
          borderRadius: '16px',
          border: `3px solid ${colors.danger}`,
        }}>
          <div style={{ fontSize: '14px', color: colors.danger, marginBottom: '8px', fontWeight: '600' }}>MONTANT TOTAL IMPAYÉ</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.danger }}>
            {safeLocale(totalUnpaidAmount)} GNF
          </div>
          <div style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '6px' }}>
            {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} concernée{unpaidInvoices.length > 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: colors.surface,
          padding: '24px',
          borderRadius: '16px',
          border: `2px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px', fontWeight: '600' }}>FACTURES EN RETARD</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.danger }}>
            {overdueInvoices.length}
          </div>
          <div style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '6px' }}>
            Nécessitent une action urgente
          </div>
        </div>

        <div style={{
          background: colors.surface,
          padding: '24px',
          borderRadius: '16px',
          border: `2px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px', fontWeight: '600' }}>TRANCHES EN ATTENTE</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: colors.warning }}>
            {unpaidInvoices.reduce((sum, inv) => {
              return sum +
                (!inv.tranche_signature_paid ? 1 : 0) +
                (!inv.tranche_moitier_paid ? 1 : 0) +
                (!inv.tranche_fin_paid ? 1 : 0);
            }, 0)}
          </div>
          <div style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '6px' }}>
            Paiements à recevoir
          </div>
        </div>
      </div>

      {unpaidInvoices.length === 0 ? (
        <div style={{
          background: colors.surface,
          padding: '60px 20px',
          borderRadius: '20px',
          textAlign: 'center',
          border: `2px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.success, marginBottom: '8px' }}>
            Aucune facture impayée
          </div>
          <div style={{ fontSize: '15px', color: colors.textSecondary }}>
            Toutes vos factures sont à jour
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {unpaidInvoices.map(invoice => {
            const paidAmount = (invoice.tranche_signature_paid ? Number(invoice.tranche_signature_amount) : 0) +
                               (invoice.tranche_moitier_paid ? Number(invoice.tranche_moitier_amount) : 0) +
                               (invoice.tranche_fin_paid ? Number(invoice.tranche_fin_amount) : 0);
            const unpaidAmountBase = Number(invoice.amount) - paidAmount;

            const penalty = computePenalty(invoice);
            const isOverdue = penalty.isOverdue;
            const daysDiff = penalty.daysLate;

            const lateFee = penalty.penaltyAmount;
            const unpaidAmount = unpaidAmountBase + lateFee;
            const progressPercent = (paidAmount / Number(invoice.amount)) * 100;

            return (
              <div
                key={invoice.id}
                style={{
                  background: colors.surface,
                  padding: '24px',
                  borderRadius: '16px',
                  border: `3px solid ${isOverdue ? colors.danger : colors.warning}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setShowDetailModal(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 12px 32px ${isOverdue ? colors.danger : colors.warning}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.text, marginBottom: '8px' }}>
                      {invoice.invoice_number || `#${invoice.id.substring(0, 8)}`}
                    </div>
                    <div style={{ fontSize: '16px', color: colors.text, marginBottom: '6px' }}>
                      Client: <span style={{ fontWeight: '600' }}>{invoice.client_name}</span>
                    </div>
                    {invoice.project_title && (
                      <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                        Projet: {invoice.project_title}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '8px' }}>
                      Échéance: <span style={{ fontWeight: '600' }}>{safeDate(invoice.due_date)}</span>
                    </div>
                    {isOverdue && (
                      <div style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        background: colors.danger,
                        color: '#fff',
                      }}>
                        🔥 RETARD: {daysDiff} jour{daysDiff > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                  padding: '20px',
                  background: colors.background,
                  borderRadius: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px', fontWeight: '600' }}>MONTANT TOTAL</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
                      {safeLocale(Number(invoice.amount))} GNF
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px', fontWeight: '600' }}>PAYÉ</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.success }}>
                      {safeLocale(paidAmount)} GNF
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px', fontWeight: '600' }}>RESTE À PAYER</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.danger }}>
                      {safeLocale(unpaidAmount)} GNF
                    </div>
                    {isOverdue && lateFee > 0 && (
                      <div style={{ fontSize: '11px', color: colors.danger, marginTop: '4px', fontWeight: '600' }}>
                        + Penalite retard: {safeLocale(lateFee)} GNF ({penalty.penaltyPercent}%){penalty.weeksLate > 0 ? ` (2% + ${penalty.weeksLate}x5%)` : ' (2%)'}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, marginBottom: '12px' }}>
                    Tranches non payées:
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {!invoice.tranche_signature_paid && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px',
                        background: `${colors.danger}15`,
                        borderRadius: '10px',
                        border: `2px solid ${colors.danger}`,
                      }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
                            1️⃣ Signature ({invoice.tranche_signature_percent}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.danger }}>
                          {safeLocale(Number(invoice.tranche_signature_amount))} GNF
                        </div>
                      </div>
                    )}
                    {!invoice.tranche_moitier_paid && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px',
                        background: `${colors.danger}15`,
                        borderRadius: '10px',
                        border: `2px solid ${colors.danger}`,
                      }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
                            2️⃣ Mi-parcours ({invoice.tranche_moitier_percent}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.danger }}>
                          {safeLocale(Number(invoice.tranche_moitier_amount))} GNF
                        </div>
                      </div>
                    )}
                    {!invoice.tranche_fin_paid && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px',
                        background: `${colors.danger}15`,
                        borderRadius: '10px',
                        border: `2px solid ${colors.danger}`,
                      }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>
                            3️⃣ Fin de projet ({invoice.tranche_fin_percent}%)
                          </span>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.danger }}>
                          {safeLocale(Number(invoice.tranche_fin_amount))} GNF
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  height: '12px',
                  background: colors.border,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${colors.success}, ${colors.warning})`,
                    width: `${progressPercent}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>
                  {Math.round(progressPercent)}% payé
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDetailModal && selectedInvoice && (
        <div
          onClick={() => setShowDetailModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: `3px solid ${colors.danger}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.text, margin: 0 }}>
                Détails de la facture
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: colors.danger,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>Numéro:</span> {selectedInvoice.invoice_number || `#${selectedInvoice.id.substring(0, 8)}`}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>Client:</span> {selectedInvoice.client_name}
                </div>
                {selectedInvoice.project_title && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600' }}>Projet:</span> {selectedInvoice.project_title}
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>Échéance:</span> {safeDate(selectedInvoice.due_date)}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>Montant total:</span> {safeLocale(Number(selectedInvoice.amount))} GNF
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text, marginBottom: '16px' }}>
                  Tranches de paiement:
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {[
                    { key: 'signature', label: '1. Signature', percent: selectedInvoice.tranche_signature_percent, amount: selectedInvoice.tranche_signature_amount, paid: selectedInvoice.tranche_signature_paid },
                    { key: 'moitier', label: '2. Mi-parcours', percent: selectedInvoice.tranche_moitier_percent, amount: selectedInvoice.tranche_moitier_amount, paid: selectedInvoice.tranche_moitier_paid },
                    { key: 'fin', label: '3. Fin de projet', percent: selectedInvoice.tranche_fin_percent, amount: selectedInvoice.tranche_fin_amount, paid: selectedInvoice.tranche_fin_paid },
                  ].map((tranche) => (
                    <div
                      key={tranche.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: tranche.paid ? `${colors.success}15` : `${colors.danger}15`,
                        borderRadius: '12px',
                        border: `2px solid ${tranche.paid ? colors.success : colors.danger}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>
                          {tranche.label} ({tranche.percent}%)
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: tranche.paid ? colors.success : colors.danger }}>
                          {safeLocale(Number(tranche.amount))} GNF
                        </div>
                      </div>
                      <button
                        onClick={() => updateTranchePaid(selectedInvoice.id, tranche.key as 'signature' | 'moitier' | 'fin', !tranche.paid)}
                        style={{
                          padding: '8px 16px',
                          background: tranche.paid ? colors.success : colors.primary,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        {tranche.paid ? '✓ Payé' : 'Marquer payé'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
