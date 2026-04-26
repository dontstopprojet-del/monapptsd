import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { safeLocale, safeDate } from '../utils/safeFormat';

interface Quote {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address: string;
  description: string;
  urgency: string;
  status: string;
  tracking_number: string;
  created_at: string;
  updated_at: string;
  viewed_at: string | null;
  validity_date: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  response_notes: string | null;
  estimated_price: number | null;
  estimated_duration: string | null;
  assigned_to: string | null;
  last_reminded_at: string | null;
  reminder_count: number;
  archived_at: string | null;
  image_urls: string[] | null;
  chantier_id: string | null;
  chantier?: {
    title: string;
    status: string;
    scheduled_date: string | null;
  };
}

interface QuoteManagementProps {
  darkMode: boolean;
  userRole: string;
}

const QuoteManagement: React.FC<QuoteManagementProps> = ({ darkMode }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    response_notes: '',
    estimated_price: '',
    estimated_duration: '',
    validity_date: '',
  });

  useEffect(() => {
    fetchQuotes();

    const channel = supabase
      .channel('quote_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_requests' },
        () => {
          fetchQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quotes, filterStatus, searchTerm, showArchived]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      console.log('🔍 DEBUT fetchQuotes');

      const { data: { session } } = await supabase.auth.getSession();
      console.log('👤 Session:', session ? 'EXISTS' : 'NULL');
      console.log('📧 User email:', session?.user?.email);

      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          chantier:chantiers!quote_requests_chantier_id_fkey(
            title,
            status,
            scheduled_date
          )
        `)
        .order('created_at', { ascending: false });

      console.log('📊 Query result - data:', data);
      console.log('❌ Query result - error:', error);
      console.log('📈 Number of quotes:', data?.length || 0);

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('❗ Erreur chargement devis:', error);
    } finally {
      setLoading(false);
      console.log('✅ fetchQuotes TERMINE');
    }
  };

  const applyFilters = () => {
    let filtered = quotes;

    if (!showArchived) {
      filtered = filtered.filter(q => !q.archived_at);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => q.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.phone.includes(searchTerm)
      );
    }

    setFilteredQuotes(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      reviewing: '#3b82f6',
      quoted: '#8b5cf6',
      accepted: '#10b981',
      rejected: '#ef4444',
      expired: '#6b7280',
      completed: '#059669',
      archived: '#374151',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      reviewing: 'En cours d\'examen',
      quoted: 'Devis envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré',
      completed: 'Terminé',
      archived: 'Archivé',
    };
    return labels[status] || status;
  };

  const handleQuoteClick = async (quote: Quote) => {
    setSelectedQuote(quote);
    setEditMode(false);
    setEditData({
      status: quote.status || 'pending',
      response_notes: quote.response_notes || '',
      estimated_price: quote.estimated_price?.toString() || '',
      estimated_duration: quote.estimated_duration || '',
      validity_date: quote.validity_date || '',
    });

    if (!quote.viewed_at) {
      try {
        const { error } = await supabase
          .from('quote_requests')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', quote.id);

        if (error) {
          console.error('Error updating viewed_at:', error);
        } else {
          fetchQuotes();
        }
      } catch (error) {
        console.error('Error marking quote as viewed:', error);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedQuote) return;

    try {
      const updates: any = {
        status: editData.status,
        response_notes: editData.response_notes,
        estimated_duration: editData.estimated_duration,
        updated_at: new Date().toISOString(),
      };

      if (editData.estimated_price) {
        updates.estimated_price = parseFloat(editData.estimated_price);
      }

      if (editData.validity_date) {
        updates.validity_date = editData.validity_date;
      } else if (editData.status === 'quoted' && !selectedQuote.validity_date) {
        const validityDate = new Date();
        validityDate.setDate(validityDate.getDate() + 30);
        updates.validity_date = validityDate.toISOString();
      }

      const { error } = await supabase
        .from('quote_requests')
        .update(updates)
        .eq('id', selectedQuote.id);

      if (error) throw error;

      setEditMode(false);
      fetchQuotes();
      alert('Devis mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du devis');
    }
  };

  const handleArchive = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce devis ?')) return;

    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', quoteId);

      if (error) throw error;

      setSelectedQuote(null);
      fetchQuotes();
      alert('Devis archivé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
      alert('Erreur lors de l\'archivage du devis');
    }
  };

  const handleUnarchive = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ archived_at: null })
        .eq('id', quoteId);

      if (error) throw error;

      fetchQuotes();
      alert('Devis désarchivé avec succès');
    } catch (error) {
      console.error('Erreur lors du désarchivage:', error);
      alert('Erreur lors du désarchivage du devis');
    }
  };

  const handleSendReminder = async (quoteId: string) => {
    try {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      const { error } = await supabase
        .from('quote_requests')
        .update({
          last_reminded_at: new Date().toISOString(),
          reminder_count: (quote.reminder_count || 0) + 1,
        })
        .eq('id', quoteId);

      if (error) throw error;

      fetchQuotes();
      alert('Rappel envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rappel:', error);
      alert('Erreur lors de l\'envoi du rappel');
    }
  };

  const handleGenerateInvoice = async (quoteId: string) => {
    if (!confirm('Voulez-vous générer une facture pour ce devis accepté ?')) return;

    try {
      const { error } = await supabase.rpc('generate_invoice_from_quote', {
        p_quote_id: quoteId
      });

      if (error) throw error;

      alert('Facture générée avec succès! Vous pouvez la consulter dans la section Factures.');
      fetchQuotes();
    } catch (error: any) {
      console.error('Erreur lors de la génération de la facture:', error);
      if (error.message.includes('existe déjà')) {
        alert('Une facture existe déjà pour ce devis.');
      } else if (error.message.includes('non accepté')) {
        alert('Le devis doit être accepté pour générer une facture.');
      } else {
        alert('Erreur lors de la génération de la facture: ' + error.message);
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (validityDate: string | null) => {
    if (!validityDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(validityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  };

  const bgColor = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#0f172a';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textColor }}>
        Chargement des devis...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: textColor }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '10px' }}>
          Gestion des Devis
        </h2>
        <p style={{ color: darkMode ? '#94a3b8' : '#64748b', fontSize: '14px' }}>
          {filteredQuotes.length === quotes.length ? (
            <>Total: {quotes.length} devis</>
          ) : (
            <>Affichage: {filteredQuotes.length} sur {quotes.length} devis</>
          )}
        </p>
      </div>

      <div style={{
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone, numéro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            minWidth: '250px',
            padding: '10px 16px',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            background: bgColor,
            color: textColor,
            fontSize: '14px',
          }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 16px',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            background: bgColor,
            color: textColor,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="reviewing">En cours d'examen</option>
          <option value="quoted">Devis envoyé</option>
          <option value="accepted">Accepté</option>
          <option value="rejected">Refusé</option>
          <option value="expired">Expiré</option>
          <option value="completed">Terminé</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Afficher archivés
        </label>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1',
          minWidth: '300px',
          maxHeight: '700px',
          overflowY: 'auto',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
        }}>
          {filteredQuotes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                opacity: 0.5
              }}>
                📋
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: darkMode ? '#94a3b8' : '#64748b',
                marginBottom: '8px'
              }}>
                {quotes.length === 0 ? 'Aucun devis en attente' : 'Aucun devis ne correspond aux filtres'}
              </div>
              <div style={{
                fontSize: '14px',
                color: darkMode ? '#64748b' : '#94a3b8'
              }}>
                {quotes.length === 0 ? 'Les nouvelles demandes de devis apparaîtront ici' : 'Essayez de modifier vos critères de recherche'}
              </div>
            </div>
          ) : (
            filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => handleQuoteClick(quote)}
                style={{
                  padding: '16px',
                  marginBottom: '12px',
                  background: selectedQuote?.id === quote.id
                    ? (darkMode ? '#334155' : '#f1f5f9')
                    : 'transparent',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedQuote?.id !== quote.id) {
                    e.currentTarget.style.background = darkMode ? '#1e293b' : '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedQuote?.id !== quote.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                      {quote.name}
                    </div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b' }}>
                      {quote.tracking_number}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: getStatusColor(quote.status),
                    color: '#ffffff',
                  }}>
                    {getStatusLabel(quote.status)}
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: darkMode ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                  {quote.service_type}
                </div>

                <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b' }}>
                  {formatDate(quote.created_at)}
                </div>

                {quote.viewed_at && !quote.accepted_at && !quote.rejected_at && (
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: darkMode ? '#1e40af' : '#dbeafe',
                    color: darkMode ? '#93c5fd' : '#1e40af',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    ✓ Consulté
                  </div>
                )}

                {isExpiringSoon(quote.validity_date) && quote.status === 'quoted' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: darkMode ? '#92400e' : '#fef3c7',
                    color: darkMode ? '#fbbf24' : '#92400e',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    ⚠ Expire bientôt
                  </div>
                )}

                {quote.chantier_id && quote.chantier && (
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: darkMode ? '#065f46' : '#d1fae5',
                    color: darkMode ? '#34d399' : '#065f46',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}>
                    📅 Dans le planning
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {selectedQuote && (
          <div style={{
            flex: '1.5',
            minWidth: '400px',
            maxHeight: '700px',
            overflowY: 'auto',
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>
                Détails du devis
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editMode && !selectedQuote.archived_at && (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Modifier
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{
                padding: '12px',
                background: getStatusColor(selectedQuote.status),
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                {getStatusLabel(selectedQuote.status)}
              </div>

              {editMode ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Statut
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      background: bgColor,
                      color: textColor,
                      fontSize: '14px',
                    }}
                  >
                    <option value="pending">En attente</option>
                    <option value="reviewing">En cours d'examen</option>
                    <option value="quoted">Devis envoyé</option>
                    <option value="accepted">Accepté</option>
                    <option value="rejected">Refusé</option>
                    <option value="expired">Expiré</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>
              ) : null}

              <InfoRow label="Numéro de suivi" value={selectedQuote.tracking_number} darkMode={darkMode} />
              <InfoRow label="Client" value={selectedQuote.name} darkMode={darkMode} />
              <InfoRow label="Email" value={selectedQuote.email} darkMode={darkMode} />
              <InfoRow label="Téléphone" value={selectedQuote.phone} darkMode={darkMode} />
              <InfoRow label="Service" value={selectedQuote.service_type} darkMode={darkMode} />
              <InfoRow label="Urgence" value={selectedQuote.urgency || 'Normal'} darkMode={darkMode} />
              <InfoRow label="Adresse" value={selectedQuote.address} darkMode={darkMode} />
              <InfoRow label="Date de création" value={formatDate(selectedQuote.created_at)} darkMode={darkMode} />
              <InfoRow label="Dernière mise à jour" value={formatDate(selectedQuote.updated_at)} darkMode={darkMode} />

              {selectedQuote.viewed_at && (
                <InfoRow label="Consulté le" value={formatDate(selectedQuote.viewed_at)} darkMode={darkMode} highlight="#3b82f6" />
              )}

              {selectedQuote.validity_date && (
                <InfoRow label="Date de validité" value={formatDate(selectedQuote.validity_date)} darkMode={darkMode} />
              )}

              {selectedQuote.accepted_at && (
                <InfoRow label="Accepté le" value={formatDate(selectedQuote.accepted_at)} darkMode={darkMode} highlight="#10b981" />
              )}

              {selectedQuote.rejected_at && (
                <InfoRow label="Refusé le" value={formatDate(selectedQuote.rejected_at)} darkMode={darkMode} highlight="#ef4444" />
              )}

              {selectedQuote.last_reminded_at && (
                <InfoRow
                  label={`Dernier rappel (${selectedQuote.reminder_count})`}
                  value={formatDate(selectedQuote.last_reminded_at)}
                  darkMode={darkMode}
                />
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                Description
              </h4>
              <div style={{
                padding: '12px',
                background: darkMode ? '#0f172a' : '#f8fafc',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.6',
              }}>
                {selectedQuote.description}
              </div>
            </div>

            {editMode ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Réponse / Notes
                  </label>
                  <textarea
                    value={editData.response_notes}
                    onChange={(e) => setEditData({ ...editData, response_notes: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      background: bgColor,
                      color: textColor,
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                    placeholder="Ajoutez vos notes ou votre réponse au client..."
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Prix estimé (GNF)
                  </label>
                  <input
                    type="number"
                    value={editData.estimated_price}
                    onChange={(e) => setEditData({ ...editData, estimated_price: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      background: bgColor,
                      color: textColor,
                      fontSize: '14px',
                    }}
                    placeholder="ex: 500000"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Durée estimée
                  </label>
                  <input
                    type="text"
                    value={editData.estimated_duration}
                    onChange={(e) => setEditData({ ...editData, estimated_duration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      background: bgColor,
                      color: textColor,
                      fontSize: '14px',
                    }}
                    placeholder="ex: 2-3 jours"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                    Date de validité
                  </label>
                  <input
                    type="datetime-local"
                    value={editData.validity_date ? new Date(editData.validity_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditData({ ...editData, validity_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '6px',
                      background: bgColor,
                      color: textColor,
                      fontSize: '14px',
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                {selectedQuote.response_notes && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                      Réponse / Notes
                    </h4>
                    <div style={{
                      padding: '12px',
                      background: darkMode ? '#0f172a' : '#f8fafc',
                      borderRadius: '6px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}>
                      {selectedQuote.response_notes}
                    </div>
                  </div>
                )}

                {selectedQuote.estimated_price && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                      Prix estimé
                    </h4>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                      {safeLocale(selectedQuote.estimated_price)} GNF
                    </div>
                  </div>
                )}

                {selectedQuote.estimated_duration && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                      Durée estimée
                    </h4>
                    <div style={{ fontSize: '16px' }}>
                      {selectedQuote.estimated_duration}
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedQuote.chantier_id && selectedQuote.chantier && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: darkMode ? '#065f46' : '#d1fae5',
                borderRadius: '8px',
                border: `2px solid ${darkMode ? '#059669' : '#10b981'}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>📅</span>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: darkMode ? '#34d399' : '#065f46',
                  }}>
                    Chantier créé dans le planning
                  </h4>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: darkMode ? '#d1fae5' : '#047857',
                  marginBottom: '8px',
                }}>
                  <strong>Titre:</strong> {selectedQuote.chantier.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: darkMode ? '#d1fae5' : '#047857',
                  marginBottom: '8px',
                }}>
                  <strong>Statut:</strong> {selectedQuote.chantier.status === 'planned' ? 'Planifié' : selectedQuote.chantier.status}
                </div>
                {selectedQuote.chantier.scheduled_date && (
                  <div style={{
                    fontSize: '14px',
                    color: darkMode ? '#d1fae5' : '#047857',
                  }}>
                    <strong>Date prévue:</strong> {safeDate(selectedQuote.chantier.scheduled_date)}
                  </div>
                )}
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: darkMode ? '#047857' : '#10b981',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  ✓ Ce devis a été automatiquement ajouté au planning
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {!selectedQuote.archived_at && selectedQuote.status === 'quoted' && (
                <button
                  onClick={() => handleSendReminder(selectedQuote.id)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '10px 16px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Envoyer un rappel
                </button>
              )}

              {!selectedQuote.archived_at && selectedQuote.status === 'accepted' && selectedQuote.estimated_price && (
                <button
                  onClick={() => handleGenerateInvoice(selectedQuote.id)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  Générer Facture
                </button>
              )}

              {!selectedQuote.archived_at ? (
                <button
                  onClick={() => handleArchive(selectedQuote.id)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '10px 16px',
                    background: '#6b7280',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Archiver
                </button>
              ) : (
                <button
                  onClick={() => handleUnarchive(selectedQuote.id)}
                  style={{
                    flex: '1',
                    minWidth: '150px',
                    padding: '10px 16px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Désarchiver
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  label: string;
  value: string;
  darkMode: boolean;
  highlight?: string;
}> = ({ label, value, darkMode, highlight }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
    fontSize: '14px',
  }}>
    <span style={{ color: darkMode ? '#94a3b8' : '#64748b', fontWeight: '500' }}>
      {label}
    </span>
    <span style={{
      fontWeight: '600',
      textAlign: 'right',
      color: highlight || (darkMode ? '#f1f5f9' : '#0f172a'),
    }}>
      {value}
    </span>
  </div>
);

export default QuoteManagement;
