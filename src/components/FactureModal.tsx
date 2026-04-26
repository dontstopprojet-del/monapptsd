interface FactureModalProps {
  show: boolean;
  factureForm: {
    client: string;
    montant: string;
    statut: string;
    date: string;
  };
  editingFacture: any;
  lang: string;
  C: any;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: any) => void;
}

const FactureModal = ({
  show,
  factureForm,
  editingFacture,
  lang,
  C,
  onClose,
  onSave,
  onChange
}: FactureModalProps) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 400,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: '20px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg,${C.primary},${C.secondary})`,
            padding: '20px',
            borderRadius: '20px 20px 0 0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#FFF', margin: 0, fontSize: '16px' }}>
              {editingFacture
                ? lang === 'fr'
                  ? 'Modifier facture'
                  : 'Edit invoice'
                : lang === 'fr'
                ? 'Nouvelle facture'
                : 'New invoice'}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#FFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              X
            </button>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: C.text,
                marginBottom: '6px'
              }}
            >
              {lang === 'fr' ? 'Client' : 'Client'} *
            </label>
            <input
              type="text"
              value={factureForm.client}
              onChange={(e) => onChange({ ...factureForm, client: e.target.value })}
              placeholder={lang === 'fr' ? 'Nom du client' : 'Client name'}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: `2px solid ${C.light}`,
                borderRadius: '10px',
                fontSize: '14px',
                background: C.bg,
                color: C.text,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: C.text,
                marginBottom: '6px'
              }}
            >
              {lang === 'fr' ? 'Montant (GNF)' : 'Amount (GNF)'} *
            </label>
            <input
              type="number"
              value={factureForm.montant}
              onChange={(e) => onChange({ ...factureForm, montant: e.target.value })}
              placeholder="0"
              min="0"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: `2px solid ${C.light}`,
                borderRadius: '10px',
                fontSize: '14px',
                background: C.bg,
                color: C.text,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: C.text,
                  marginBottom: '6px'
                }}
              >
                {lang === 'fr' ? 'Date' : 'Date'} *
              </label>
              <input
                type="date"
                value={factureForm.date}
                onChange={(e) => onChange({ ...factureForm, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: `2px solid ${C.light}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: C.bg,
                  color: C.text,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: C.text,
                  marginBottom: '6px'
                }}
              >
                {lang === 'fr' ? 'Statut' : 'Status'}
              </label>
              <select
                value={factureForm.statut}
                onChange={(e) => onChange({ ...factureForm, statut: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: `2px solid ${C.light}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  background: C.bg,
                  color: C.text,
                  boxSizing: 'border-box'
                }}
              >
                <option value="En attente">{lang === 'fr' ? 'En attente' : 'Pending'}</option>
                <option value="Payee">{lang === 'fr' ? 'Payee' : 'Paid'}</option>
                <option value="En retard">{lang === 'fr' ? 'En retard' : 'Overdue'}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                border: `2px solid ${C.light}`,
                borderRadius: '12px',
                background: 'transparent',
                color: C.text,
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={onSave}
              disabled={!factureForm.client || !factureForm.montant || !factureForm.date}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderRadius: '12px',
                background:
                  !factureForm.client || !factureForm.montant || !factureForm.date
                    ? C.light
                    : `linear-gradient(135deg,${C.primary},${C.secondary})`,
                color:
                  !factureForm.client || !factureForm.montant || !factureForm.date
                    ? C.textSecondary
                    : '#FFF',
                fontWeight: '600',
                cursor:
                  !factureForm.client || !factureForm.montant || !factureForm.date
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '14px'
              }}
            >
              {editingFacture ? (lang === 'fr' ? 'Enregistrer' : 'Save') : lang === 'fr' ? 'Ajouter' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactureModal;
