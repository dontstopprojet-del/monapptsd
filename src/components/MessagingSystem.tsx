import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface MessagingSystemProps {
  currentUser: any;
  darkMode: boolean;
  lang: string;
  onBack: () => void;
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string;
  other_user: any;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const MessagingSystem = ({ currentUser, darkMode, lang, onBack }: MessagingSystemProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const C = {
    primary: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#06b6d4',
    accent: '#22d3ee',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    card: darkMode ? '#1e293b' : '#FFFFFF',
    bg: darkMode ? '#0f172a' : '#f8fafc',
    bgSecondary: darkMode ? '#1e293b' : '#f1f5f9',
    gray: darkMode ? '#334155' : '#e2e8f0',
    grayLight: darkMode ? '#475569' : '#f1f5f9',
    text: darkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: darkMode ? '#94a3b8' : '#64748b',
    border: darkMode ? '#334155' : '#e2e8f0',
    hover: darkMode ? '#334155' : '#f8fafc',
    shadow: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)',
    messageSent: '#0891b2',
    messageReceived: darkMode ? '#334155' : '#f1f5f9',
  };

  const t = lang === 'fr' ? {
    title: 'Messagerie',
    newChat: 'Nouvelle conversation',
    noConversations: 'Aucune conversation',
    selectConversation: 'Selectionnez une conversation',
    typeMessage: 'Tapez votre message...',
    send: 'Envoyer',
    online: 'En ligne',
    offline: 'Hors ligne',
    selectUser: 'Selectionner un utilisateur',
    startChat: 'Demarrer',
    cancel: 'Annuler',
    admin: 'Administrateur',
    technician: 'Technicien',
    client: 'Client',
    office: 'Bureau',
    search: 'Rechercher une conversation...',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    read: 'Lu',
    delivered: 'Distribué',
    you: 'Vous',
  } : lang === 'en' ? {
    title: 'Messaging',
    newChat: 'New conversation',
    noConversations: 'No conversations',
    selectConversation: 'Select a conversation',
    typeMessage: 'Type your message...',
    send: 'Send',
    online: 'Online',
    offline: 'Offline',
    selectUser: 'Select a user',
    startChat: 'Start',
    cancel: 'Cancel',
    admin: 'Administrator',
    technician: 'Technician',
    client: 'Client',
    office: 'Office',
    search: 'Search conversations...',
    today: 'Today',
    yesterday: 'Yesterday',
    read: 'Read',
    delivered: 'Delivered',
    you: 'You',
  } : {
    title: 'المراسلة',
    newChat: 'محادثة جديدة',
    noConversations: 'لا توجد محادثات',
    selectConversation: 'اختر محادثة',
    typeMessage: 'اكتب رسالتك...',
    send: 'إرسال',
    online: 'متصل',
    offline: 'غير متصل',
    selectUser: 'اختر مستخدماً',
    startChat: 'بدء',
    cancel: 'إلغاء',
    admin: 'مدير',
    technician: 'فني',
    client: 'عميل',
    office: 'مكتب',
    search: 'بحث في المحادثات...',
    today: 'اليوم',
    yesterday: 'الأمس',
    read: 'مقروء',
    delivered: 'تم التوصيل',
    you: 'أنت',
  };

  useEffect(() => {
    loadConversations();
    loadAvailableUsers();

    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      conversationsChannel.unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);

      const messagesChannel = supabase
        .channel(`messages_${selectedConversation.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          markMessagesAsRead(selectedConversation.id);
        })
        .subscribe();

      return () => {
        messagesChannel.unsubscribe();
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${currentUser.id},participant_2_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const conversationsWithUsers = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.participant_1_id === currentUser.id ? conv.participant_2_id : conv.participant_1_id;

          const { data: userData } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', otherUserId)
            .maybeSingle();

          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id);

          return {
            ...conv,
            other_user: userData,
            unread_count: unreadMessages?.length || 0,
          };
        })
      );

      setConversations(conversationsWithUsers);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .neq('id', currentUser.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUser.id,
          content: messageInput.trim(),
        });

      if (error) throw error;

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startNewConversation = async (otherUserId: string) => {
    try {
      const participant1 = currentUser.id < otherUserId ? currentUser.id : otherUserId;
      const participant2 = currentUser.id < otherUserId ? otherUserId : currentUser.id;

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_1_id', participant1)
        .eq('participant_2_id', participant2)
        .maybeSingle();

      if (existingConv) {
        const otherUser = await supabase
          .from('app_users')
          .select('*')
          .eq('id', otherUserId)
          .maybeSingle();

        setSelectedConversation({
          ...existingConv,
          other_user: otherUser.data,
          unread_count: 0,
        });
        setShowNewChat(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: participant1,
          participant_2_id: participant2,
        })
        .select()
        .single();

      if (error) throw error;

      const otherUser = await supabase
        .from('app_users')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle();

      setSelectedConversation({
        ...data,
        other_user: otherUser.data,
        unread_count: 0,
      });
      setShowNewChat(false);
      loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: any = {
      admin: t.admin,
      tech: t.technician,
      client: t.client,
      office: t.office,
    };
    return labels[role] || role;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: any = {
      admin: '#EF4444',
      tech: '#3b82f6',
      client: '#10B981',
      office: '#F59E0B',
    };
    return colors[role] || C.primary;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.text }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '153px',
      right: 0,
      width: '100%',
      maxWidth: '380px',
      height: '480px',
      background: C.card,
      borderRadius: '16px 16px 0 0',
      boxShadow: '0 -8px 32px rgba(8,145,178,0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})`,
        padding: '14px 18px',
        color: '#FFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 8px #10B981',
            animation: 'pulse 2s infinite',
          }} />
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.3px' }}>{t.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowNewChat(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#FFF',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            }}
          >
            +
          </button>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#FFF',
              cursor: 'pointer',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: '140px',
          borderRight: `1px solid ${C.border}`,
          background: darkMode ? '#0a0f1e' : '#fafafa',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${C.border}` }}>
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: `2px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontSize: '12px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>
                {t.noConversations}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: '12px',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    background: selectedConversation?.id === conv.id ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})` : 'transparent',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedConversation?.id !== conv.id) {
                      e.currentTarget.style.background = C.hover;
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedConversation?.id !== conv.id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: getRoleColor(conv.other_user?.role || ''),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: '14px',
                    fontWeight: '700',
                    flexShrink: 0,
                    position: 'relative',
                  }}>
                    {getInitials(conv.other_user?.name || 'U')}
                    {conv.unread_count > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: C.danger,
                        color: '#FFF',
                        borderRadius: '10px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: '700',
                        border: `2px solid ${C.card}`,
                      }}>
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: selectedConversation?.id === conv.id ? '#FFF' : C.text,
                    fontWeight: '600',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}>
                    {conv.other_user?.name?.split(' ')[0] || 'User'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg }}>
          {!selectedConversation ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.textSecondary,
              gap: '16px',
            }}>
              <div style={{ fontSize: '48px', opacity: 0.3 }}>💬</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{t.selectConversation}</div>
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${C.border}`,
                background: C.card,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: `0 2px 8px ${C.shadow}`,
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: getRoleColor(selectedConversation.other_user?.role || ''),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: '14px',
                  fontWeight: '700',
                }}>
                  {getInitials(selectedConversation.other_user?.name || 'U')}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: C.text, fontWeight: '700' }}>
                    {selectedConversation.other_user?.name || 'Utilisateur'}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                    {getRoleLabel(selectedConversation.other_user?.role || '')}
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '12px',
                background: darkMode ? '#0a0f1e' : '#fafafa',
              }}>
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: '16px',
                        opacity: 0,
                        animation: 'messageSlideIn 0.4s ease-out forwards',
                        animationDelay: `${index * 0.05}s`,
                      }}
                    >
                      {!isOwn && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getRoleColor(selectedConversation?.other_user?.role || ''),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: '700',
                          marginRight: '8px',
                          flexShrink: 0,
                        }}>
                          {getInitials(selectedConversation?.other_user?.name || 'U')}
                        </div>
                      )}
                      <div
                        style={{
                          maxWidth: '75%',
                          background: isOwn ? `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})` : C.messageReceived,
                          color: isOwn ? '#FFF' : C.text,
                          padding: '12px 16px',
                          borderRadius: isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          boxShadow: isOwn ? `0 4px 12px ${C.primary}30` : `0 2px 8px ${C.shadow}`,
                          wordBreak: 'break-word',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = isOwn ? `0 6px 16px ${C.primary}40` : `0 4px 12px ${C.shadow}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = isOwn ? `0 4px 12px ${C.primary}30` : `0 2px 8px ${C.shadow}`;
                        }}
                      >
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{message.content}</div>
                        <div style={{
                          fontSize: '10px',
                          opacity: 0.7,
                          marginTop: '6px',
                          textAlign: 'right',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                        }}>
                          {new Date(message.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar-SA' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isOwn && message.is_read && (
                            <span style={{ fontSize: '12px', color: '#10B981' }}>✓✓</span>
                          )}
                          {isOwn && !message.is_read && (
                            <span style={{ fontSize: '12px' }}>✓</span>
                          )}
                        </div>
                      </div>
                      {isOwn && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: getRoleColor(currentUser?.role || ''),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: '700',
                          marginLeft: '8px',
                          flexShrink: 0,
                        }}>
                          {getInitials(currentUser?.name || 'U')}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{
                padding: '12px 16px',
                borderTop: `1px solid ${C.border}`,
                background: C.card,
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
              }}>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={t.typeMessage}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '24px',
                    border: `2px solid ${C.border}`,
                    background: C.bg,
                    color: C.text,
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${C.primary}20`;
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  style={{
                    background: messageInput.trim() ? `linear-gradient(135deg, ${C.primaryDark}, ${C.primary}, ${C.primaryLight})` : C.border,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '18px',
                    fontWeight: '700',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: messageInput.trim() ? `0 4px 16px ${C.primary}50` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (messageInput.trim()) {
                      e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
                      e.currentTarget.style.boxShadow = `0 6px 24px ${C.primary}70`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.boxShadow = messageInput.trim() ? `0 4px 16px ${C.primary}50` : 'none';
                  }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showNewChat && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowNewChat(false)}
        >
          <div
            style={{
              background: C.card,
              borderRadius: '20px',
              padding: '28px',
              width: '90%',
              maxWidth: '480px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: `0 20px 60px ${C.shadow}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px', fontSize: '24px', color: C.text, fontWeight: '800' }}>
              {t.newChat}
            </h2>
            <div style={{ marginBottom: '20px', color: C.textSecondary, fontSize: '14px' }}>
              {t.selectUser}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'auto',
              flex: 1,
            }}>
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => startNewConversation(user.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: C.bg,
                    border: `2px solid ${C.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.primary;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${C.shadow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: getRoleColor(user.role),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: '16px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>
                    {getInitials(user.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: C.text }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '13px', color: C.textSecondary }}>
                      {getRoleLabel(user.role)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowNewChat(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: `2px solid ${C.border}`,
                background: 'transparent',
                color: C.text,
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.bg;
                e.currentTarget.style.borderColor = C.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingSystem;
