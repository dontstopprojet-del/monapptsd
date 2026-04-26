import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CreateAccountForm from './CreateAccountForm';
import { COLORS } from '../constants/theme';

interface AccountManagerProps {
  lang: string;
  darkMode: boolean;
  onClose: () => void;
}

const AccountManager = ({ lang, darkMode, onClose }: AccountManagerProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editForm, setEditForm] = useState({
    role: '',
    echelon: '',
    status: '',
    office_position: '',
    contract_number: ''
  });

  const t = lang === 'fr' ? {
    title: 'Gestion des Comptes',
    name: 'Nom',
    email: 'Email',
    role: 'Rôle',
    contract: 'Contrat',
    echelon: 'Échelon',
    status: 'Statut',
    actions: 'Actions',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
    deleted: 'Compte supprimé',
    updated: 'Compte mis à jour',
    error: 'Erreur',
    close: 'Fermer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    loading: 'Chargement...',
    noUsers: 'Aucun utilisateur',
    client: 'Client',
    tech: 'Technicien',
    office: 'Employé de Bureau',
    admin: 'Administrateur',
    editUser: 'Modifier l\'utilisateur',
    officePosition: 'Poste',
    createAccount: 'Créer un compte'
  } : {
    title: 'Account Management',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    contract: 'Contract',
    echelon: 'Rank',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this account?',
    deleted: 'Account deleted',
    updated: 'Account updated',
    error: 'Error',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    noUsers: 'No users',
    client: 'Client',
    tech: 'Technician',
    office: 'Office Employee',
    admin: 'Administrator',
    editUser: 'Edit User',
    officePosition: 'Position',
    createAccount: 'Create account'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t.confirmDelete)) return;

    setUsers(prev => prev.filter(u => u.id !== userId));

    try {
      const { error, count } = await supabase
        .from('app_users')
        .delete({ count: 'exact' })
        .eq('id', userId);

      if (error) throw error;

      if (count === 0) {
        await fetchUsers();
        setMessage(`${t.error}: Suppression refusée (permissions insuffisantes)`);
        return;
      }

      setMessage(t.deleted);
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      await fetchUsers();
      setMessage(`${t.error}: ${error.message}`);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      role: user.role || '',
      echelon: user.echelon || '',
      status: user.status || '',
      office_position: user.office_position || '',
      contract_number: user.contract_number || ''
    });
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const updateData: any = {
        role: editForm.role
      };

      if (editForm.role === 'tech' && editForm.echelon) {
        updateData.echelon = editForm.echelon;
        updateData.contract_number = editForm.contract_number;
      }

      if (editForm.role === 'office') {
        updateData.status = editForm.status;
        updateData.office_position = editForm.office_position;
        updateData.contract_number = editForm.contract_number;
      }

      const { error } = await supabase
        .from('app_users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      setMessage(t.updated);
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`${t.error}: ${error.message}`);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return t.client;
      case 'tech': return t.tech;
      case 'office': return t.office;
      case 'admin': return t.admin;
      default: return role;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div style={{
        background: darkMode ? '#1a1a2e' : '#FFF',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            color: darkMode ? '#FFF' : '#2C3E50',
            fontSize: '20px'
          }}>
            {t.title}
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                background: COLORS.primary,
                color: '#FFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              + {t.createAccount}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: darkMode ? '#FFF' : '#2C3E50'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              background: message.includes(t.error) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(76, 175, 80, 0.1)',
              color: message.includes(t.error) ? '#ef4444' : '#4caf50',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: darkMode ? '#FFF' : '#2C3E50' }}>
              {t.loading}
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', color: darkMode ? '#FFF' : '#2C3E50' }}>
              {t.noUsers}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    background: darkMode ? '#2a2a3e' : '#F5F5F5'
                  }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.name}</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.email}</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.role}</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.contract}</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.echelon}</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.status}</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: darkMode ? '#FFF' : '#2C3E50' }}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{
                      borderBottom: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`
                    }}>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>
                        {user.name}
                        {user.role === 'office_employee' && (
                          <span style={{ marginLeft: '8px', fontSize: '16px' }} title={lang === 'fr' ? 'Membre du Bureau' : 'Office Member'}>💼</span>
                        )}
                        {user.role === 'admin' && (
                          <span style={{ marginLeft: '8px', fontSize: '16px' }} title={lang === 'fr' ? 'Administrateur' : 'Administrator'}>👑</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>{user.email}</td>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>{getRoleLabel(user.role)}</td>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>{user.contract_number || '-'}</td>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>{user.echelon || '-'}</td>
                      <td style={{ padding: '12px', color: darkMode ? '#FFF' : '#2C3E50' }}>{user.status || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(user)}
                          style={{
                            background: '#4ECDC4',
                            color: '#FFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            marginRight: '8px'
                          }}
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          style={{
                            background: '#ef4444',
                            color: '#FFF',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          {t.delete}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{
          padding: '20px',
          borderTop: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
          textAlign: 'right'
        }}>
          <button
            onClick={onClose}
            style={{
              background: darkMode ? '#4ECDC4' : '#4ECDC4',
              color: '#FFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {t.close}
          </button>
        </div>
      </div>

      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000
        }}>
          <div style={{
            background: darkMode ? '#1a1a2e' : '#FFF',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`
            }}>
              <h3 style={{
                margin: 0,
                color: darkMode ? '#FFF' : '#2C3E50',
                fontSize: '18px'
              }}>
                {t.editUser}: {editingUser.name}
              </h3>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {t.role}
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                    background: darkMode ? '#2a2a3e' : '#FFF',
                    color: darkMode ? '#FFF' : '#2C3E50',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="client">{t.client}</option>
                  <option value="tech">{t.tech}</option>
                  <option value="office">{t.office}</option>
                  <option value="admin">{t.admin}</option>
                </select>
              </div>

              {editForm.role === 'tech' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {t.contract}
                    </label>
                    <input
                      type="text"
                      value={editForm.contract_number}
                      onChange={(e) => setEditForm({ ...editForm, contract_number: e.target.value })}
                      placeholder="TSD-12345678"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                        background: darkMode ? '#2a2a3e' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {t.echelon}
                    </label>
                    <select
                      value={editForm.echelon}
                      onChange={(e) => setEditForm({ ...editForm, echelon: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                        background: darkMode ? '#2a2a3e' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-</option>
                      <option value="Manœuvre">{lang === 'fr' ? 'Manœuvre' : 'Laborer'}</option>
                      <option value="Manœuvre Spécialisé">{lang === 'fr' ? 'Manœuvre Spécialisé' : 'Specialized Laborer'}</option>
                      <option value="Manœuvre Spécialisé d'Élite">{lang === 'fr' ? 'Manœuvre Spécialisé d\'Élite' : 'Elite Specialized Laborer'}</option>
                      <option value="Qualifié 1er Échelon">{lang === 'fr' ? 'Qualifié 1er Échelon' : 'Qualified 1st Rank'}</option>
                      <option value="Qualifié 2e Échelon">{lang === 'fr' ? 'Qualifié 2e Échelon' : 'Qualified 2nd Rank'}</option>
                      <option value="Apprenti">{lang === 'fr' ? 'Apprenti' : 'Apprentice'}</option>
                      <option value="Chef équipe A">{lang === 'fr' ? 'Chef d\'équipe A' : 'Team Leader A'}</option>
                      <option value="Chef équipe B">{lang === 'fr' ? 'Chef d\'équipe B' : 'Team Leader B'}</option>
                      <option value="Contremaître">{lang === 'fr' ? 'Contremaître' : 'Foreman'}</option>
                      <option value="Directeur Général">{lang === 'fr' ? 'Directeur Général' : 'General Director'}</option>
                    </select>
                  </div>
                </>
              )}

              {editForm.role === 'office' && (
                <>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {t.contract}
                    </label>
                    <input
                      type="text"
                      value={editForm.contract_number}
                      onChange={(e) => setEditForm({ ...editForm, contract_number: e.target.value })}
                      placeholder="TSD-12345678"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                        background: darkMode ? '#2a2a3e' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {t.status}
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                        background: darkMode ? '#2a2a3e' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-</option>
                      <option value="RH">RH</option>
                      <option value="Magasinier">{lang === 'fr' ? 'Magasinier' : 'Warehouse Manager'}</option>
                      <option value="Secrétariat">{lang === 'fr' ? 'Secrétariat' : 'Secretariat'}</option>
                      <option value="Assistant">Assistant</option>
                      <option value="Finance">Finance</option>
                      <option value="Comptable">{lang === 'fr' ? 'Comptable' : 'Accountant'}</option>
                      <option value="Directeur Général">{lang === 'fr' ? 'Directeur Général' : 'General Director'}</option>
                      <option value="Directeur Administratif">{lang === 'fr' ? 'Directeur Administratif' : 'Administrative Director'}</option>
                      <option value="Coordinateur">{lang === 'fr' ? 'Coordinateur' : 'Coordinator'}</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      color: darkMode ? '#FFF' : '#2C3E50',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {t.officePosition}
                    </label>
                    <select
                      value={editForm.office_position}
                      onChange={(e) => setEditForm({ ...editForm, office_position: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                        background: darkMode ? '#2a2a3e' : '#FFF',
                        color: darkMode ? '#FFF' : '#2C3E50',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="">-</option>
                      <option value="RH">RH</option>
                      <option value="Magasinier">{lang === 'fr' ? 'Magasinier' : 'Warehouse Manager'}</option>
                      <option value="Secrétariat">{lang === 'fr' ? 'Secrétariat' : 'Secretariat'}</option>
                      <option value="Assistant">Assistant</option>
                      <option value="Finance">Finance</option>
                      <option value="Comptable">{lang === 'fr' ? 'Comptable' : 'Accountant'}</option>
                      <option value="Directeur Général">{lang === 'fr' ? 'Directeur Général' : 'General Director'}</option>
                      <option value="Directeur Administratif">{lang === 'fr' ? 'Directeur Administratif' : 'Administrative Director'}</option>
                      <option value="Coordinateur">{lang === 'fr' ? 'Coordinateur' : 'Coordinator'}</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div style={{
              padding: '20px',
              borderTop: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'transparent',
                  color: darkMode ? '#FFF' : '#2C3E50',
                  border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleUpdate}
                style={{
                  background: '#4ECDC4',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <CreateAccountForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={fetchUsers}
          darkMode={darkMode}
          colors={COLORS}
          lang={lang}
        />
      )}
    </div>
  );
};

export default AccountManager;
