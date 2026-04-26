interface PlanningModalProps {
  show: boolean;
  planningForm: {
    client: string;
    type: string;
    heure: string;
    lieu: string;
    jour: number;
  };
  editingPlanning: any;
  lang: string;
  C: any;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: any) => void;
}

const PlanningModal = ({
  show,
  planningForm,
  editingPlanning,
  lang,
  C,
  onClose,
  onSave,
  onChange
}: PlanningModalProps) => {
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
              {editingPlanning
                ? lang === 'fr'
                  ? 'Modifier RDV'
                  : 'Edit appointment'
                : lang === 'fr'
                ? 'Nouveau RDV'
                : 'New appointment'}
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
              value={planningForm.client}
              onChange={(e) => onChange({ ...planningForm, client: e.target.value })}
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
              {lang === 'fr' ? "Type d'intervention" : 'Intervention type'}
            </label>
            <select
              value={planningForm.type}
              onChange={(e) => onChange({ ...planningForm, type: e.target.value })}
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
              <option value="Installation">Installation</option>
              <option value="Reparation">{lang === 'fr' ? 'Reparation' : 'Repair'}</option>
              <option value="Depannage">{lang === 'fr' ? 'Depannage' : 'Emergency'}</option>
              <option value="Entretien">{lang === 'fr' ? 'Entretien' : 'Maintenance'}</option>
              <option value="Devis">{lang === 'fr' ? 'Devis' : 'Quote'}</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
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
                {lang === 'fr' ? 'Heure' : 'Time'}
              </label>
              <input
                type="time"
                value={planningForm.heure}
                onChange={(e) => onChange({ ...planningForm, heure: e.target.value })}
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
                {lang === 'fr' ? 'Jour' : 'Day'}
              </label>
              <select
                value={planningForm.jour}
                onChange={(e) => onChange({ ...planningForm, jour: Number(e.target.value) })}
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
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const date = new Date();
                  date.setDate(date.getDate() + d);
                  return (
                    <option key={d} value={d}>
                      {date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: C.text,
                marginBottom: '6px'
              }}
            >
              {lang === 'fr' ? 'Lieu/Adresse' : 'Location/Address'} *
            </label>
            <input
              type="text"
              value={planningForm.lieu}
              onChange={(e) => onChange({ ...planningForm, lieu: e.target.value })}
              placeholder={lang === 'fr' ? 'Adresse complete' : 'Full address'}
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
              disabled={!planningForm.client || !planningForm.lieu}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderRadius: '12px',
                background:
                  !planningForm.client || !planningForm.lieu
                    ? C.light
                    : `linear-gradient(135deg,${C.primary},${C.secondary})`,
                color: !planningForm.client || !planningForm.lieu ? C.textSecondary : '#FFF',
                fontWeight: '600',
                cursor: !planningForm.client || !planningForm.lieu ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {editingPlanning ? (lang === 'fr' ? 'Enregistrer' : 'Save') : lang === 'fr' ? 'Ajouter' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningModal;
