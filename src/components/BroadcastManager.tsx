import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: string;
  target_roles: string[];
  is_active: boolean;
  priority: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  image_url: string | null;
}

interface Props {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

const TYPES = [
  { value: 'announcement', label: 'Annonce', labelEn: 'Announcement', icon: '📢' },
  { value: 'promotion', label: 'Promotion', labelEn: 'Promotion', icon: '🎉' },
  { value: 'alert', label: 'Alerte', labelEn: 'Alert', icon: '🚨' },
  { value: 'info', label: 'Information', labelEn: 'Info', icon: 'ℹ️' },
];

const PRIORITIES = [
  { value: 'low', label: 'Basse', labelEn: 'Low', color: '#6b7280' },
  { value: 'medium', label: 'Moyenne', labelEn: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'Haute', labelEn: 'High', color: '#ef4444' },
  { value: 'urgent', label: 'Urgente', labelEn: 'Urgent', color: '#dc2626' },
];

const ROLES = [
  { value: 'visitor', label: 'Visiteurs', labelEn: 'Visitors', icon: '🌐' },
  { value: 'client', label: 'Clients', labelEn: 'Clients', icon: '👤' },
  { value: 'tech', label: 'Techniciens', labelEn: 'Technicians', icon: '🔧' },
  { value: 'office', label: 'Bureau', labelEn: 'Office', icon: '🏢' },
];

const BroadcastManager = ({ currentUser, darkMode, lang, onBack }: Props) => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'announcement',
    target_roles: ['client', 'tech', 'office', 'visitor'] as string[],
    priority: 'medium',
    starts_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
    image_url: '',
  });
  const [uploading, setUploading] = useState(false);

  const fr = lang === 'fr';

  const C = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#1e293b',
    textSec: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    primary: '#0891b2',
    primaryLight: darkMode ? 'rgba(8,145,178,0.15)' : 'rgba(8,145,178,0.08)',
    danger: '#ef4444',
    success: '#10b981',
  };

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    setBroadcasts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      type: 'announcement',
      target_roles: ['client', 'tech', 'office', 'visitor'],
      priority: 'medium',
      starts_at: new Date().toISOString().slice(0, 16),
      expires_at: '',
      image_url: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (b: Broadcast) => {
    setForm({
      title: b.title,
      message: b.message,
      type: b.type,
      target_roles: b.target_roles,
      priority: b.priority,
      starts_at: b.starts_at ? new Date(b.starts_at).toISOString().slice(0, 16) : '',
      expires_at: b.expires_at ? new Date(b.expires_at).toISOString().slice(0, 16) : '',
      image_url: b.image_url || '',
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      target_roles: form.target_roles,
      priority: form.priority,
      starts_at: new Date(form.starts_at).toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      author_id: currentUser?.id,
      updated_at: new Date().toISOString(),
      image_url: form.image_url.trim() || null,
    };

    if (editingId) {
      await supabase.from('admin_broadcasts').update(payload).eq('id', editingId);
    } else {
      await supabase.from('admin_broadcasts').insert(payload);
    }
    setSaving(false);
    resetForm();
    fetchBroadcasts();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('admin_broadcasts').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    fetchBroadcasts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('admin_broadcasts').delete().eq('id', id);
    fetchBroadcasts();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(fr ? 'Image trop grande (max 5 Mo)' : 'Image too large (max 5 MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `broadcasts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('public-files').upload(path, file, { upsert: true });
      if (error) {
        console.error('Upload error:', error);
        alert(fr ? 'Erreur lors de l\'envoi de l\'image' : 'Error uploading image');
      } else {
        const { data: urlData } = supabase.storage.from('public-files').getPublicUrl(path);
        setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(fr ? 'Erreur lors de l\'envoi de l\'image' : 'Error uploading image');
    }
    setUploading(false);
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const filtered = broadcasts.filter(b => {
    if (filter === 'active') return b.is_active;
    if (filter === 'inactive') return !b.is_active;
    return true;
  });

  const getTypeInfo = (type: string) => TYPES.find(t => t.value === type) || TYPES[0];
  const getPriorityInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1];

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    background: darkMode ? '#0f172a' : '#f8fafc',
    color: C.text,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{
        background: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
        padding: '24px',
        color: '#FFF',
        boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#FFF',
            cursor: 'pointer',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
          }}
        >
          {fr ? '← Retour' : '← Back'}
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
          📢 {fr ? 'Diffusion & Annonces' : 'Broadcasts & Announcements'}
        </h2>
        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '13px' }}>
          {fr ? 'Publiez des messages visibles sur toutes les interfaces' : 'Publish messages visible across all interfaces'}
        </p>
      </div>

      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            width: '100%',
            padding: '14px',
            background: `linear-gradient(135deg, ${C.primary}, #06b6d4)`,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(8,145,178,0.3)',
          }}
        >
          + {fr ? 'Nouvelle Diffusion' : 'New Broadcast'}
        </button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${filter === f ? C.primary : C.border}`,
                background: filter === f ? C.primaryLight : 'transparent',
                color: filter === f ? C.primary : C.textSec,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? (fr ? 'Toutes' : 'All') : f === 'active' ? (fr ? 'Actives' : 'Active') : (fr ? 'Inactives' : 'Inactive')}
              {' '}({broadcasts.filter(b => f === 'all' ? true : f === 'active' ? b.is_active : !b.is_active).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textSec }}>
            {fr ? 'Chargement...' : 'Loading...'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: C.textSec,
            background: C.card,
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📢</div>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>
              {fr ? 'Aucune diffusion' : 'No broadcasts yet'}
            </p>
            <p style={{ fontSize: '13px' }}>
              {fr ? 'Creez votre premiere annonce pour la partager avec tout le monde' : 'Create your first broadcast to share with everyone'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(b => {
              const typeInfo = getTypeInfo(b.type);
              const prioInfo = getPriorityInfo(b.priority);
              const isExpired = b.expires_at && new Date(b.expires_at) < new Date();
              return (
                <div
                  key={b.id}
                  style={{
                    background: C.card,
                    borderRadius: '14px',
                    border: `1px solid ${C.border}`,
                    overflow: 'hidden',
                    opacity: b.is_active && !isExpired ? 1 : 0.6,
                  }}
                >
                  <div style={{
                    padding: '14px 16px',
                    borderLeft: `4px solid ${b.is_active && !isExpired ? prioInfo.color : '#9ca3af'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '18px' }}>{typeInfo.icon}</span>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: C.text }}>{b.title}</span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '700',
                            background: b.is_active && !isExpired ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: b.is_active && !isExpired ? C.success : C.danger,
                          }}>
                            {b.is_active && !isExpired ? (fr ? 'ACTIVE' : 'ACTIVE') : isExpired ? (fr ? 'EXPIREE' : 'EXPIRED') : (fr ? 'INACTIVE' : 'INACTIVE')}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: C.textSec, margin: '0 0 8px', lineHeight: '1.5' }}>{b.message}</p>
                        {b.image_url && (
                          <img
                            src={b.image_url}
                            alt=""
                            style={{
                              width: '100%', maxHeight: '180px',
                              objectFit: 'cover', borderRadius: '10px',
                              marginBottom: '8px',
                            }}
                          />
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {b.target_roles.map(r => {
                            const roleInfo = ROLES.find(rl => rl.value === r);
                            return (
                              <span key={r} style={{
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: '600',
                                background: C.primaryLight,
                                color: C.primary,
                              }}>
                                {roleInfo?.icon} {fr ? roleInfo?.label : roleInfo?.labelEn}
                              </span>
                            );
                          })}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            background: `${prioInfo.color}20`,
                            color: prioInfo.color,
                          }}>
                            {fr ? prioInfo.label : prioInfo.labelEn}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        onClick={() => toggleActive(b.id, b.is_active)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: b.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: b.is_active ? C.danger : C.success,
                        }}
                      >
                        {b.is_active ? (fr ? 'Desactiver' : 'Deactivate') : (fr ? 'Activer' : 'Activate')}
                      </button>
                      <button
                        onClick={() => handleEdit(b)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: C.primaryLight,
                          color: C.primary,
                        }}
                      >
                        {fr ? 'Modifier' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: 'rgba(239,68,68,0.1)',
                          color: C.danger,
                        }}
                      >
                        {fr ? 'Supprimer' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000,
        }}>
          <div style={{
            background: C.card,
            borderRadius: '20px',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: C.card,
              zIndex: 2,
              borderRadius: '20px 20px 0 0',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: C.text, fontWeight: '700' }}>
                📢 {editingId ? (fr ? 'Modifier la diffusion' : 'Edit broadcast') : (fr ? 'Nouvelle diffusion' : 'New broadcast')}
              </h3>
              <button
                onClick={resetForm}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: C.textSec }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '6px', display: 'block' }}>
                  {fr ? 'Titre' : 'Title'} *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={fr ? 'Ex: Promotion speciale...' : 'Ex: Special promotion...'}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '6px', display: 'block' }}>
                  {fr ? 'Message' : 'Message'} *
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder={fr ? 'Votre message...' : 'Your message...'}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '6px', display: 'block' }}>
                  {fr ? 'Image (optionnel)' : 'Image (optional)'}
                </label>
                {form.image_url && (
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <img src={form.image_url} alt="" style={{
                      width: '100%', maxHeight: '160px', objectFit: 'cover',
                      borderRadius: '10px', border: `1px solid ${C.border}`,
                    }} />
                    <button
                      onClick={() => setForm(p => ({ ...p, image_url: '' }))}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: '26px', height: '26px', fontSize: '14px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    border: `2px dashed ${C.border}`, textAlign: 'center',
                    cursor: uploading ? 'wait' : 'pointer',
                    color: C.textSec, fontSize: '13px', fontWeight: '600',
                    background: darkMode ? '#0f172a' : '#f8fafc',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    {uploading ? (fr ? 'Envoi...' : 'Uploading...') : '📷 ' + (fr ? 'Choisir une image' : 'Choose image')}
                  </label>
                  <input
                    value={form.image_url}
                    onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                    placeholder={fr ? 'Ou coller une URL...' : 'Or paste URL...'}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '8px', display: 'block' }}>
                  {fr ? 'Type' : 'Type'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(p => ({ ...p, type: t.value }))}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: `2px solid ${form.type === t.value ? C.primary : C.border}`,
                        background: form.type === t.value ? C.primaryLight : 'transparent',
                        color: form.type === t.value ? C.primary : C.text,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {t.icon} {fr ? t.label : t.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '8px', display: 'block' }}>
                  {fr ? 'Priorite' : 'Priority'}
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: `2px solid ${form.priority === p.value ? p.color : C.border}`,
                        background: form.priority === p.value ? `${p.color}15` : 'transparent',
                        color: form.priority === p.value ? p.color : C.textSec,
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {fr ? p.label : p.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '8px', display: 'block' }}>
                  {fr ? 'Visible pour' : 'Visible to'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {ROLES.map(r => {
                    const selected = form.target_roles.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        onClick={() => toggleRole(r.value)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: `2px solid ${selected ? C.primary : C.border}`,
                          background: selected ? C.primaryLight : 'transparent',
                          color: selected ? C.primary : C.textSec,
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {r.icon} {fr ? r.label : r.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '6px', display: 'block' }}>
                    {fr ? 'Debut' : 'Start'}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: C.textSec, marginBottom: '6px', display: 'block' }}>
                    {fr ? 'Expiration (optionnel)' : 'Expires (optional)'}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={resetForm}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: `1px solid ${C.border}`,
                    background: 'transparent',
                    color: C.textSec,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {fr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.message.trim() || form.target_roles.length === 0}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: (!form.title.trim() || !form.message.trim() || form.target_roles.length === 0)
                      ? '#94a3b8'
                      : `linear-gradient(135deg, ${C.primary}, #06b6d4)`,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: saving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 16px rgba(8,145,178,0.3)',
                  }}
                >
                  {saving ? (fr ? 'Envoi...' : 'Sending...') : editingId ? (fr ? 'Mettre a jour' : 'Update') : (fr ? 'Publier' : 'Publish')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastManager;
