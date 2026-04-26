import { supabase } from '../lib/supabase';

export const dbService = {
  async getChantiers() {
    const { data, error } = await supabase
      .from('chantiers')
      .select(`
        *,
        client:clients(*),
        technician:technicians(*, profile:profiles(*)),
        service:services(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createChantier(chantier: any) {
    const { data, error } = await supabase
      .from('chantiers')
      .insert(chantier)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateChantier(id: string, updates: any) {
    const { data, error } = await supabase
      .from('chantiers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTechnicians() {
    const { data, error } = await supabase
      .from('technicians')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false});

    if (error) throw error;
    return data || [];
  },

  async createTechnician(technician: any) {
    const { data, error } = await supabase
      .from('technicians')
      .insert(technician)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTechnician(id: string, updates: any) {
    const { data, error} = await supabase
      .from('technicians')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createClient(client: any) {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClient(id: string, updates: any) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStocks() {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createStock(stock: any) {
    const { data, error } = await supabase
      .from('stocks')
      .insert(stock)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStock(id: string, updates: any) {
    const { data, error } = await supabase
      .from('stocks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStock(id: string) {
    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getInvoices() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*, profile:profiles(*)), chantier:chantiers(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createInvoice(invoice: any) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateInvoice(id: string, updates: any) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*, photos:project_photos(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createProject(project: any) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: any) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addProjectPhoto(projectId: string, photoUrl: string, userEmail: string) {
    const { data, error } = await supabase
      .from('project_photos')
      .insert({ project_id: projectId, photo_url: photoUrl, user_email: userEmail })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPlanning() {
    const { data, error } = await supabase
      .from('planning')
      .select('*, chantier:chantiers(*), technician:technicians(*, profile:profiles(*))')
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createPlanning(planning: any) {
    const { data, error } = await supabase
      .from('planning')
      .insert(planning)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlanning(id: string, updates: any) {
    const { data, error } = await supabase
      .from('planning')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlanning(id: string) {
    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createReport(report: any) {
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateReport(id: string, updates: any) {
    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReport(id: string) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createNotification(notification: any) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markNotificationAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteNotification(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createService(service: any) {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateService(id: string, updates: any) {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteService(id: string) {
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAdminSettings() {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async getAdminSetting(key: string) {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async setAdminSetting(key: string, value: string, type: string = 'general') {
    const { data, error } = await supabase
      .from('admin_settings')
      .upsert(
        { setting_key: key, setting_value: value, setting_type: type, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getReviews(chantierId?: string) {
    let query = supabase
      .from('reviews')
      .select('*, chantier:chantiers(*), client:clients(*, profile:profiles(*)), technician:technicians(*, profile:profiles(*))')
      .order('created_at', { ascending: false });

    if (chantierId) {
      query = query.eq('chantier_id', chantierId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async createReview(review: any) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAppUsers(role?: string) {
    let query = supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getAppUser(id: string) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateAppUser(id: string, updates: any) {
    const { data, error } = await supabase
      .from('app_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
