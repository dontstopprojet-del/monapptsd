import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchAllowedContacts,
  checkPermission,
  getPermissionReasonLabel,
} from '../utils/contactPermissions';
import { useNotifications } from '../contexts/NotificationContext';

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
  message_type: 'text' | 'image' | 'audio' | 'invoice';
  file_url?: string;
  invoice_id?: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

const EnhancedMessagingSystem = ({ currentUser, darkMode, lang, onBack }: MessagingSystemProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);
  const { refreshUnreadCount } = useNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    sendImage: 'Envoyer une image',
    sendVoice: 'Message vocal',
    sendInvoice: 'Envoyer une facture',
    selectInvoice: 'Sélectionner une facture',
    recording: 'Enregistrement...',
    uploading: 'Envoi en cours...',
    image: 'Image',
    voice: 'Message vocal',
    invoice: 'Facture',
    selectUser: 'Selectionner un utilisateur',
    startChat: 'Demarrer',
    cancel: 'Annuler',
    admin: 'Administrateur',
    technician: 'Technicien',
    client: 'Client',
    office: 'Bureau',
    search: 'Rechercher...',
    call: 'Appeler',
    incomingCall: 'Appel entrant de',
    acceptCall: 'Accepter',
    rejectCall: 'Rejeter',
    urgentCall: 'Appel urgent',
    urgentConfirmTitle: 'Appel urgent',
    urgentConfirmMsg: 'Cet appel sera marqu\u00E9 comme urgent. Voulez-vous continuer ?',
    confirm: 'Confirmer',
    permissionDeniedTitle: 'Acc\u00E8s refus\u00E9',
    callHistoryTitle: 'Historique des appels',
    noCallHistory: 'Aucun historique',
    missed: 'Manqu\u00E9',
    completed: 'Termin\u00E9',
    rejected: 'Refus\u00E9',
    failed: '\u00C9chou\u00E9',
    urgent: 'Urgent',
    close: 'Fermer',
  } : {
    title: 'Messaging',
    newChat: 'New conversation',
    noConversations: 'No conversations',
    selectConversation: 'Select a conversation',
    typeMessage: 'Type your message...',
    send: 'Send',
    sendImage: 'Send image',
    sendVoice: 'Voice message',
    sendInvoice: 'Send invoice',
    selectInvoice: 'Select an invoice',
    recording: 'Recording...',
    uploading: 'Uploading...',
    image: 'Image',
    voice: 'Voice message',
    invoice: 'Invoice',
    selectUser: 'Select a user',
    startChat: 'Start',
    cancel: 'Cancel',
    admin: 'Administrator',
    technician: 'Technician',
    client: 'Client',
    office: 'Office',
    search: 'Search...',
    call: 'Call',
    incomingCall: 'Incoming call from',
    acceptCall: 'Accept',
    rejectCall: 'Reject',
    urgentCall: 'Urgent call',
    urgentConfirmTitle: 'Urgent call',
    urgentConfirmMsg: 'This call will be marked as urgent. Do you want to continue?',
    confirm: 'Confirm',
    permissionDeniedTitle: 'Access denied',
    callHistoryTitle: 'Call history',
    noCallHistory: 'No call history',
    missed: 'Missed',
    completed: 'Completed',
    rejected: 'Rejected',
    failed: 'Failed',
    urgent: 'Urgent',
    close: 'Close',
  };

  useEffect(() => {
    loadConversations();
    loadAvailableUsers();
    loadAvailableInvoices();

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
      const contacts = await fetchAllowedContacts(currentUser.id);
      setAvailableUsers(contacts);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAvailableInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
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
      refreshUnreadCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (messageType: 'text' | 'image' | 'audio' | 'invoice' = 'text', fileUrl?: string, invoiceId?: string) => {
    if (!selectedConversation) return;
    if (messageType === 'text' && !messageInput.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: currentUser.id,
          content: messageInput.trim() || (messageType === 'invoice' ? 'Facture' : messageType === 'image' ? 'Image' : 'Message vocal'),
          message_type: messageType,
          file_url: fileUrl,
          invoice_id: invoiceId,
        });

      if (error) throw error;

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(fileName);

      await sendMessage('image', publicUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(lang === 'fr' ? 'Erreur lors de l\'envoi du fichier' : 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const actualMime = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        await uploadAudio(audioBlob, actualMime);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(lang === 'fr' ? 'Impossible d\'accéder au microphone' : 'Cannot access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const uploadAudio = async (audioBlob: Blob, mimeType: string) => {
    if (!selectedConversation) return;

    try {
      setUploading(true);

      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `${currentUser.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(fileName, audioBlob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(fileName);

      await sendMessage('audio', publicUrl);
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert(lang === 'fr' ? 'Erreur lors de l\'envoi de l\'audio' : 'Error uploading audio');
    } finally {
      setUploading(false);
    }
  };

  const sendInvoiceMessage = async (invoiceId: string) => {
    await sendMessage('invoice', undefined, invoiceId);
    setShowInvoiceSelector(false);
  };

  const startNewConversation = async (otherUserId: string) => {
    try {
      const permResult = await checkPermission(currentUser.id, otherUserId);
      if (!permResult.allowed) {
        setPermissionDenied(getPermissionReasonLabel(permResult.reason, lang));
        return;
      }

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
      office_employee: t.office,
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
      office_employee: '#F59E0B',
    };
    return colors[role] || C.primary;
  };

  const renderMessage = (message: Message) => {
    if (message.message_type === 'image' && message.file_url) {
      return (
        <div>
          <img
            src={message.file_url}
            alt="Image"
            style={{
              maxWidth: '200px',
              maxHeight: '200px',
              borderRadius: '12px',
              marginBottom: '8px',
            }}
          />
          {message.content && message.content !== 'Image' && (
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{message.content}</div>
          )}
        </div>
      );
    }

    if (message.message_type === 'audio' && message.file_url) {
      return (
        <div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>🎤</div>
          <audio
            controls
            preload="auto"
            src={message.file_url}
            style={{ width: '220px', maxWidth: '100%', height: '40px' }}
          />
        </div>
      );
    }

    if (message.message_type === 'invoice' && message.invoice_id) {
      const invoice = availableInvoices.find(inv => inv.id === message.invoice_id);
      return (
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '14px', lineHeight: '1.6', fontWeight: '700' }}>
            {t.invoice}
          </div>
          {invoice && (
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>
              <div>N° {invoice.invoice_number}</div>
              <div>{invoice.amount?.toLocaleString()} GNF</div>
              {invoice.client_name && <div>{invoice.client_name}</div>}
            </div>
          )}
        </div>
      );
    }

    return <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{message.content}</div>;
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
      height: '520px',
      background: C.card,
      borderRadius: '16px 16px 0 0',
      boxShadow: '0 -8px 32px rgba(8,145,178,0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10001,
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
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
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
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
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
                boxSizing: 'border-box',
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
                    transition: 'all 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
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
                <div style={{ flex: 1 }}>
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
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        marginBottom: '16px',
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
                        }}
                      >
                        {renderMessage(message)}
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
                          {new Date(message.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
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
                padding: '10px 12px',
                borderTop: `1px solid ${C.border}`,
                background: C.card,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {(uploading || recording) && (
                  <div style={{
                    padding: '8px',
                    background: `${C.warning}20`,
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: C.warning,
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    {recording ? t.recording : t.uploading}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || recording}
                    style={{
                      background: C.primary,
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: '#FFF',
                      cursor: uploading || recording ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: uploading || recording ? 0.5 : 1,
                    }}
                    title={t.sendImage}
                  >
                    📷
                  </button>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={uploading}
                    style={{
                      background: recording ? C.danger : C.primary,
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: '#FFF',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: uploading ? 0.5 : 1,
                    }}
                    title={t.sendVoice}
                  >
                    🎤
                  </button>
                  {(currentUser.role === 'admin' || currentUser.role === 'office_employee') && (
                    <button
                      onClick={() => setShowInvoiceSelector(true)}
                      disabled={uploading || recording}
                      style={{
                        background: C.primary,
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        color: '#FFF',
                        cursor: uploading || recording ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: uploading || recording ? 0.5 : 1,
                      }}
                      title={t.sendInvoice}
                    >
                      💰
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    disabled={uploading || recording}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: `2px solid ${C.border}`,
                      background: C.bg,
                      color: C.text,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!messageInput.trim() || uploading || recording}
                    style={{
                      background: messageInput.trim() && !uploading && !recording ? `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})` : C.border,
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      cursor: messageInput.trim() && !uploading && !recording ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

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
            zIndex: 10002,
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
                  }}>
                    {getInitials(user.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>
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
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {permissionDenied && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10006, backdropFilter: 'blur(4px)',
        }}
          onClick={() => setPermissionDenied(null)}
        >
          <div style={{
            background: C.card, borderRadius: '20px',
            padding: '32px', width: '90%', maxWidth: '380px',
            boxShadow: `0 20px 60px ${C.shadow}`,
            textAlign: 'center',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
            }}>
              {'\uD83D\uDD12'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: C.text, marginBottom: '8px' }}>
              {t.permissionDeniedTitle}
            </div>
            <div style={{ fontSize: '14px', color: C.textSecondary, lineHeight: '1.5', marginBottom: '20px' }}>
              {permissionDenied}
            </div>
            <button
              onClick={() => setPermissionDenied(null)}
              style={{
                padding: '12px 32px', borderRadius: '12px',
                border: 'none', background: C.primary, color: '#FFF',
                fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {showInvoiceSelector && (
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
            zIndex: 10002,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowInvoiceSelector(false)}
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
              {t.selectInvoice}
            </h2>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'auto',
              flex: 1,
            }}>
              {availableInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => sendInvoiceMessage(invoice.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: C.bg,
                    border: `2px solid ${C.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: C.text }}>
                    💰 Facture N° {invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '4px' }}>
                    {invoice.client_name || 'Client inconnu'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: C.primary }}>
                    {invoice.amount?.toLocaleString()} GNF
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '8px' }}>
                    Statut: <span style={{ fontWeight: '600' }}>{invoice.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowInvoiceSelector(false)}
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

export default EnhancedMessagingSystem;
