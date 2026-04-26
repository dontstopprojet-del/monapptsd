import { supabase } from '../lib/supabase';

export interface AllowedContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profile_photo: string | null;
  office_position: string | null;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
}

export const getPermissionReasonLabel = (reason: string, lang: string): string => {
  const labels: Record<string, Record<string, string>> = {
    client_to_client_blocked: {
      fr: 'Communication entre clients non autoris\u00E9e',
      en: 'Communication between clients is not allowed',
    },
    tech_not_assigned_to_client: {
      fr: 'Ce technicien n\'est pas assign\u00E9 \u00E0 vos chantiers',
      en: 'This technician is not assigned to your projects',
    },
    office_cannot_contact_clients: {
      fr: 'Les employ\u00E9s de bureau ne peuvent pas contacter les clients directement',
      en: 'Office employees cannot contact clients directly',
    },
    user_not_found: {
      fr: 'Utilisateur introuvable',
      en: 'User not found',
    },
  };
  return labels[reason]?.[lang] || labels[reason]?.fr || reason;
};

export const fetchAllowedContacts = async (userId: string): Promise<AllowedContact[]> => {
  const { data, error } = await supabase.rpc('get_allowed_contacts', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching allowed contacts:', error);
    return [];
  }

  return data || [];
};

export const checkPermission = async (
  senderId: string,
  receiverId: string
): Promise<PermissionResult> => {
  const { data, error } = await supabase.rpc('check_communication_permission', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
  });

  if (error) {
    console.error('Error checking permission:', error);
    return { allowed: false, reason: 'error' };
  }

  return data as PermissionResult;
};

export const saveCallHistory = async (params: {
  conversationId: string;
  callerId: string;
  receiverId: string;
  callType: 'voice' | 'video';
  status: 'completed' | 'missed' | 'rejected' | 'failed';
  isUrgent: boolean;
  durationSeconds: number;
  startedAt: string;
  endedAt?: string;
}) => {
  const { error } = await supabase.from('call_history').insert({
    conversation_id: params.conversationId,
    caller_id: params.callerId,
    receiver_id: params.receiverId,
    call_type: params.callType,
    status: params.status,
    is_urgent: params.isUrgent,
    duration_seconds: params.durationSeconds,
    started_at: params.startedAt,
    ended_at: params.endedAt || new Date().toISOString(),
  });

  if (error) {
    console.error('Error saving call history:', error);
  }
};

export const isAdminTargetRole = (senderRole: string, receiverRole: string): boolean => {
  return receiverRole === 'admin' && (senderRole === 'client' || senderRole === 'tech');
};
