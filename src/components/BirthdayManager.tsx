import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BirthdayManagerProps {
  userId: string;
  colors: any;
  onBack: () => void;
}

interface Birthday {
  id: string;
  person_name: string;
  birthday_date: string;
  relationship: 'personal' | 'colleague' | 'admin';
}

export default function BirthdayManager({ userId, colors, onBack }: BirthdayManagerProps) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    person_name: '',
    birthday_date: '',
    relationship: 'colleague' as 'personal' | 'colleague' | 'admin'
  });

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .eq('user_id', userId)
        .order('birthday_date', { ascending: true });

      if (!error && data) {
        setBirthdays(data);
      }
    } catch (err) {
      console.error('Error loading birthdays:', err);
    }
  };

  const handleAddBirthday = async () => {
    if (!formData.person_name.trim() || !formData.birthday_date) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase
        .from('birthdays')
        .insert({
          user_id: userId,
          person_name: formData.person_name,
          birthday_date: formData.birthday_date,
          relationship: formData.relationship
        });

      if (!error) {
        setFormData({
          person_name: '',
          birthday_date: '',
          relationship: 'colleague'
        });
        setShowForm(false);
        await loadBirthdays();
      }
    } catch (err) {
      console.error('Error adding birthday:', err);
    }
  };

  const handleDeleteBirthday = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet anniversaire ?')) return;

    try {
      const { error } = await supabase
        .from('birthdays')
        .delete()
        .eq('id', id);

      if (!error) {
        await loadBirthdays();
      }
    } catch (err) {
      console.error('Error deleting birthday:', err);
    }
  };

  const calculateDaysUntil = (dateStr: string): number => {
    const today = new Date();
    const birthday = new Date(dateStr);
    const currentYear = today.getFullYear();

    const nextBirthday = new Date(currentYear, birthday.getMonth(), birthday.getDate());

    if (nextBirthday < today) {
      nextBirthday.setFullYear(currentYear + 1);
    }

    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getRelationshipEmoji = (relationship: string): string => {
    switch (relationship) {
      case 'personal': return '👤';
      case 'colleague': return '👥';
      case 'admin': return '👔';
      default: return '🎂';
    }
  };

  const getRelationshipLabel = (relationship: string): string => {
    switch (relationship) {
      case 'personal': return 'Personnel';
      case 'colleague': return 'Collègue';
      case 'admin': return 'Admin';
      default: return '';
    }
  };

  const upcomingBirthdays = birthdays
    .map(b => ({ ...b, daysUntil: calculateDaysUntil(b.birthday_date) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      paddingBottom: '80px'
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        padding: '20px',
        color: '#FFF',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#FFF',
            fontSize: '24px',
            cursor: 'pointer',
            borderRadius: '8px',
            padding: '8px 15px',
            marginBottom: '15px'
          }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0, fontSize: '22px' }}>🎂 Anniversaires</h2>
        <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
          Gérez vos dates importantes
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: colors.primary,
            color: '#FFF',
            border: 'none',
            borderRadius: '12px',
            padding: '15px',
            width: '100%',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          {showForm ? '❌ Annuler' : '➕ Ajouter un anniversaire'}
        </button>

        {showForm && (
          <div style={{
            background: '#FFF',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ color: colors.primary, marginBottom: '15px' }}>
              Nouvel Anniversaire
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: colors.text,
                fontSize: '14px'
              }}>
                Nom de la personne
              </label>
              <input
                type="text"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Ex: Jean Dupont"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.background}`,
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: colors.text,
                fontSize: '14px'
              }}>
                Date d'anniversaire
              </label>
              <input
                type="date"
                value={formData.birthday_date}
                onChange={(e) => setFormData({ ...formData, birthday_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.background}`,
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: colors.text,
                fontSize: '14px'
              }}>
                Catégorie
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `2px solid ${colors.background}`,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <option value="personal">👤 Personnel</option>
                <option value="colleague">👥 Collègue</option>
                <option value="admin">👔 Admin</option>
              </select>
            </div>

            <button
              onClick={handleAddBirthday}
              style={{
                background: colors.success,
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                width: '100%',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ✅ Enregistrer
            </button>
          </div>
        )}

        <div style={{
          background: '#FFF',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ color: colors.primary, marginBottom: '15px' }}>
            🗓️ Prochains Anniversaires
          </h3>

          {upcomingBirthdays.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: colors.textLight,
              fontSize: '14px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎂</div>
              <p>Aucun anniversaire enregistré</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingBirthdays.map((birthday) => {
                const isToday = birthday.daysUntil === 0;
                const isSoon = birthday.daysUntil <= 7 && birthday.daysUntil > 0;

                return (
                  <div
                    key={birthday.id}
                    style={{
                      background: isToday ? colors.success + '20' : isSoon ? colors.warning + '20' : colors.background,
                      border: isToday ? `2px solid ${colors.success}` : isSoon ? `2px solid ${colors.warning}` : 'none',
                      borderRadius: '12px',
                      padding: '15px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '5px'
                      }}>
                        <span style={{ fontSize: '20px' }}>
                          {getRelationshipEmoji(birthday.relationship)}
                        </span>
                        <span style={{
                          fontWeight: 'bold',
                          color: colors.text,
                          fontSize: '16px'
                        }}>
                          {birthday.person_name}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: colors.textLight,
                        marginBottom: '5px'
                      }}>
                        {getRelationshipLabel(birthday.relationship)} • {new Date(birthday.birthday_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long'
                        })}
                      </div>

                      <div style={{
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: isToday ? colors.success : isSoon ? colors.warning : colors.primary
                      }}>
                        {isToday ? "🎉 C'est aujourd'hui !" :
                         birthday.daysUntil === 1 ? '🎈 Demain' :
                         `⏰ Dans ${birthday.daysUntil} jours`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteBirthday(birthday.id)}
                      style={{
                        background: colors.danger,
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
