import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale, safeDate } from '../utils/safeFormat';

interface ClientInvoicesScreenProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  colors: any;
  onBack: () => void;
  Nav: () => JSX.Element;
}

export default function ClientInvoicesScreen({ currentUser, lang, colors: C, onBack, Nav }: ClientInvoicesScreenProps) {
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  useEffect(() => {
    const loadClientInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', currentUser?.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClientInvoices(data || []);
      } catch (error) {
        console.error('Error loading invoices:', error);
      }
    };

    if (currentUser) {
      loadClientInvoices();
    }

    const channel = supabase
      .channel('client_invoices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `client_id=eq.${currentUser?.id}`,
        },
        () => {
          loadClientInvoices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleProofUpload = async (file: File, tranche: 'signature' | 'moitier' | 'fin') => {
    if (!selectedInvoice || !file) return;

    setUploadingProof(tranche);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedInvoice.id}_${tranche}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const columnName = `tranche_${tranche}_proof_url`;
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ [columnName]: publicUrl })
        .eq('id', selectedInvoice.id);

      if (updateError) throw updateError;

      alert(lang === 'fr' ? 'Preuve de paiement envoyée avec succès !' : lang === 'en' ? 'Payment proof uploaded successfully!' : 'تم تحميل إثبات الدفع بنجاح!');

      setSelectedInvoice({ ...selectedInvoice, [columnName]: publicUrl });

      const updatedInvoices = clientInvoices.map(inv =>
        inv.id === selectedInvoice.id ? { ...inv, [columnName]: publicUrl } : inv
      );
      setClientInvoices(updatedInvoices);
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert(lang === 'fr' ? 'Erreur lors de l\'envoi de la preuve' : lang === 'en' ? 'Error uploading proof' : 'خطأ في تحميل الإثبات');
    } finally {
      setUploadingProof(null);
    }
  };

  return (
    <div style={{ height: '100%', background: C.gray, overflow: 'auto', paddingBottom: '80px' }}>
      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})`, padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#FFF' }}>←</button>
        <h2 style={{ color: '#FFF', fontSize: '18px', margin: 0, flex: 1 }}>💰 {lang === 'fr' ? 'Mes Factures' : lang === 'en' ? 'My Invoices' : 'فواتيري'}</h2>
      </div>
      <div style={{ padding: '15px' }}>
        {clientInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '64px' }}>💰</span>
            <p style={{ marginTop: '20px', color: C.textSecondary, fontSize: '16px', fontWeight: '600' }}>
              {lang === 'fr' ? 'Aucune facture disponible' : lang === 'en' ? 'No invoices available' : 'لا توجد فواتير'}
            </p>
            <p style={{ marginTop: '8px', color: C.textSecondary, fontSize: '13px' }}>
              {lang === 'fr' ? 'Vos factures apparaîtront ici' : lang === 'en' ? 'Your invoices will appear here' : 'ستظهر فواتيرك هنا'}
            </p>
          </div>
        ) : (
          clientInvoices.map((invoice) => {
            const statusColor = invoice.status === 'Payee' ? C.success : invoice.status === 'En retard' ? C.danger : C.warning;
            const statusLabel = invoice.status === 'Payee' ? (lang === 'fr' ? 'Payée' : lang === 'en' ? 'Paid' : 'مدفوع') : invoice.status === 'En retard' ? (lang === 'fr' ? 'En retard' : lang === 'en' ? 'Overdue' : 'متأخر') : (lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'قيد الانتظار');

            return (
              <div key={invoice.id} onClick={() => { setSelectedInvoice(invoice); setShowInvoiceDetail(true); }} style={{ background: C.card, borderRadius: '16px', padding: '18px', marginBottom: '12px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '24px' }}>💰</span>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.text }}>
                        {lang === 'fr' ? 'Facture' : 'Invoice'} N° {invoice.invoice_number}
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary }}>
                      {safeDate(invoice.created_at, lang)}
                    </p>
                  </div>
                  <span style={{ background: `${statusColor}20`, color: statusColor, padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                    {statusLabel}
                  </span>
                </div>
                <div style={{ background: C.light, borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Montant' : 'Amount'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: C.primary }}>
                    {safeLocale(invoice.amount)} <span style={{ fontSize: '14px', fontWeight: '600' }}>GNF</span>
                  </div>
                </div>
                {invoice.project_title && (
                  <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '8px' }}>
                    🏗️ {invoice.project_title}
                  </div>
                )}
                {invoice.due_date && (
                  <div style={{ fontSize: '12px', color: C.textSecondary }}>
                    📅 {lang === 'fr' ? 'Échéance' : 'Due'}: {safeDate(invoice.due_date, lang)}
                  </div>
                )}
                <div style={{ marginTop: '12px', textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', color: C.primary, fontWeight: '600' }}>
                    {lang === 'fr' ? 'Voir les détails' : 'View details'} →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {showInvoiceDetail && selectedInvoice && <div onClick={() => setShowInvoiceDetail(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, padding: '15px', overflow: 'auto' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: '24px', padding: '0', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#FFF' }}>
                💰 {lang === 'fr' ? 'Facture' : 'Invoice'} N° {selectedInvoice.invoice_number}
              </h3>
              <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                {safeDate(selectedInvoice.created_at, lang)}
              </p>
            </div>
            <button onClick={() => setShowInvoiceDetail(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: '#FFF', fontSize: '16px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px', maxHeight: 'calc(90vh - 160px)', overflow: 'auto' }}>
            <div style={{ background: C.light, borderRadius: '16px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '8px' }}>
                {lang === 'fr' ? 'Montant Total' : 'Total Amount'}
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: C.primary }}>
                {safeLocale(selectedInvoice.amount)} <span style={{ fontSize: '18px' }}>GNF</span>
              </div>
            </div>
            {selectedInvoice.project_title && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                  {lang === 'fr' ? 'Projet' : 'Project'}
                </div>
                <div style={{ fontSize: '15px', color: C.text }}>
                  🏗️ {selectedInvoice.project_title}
                </div>
              </div>
            )}
            {selectedInvoice.due_date && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                  {lang === 'fr' ? 'Date d\'échéance' : 'Due Date'}
                </div>
                <div style={{ fontSize: '15px', color: C.text }}>
                  📅 {safeDate(selectedInvoice.due_date, lang)}
                </div>
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text, marginBottom: '12px' }}>
                {lang === 'fr' ? 'Tranches de paiement' : 'Payment Tranches'}
              </div>
              {selectedInvoice.tranche_signature_percent && (
                <div style={{ background: C.light, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>
                        1️⃣ {lang === 'fr' ? 'À la signature' : lang === 'en' ? 'At signature' : 'عند التوقيع'} ({selectedInvoice.tranche_signature_percent}%)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: C.primary }}>
                        {safeLocale(selectedInvoice.tranche_signature_amount)} GNF
                      </div>
                    </div>
                    {selectedInvoice.tranche_signature_paid ? (
                      <span style={{ background: `${C.success}20`, color: C.success, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        ✓ {lang === 'fr' ? 'Payée' : lang === 'en' ? 'Paid' : 'مدفوع'}
                      </span>
                    ) : (
                      <span style={{ background: `${C.warning}20`, color: C.warning, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'قيد الانتظار'}
                      </span>
                    )}
                  </div>
                  {!selectedInvoice.tranche_signature_paid && (
                    <div>
                      <input type="file" accept="image/*" id="proof-signature" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { handleProofUpload(e.target.files[0], 'signature') } }} />
                      <button onClick={() => document.getElementById('proof-signature')?.click()} disabled={uploadingProof === 'signature'} style={{ width: '100%', padding: '10px', background: selectedInvoice.tranche_signature_proof_url ? `${C.success}20` : `${C.secondary}20`, color: selectedInvoice.tranche_signature_proof_url ? C.success : C.secondary, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: uploadingProof === 'signature' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {uploadingProof === 'signature' ? (lang === 'fr' ? 'Envoi...' : lang === 'en' ? 'Uploading...' : 'جاري التحميل...') : selectedInvoice.tranche_signature_proof_url ? (lang === 'fr' ? '✓ Preuve envoyée - Modifier' : lang === 'en' ? '✓ Proof sent - Change' : '✓ تم إرسال الإثبات - تغيير') : (lang === 'fr' ? '📤 Envoyer preuve de paiement' : lang === 'en' ? '📤 Upload payment proof' : '📤 تحميل إثبات الدفع')}
                      </button>
                      {selectedInvoice.tranche_signature_proof_url && (
                        <a href={selectedInvoice.tranche_signature_proof_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '8px', textAlign: 'center', fontSize: '12px', color: C.secondary, textDecoration: 'none' }}>
                          {lang === 'fr' ? 'Voir la preuve envoyée' : lang === 'en' ? 'View uploaded proof' : 'عرض الإثبات المحمل'} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              {selectedInvoice.tranche_moitier_percent && (
                <div style={{ background: C.light, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>
                        2️⃣ {lang === 'fr' ? 'À mi-parcours' : lang === 'en' ? 'At midpoint' : 'في منتصف الطريق'} ({selectedInvoice.tranche_moitier_percent}%)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: C.primary }}>
                        {safeLocale(selectedInvoice.tranche_moitier_amount)} GNF
                      </div>
                    </div>
                    {selectedInvoice.tranche_moitier_paid ? (
                      <span style={{ background: `${C.success}20`, color: C.success, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        ✓ {lang === 'fr' ? 'Payée' : lang === 'en' ? 'Paid' : 'مدفوع'}
                      </span>
                    ) : (
                      <span style={{ background: `${C.warning}20`, color: C.warning, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'قيد الانتظار'}
                      </span>
                    )}
                  </div>
                  {!selectedInvoice.tranche_moitier_paid && (
                    <div>
                      <input type="file" accept="image/*" id="proof-moitier" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { handleProofUpload(e.target.files[0], 'moitier') } }} />
                      <button onClick={() => document.getElementById('proof-moitier')?.click()} disabled={uploadingProof === 'moitier'} style={{ width: '100%', padding: '10px', background: selectedInvoice.tranche_moitier_proof_url ? `${C.success}20` : `${C.secondary}20`, color: selectedInvoice.tranche_moitier_proof_url ? C.success : C.secondary, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: uploadingProof === 'moitier' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {uploadingProof === 'moitier' ? (lang === 'fr' ? 'Envoi...' : lang === 'en' ? 'Uploading...' : 'جاري التحميل...') : selectedInvoice.tranche_moitier_proof_url ? (lang === 'fr' ? '✓ Preuve envoyée - Modifier' : lang === 'en' ? '✓ Proof sent - Change' : '✓ تم إرسال الإثبات - تغيير') : (lang === 'fr' ? '📤 Envoyer preuve de paiement' : lang === 'en' ? '📤 Upload payment proof' : '📤 تحميل إثبات الدفع')}
                      </button>
                      {selectedInvoice.tranche_moitier_proof_url && (
                        <a href={selectedInvoice.tranche_moitier_proof_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '8px', textAlign: 'center', fontSize: '12px', color: C.secondary, textDecoration: 'none' }}>
                          {lang === 'fr' ? 'Voir la preuve envoyée' : lang === 'en' ? 'View uploaded proof' : 'عرض الإثبات المحمل'} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              {selectedInvoice.tranche_fin_percent && (
                <div style={{ background: C.light, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>
                        3️⃣ {lang === 'fr' ? 'À la fin' : lang === 'en' ? 'At completion' : 'عند الانتهاء'} ({selectedInvoice.tranche_fin_percent}%)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: C.primary }}>
                        {safeLocale(selectedInvoice.tranche_fin_amount)} GNF
                      </div>
                    </div>
                    {selectedInvoice.tranche_fin_paid ? (
                      <span style={{ background: `${C.success}20`, color: C.success, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        ✓ {lang === 'fr' ? 'Payée' : lang === 'en' ? 'Paid' : 'مدفوع'}
                      </span>
                    ) : (
                      <span style={{ background: `${C.warning}20`, color: C.warning, padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'قيد الانتظار'}
                      </span>
                    )}
                  </div>
                  {!selectedInvoice.tranche_fin_paid && (
                    <div>
                      <input type="file" accept="image/*" id="proof-fin" style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { handleProofUpload(e.target.files[0], 'fin') } }} />
                      <button onClick={() => document.getElementById('proof-fin')?.click()} disabled={uploadingProof === 'fin'} style={{ width: '100%', padding: '10px', background: selectedInvoice.tranche_fin_proof_url ? `${C.success}20` : `${C.secondary}20`, color: selectedInvoice.tranche_fin_proof_url ? C.success : C.secondary, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: uploadingProof === 'fin' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {uploadingProof === 'fin' ? (lang === 'fr' ? 'Envoi...' : lang === 'en' ? 'Uploading...' : 'جاري التحميل...') : selectedInvoice.tranche_fin_proof_url ? (lang === 'fr' ? '✓ Preuve envoyée - Modifier' : lang === 'en' ? '✓ Proof sent - Change' : '✓ تم إرسال الإثبات - تغيير') : (lang === 'fr' ? '📤 Envoyer preuve de paiement' : lang === 'en' ? '📤 Upload payment proof' : '📤 تحميل إثبات الدفع')}
                      </button>
                      {selectedInvoice.tranche_fin_proof_url && (
                        <a href={selectedInvoice.tranche_fin_proof_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '8px', textAlign: 'center', fontSize: '12px', color: C.secondary, textDecoration: 'none' }}>
                          {lang === 'fr' ? 'Voir la preuve envoyée' : lang === 'en' ? 'View uploaded proof' : 'عرض الإثبات المحمل'} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedInvoice.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '6px', fontWeight: '600' }}>
                  {lang === 'fr' ? 'Notes' : 'Notes'}
                </div>
                <div style={{ fontSize: '13px', color: C.text, lineHeight: '1.6', background: C.light, padding: '12px', borderRadius: '12px' }}>
                  {selectedInvoice.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}
      <Nav />
    </div>
  );
}
