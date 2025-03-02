import { createClient } from '@supabase/supabase-js';
import { aiApi } from './openai';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ve Anon Key tanımlanmamış!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Kimlik doğrulama işlemleri
export const authApi = {
  async signUp({ email, password, name }) {
    try {
      console.log('Kayıt işlemi başlatılıyor:', { email, name });
      
      // Kullanıcı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: 'user' // Varsayılan olarak 'user' rolü atıyoruz
          },
          emailRedirectTo: window.location.origin + '/auth/signin'
        }
      });

      if (authError) {
        console.error('Auth hatası:', authError);
        throw authError;
      }

      if (!authData?.user) {
        console.error('Kullanıcı oluşturulamadı:', authData);
        throw new Error('Kullanıcı kaydı başarısız oldu');
      }

      console.log('Kullanıcı başarıyla oluşturuldu:', authData.user.id);
      return authData;
    } catch (error) {
      console.error('signUp fonksiyonunda hata:', error);
      throw error;
    }
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Günlük işlemleri
export const journalApi = {
  async createEntry({ content, mood, date, keywords, ai_summary, ai_suggestions }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{
        user_id: user.id,
        content,
        mood,
        date,
        keywords,
        ai_summary,
        ai_suggestions
      }])
      .select();

    if (error) throw error;
    return data[0];
  },

  async getEntries() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getEntryByDate(date) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Tarih formatını sıkı bir şekilde kontrol ediyoruz
    let formattedDate;
    try {
      // Önce geçerli bir tarih olduğundan emin oluyoruz
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Geçersiz tarih formatı');
      }
      
      // UTC'ye çevirip YYYY-MM-DD formatına getiriyoruz
      formattedDate = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate()
      )).toISOString().split('T')[0];
    } catch (error) {
      console.error('Tarih formatı hatası:', error);
      throw new Error('Geçersiz tarih formatı');
    }
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formattedDate)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateEntry(id, updates) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteEntry(id) {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Analiz işlemleri
export const analyticsApi = {
  async getMoodTrends(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('date, mood')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getKeywords() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .rpc('get_common_keywords', { p_user_id: user.id });

    if (error) throw error;
    return data;
  },
};

// Öneri işlemleri
export const recommendationsApi = {
  async createRecommendations(mood, keywords) {
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      // OpenAI'dan öneriler al
      const aiSuggestions = await aiApi.generateRecommendations(mood, keywords);
      
      // Her bir öneri türü için veritabanına kaydet
      const recommendations = [];
      
      // Müzik önerileri
      for (const music of aiSuggestions.music) {
        recommendations.push({
          user_id: user.id,
          type: 'music',
          title: music.title,
          description: music.description,
          link: music.link,
          image_url: music.image_url || null,
          is_viewed: false,
          created_at: new Date().toISOString()
        });
      }
      
      // Meditasyon önerileri
      for (const meditation of aiSuggestions.meditation) {
        recommendations.push({
          user_id: user.id,
          type: 'meditation',
          title: meditation.title,
          description: meditation.description,
          link: meditation.link,
          image_url: meditation.image_url || null,
          is_viewed: false,
          created_at: new Date().toISOString()
        });
      }
      
      // Okuma önerileri
      for (const reading of aiSuggestions.reading) {
        recommendations.push({
          user_id: user.id,
          type: 'reading',
          title: reading.title,
          description: reading.description,
          link: reading.link,
          image_url: reading.image_url || null,
          is_viewed: false,
          created_at: new Date().toISOString()
        });
      }

      // Toplu olarak önerileri ekle
      const { data, error } = await supabase
        .from('recommendations')
        .insert(recommendations)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Öneriler oluşturulurken hata:', error);
      throw error;
    }
  },

  async getRecommendations() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Son 24 saat içindeki önerileri getir
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_viewed', false)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getLatestRecommendations() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Son günlük girdisine ait önerileri getir
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('mood, keywords, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (entriesError) throw entriesError;
    
    if (entries && entries.length > 0) {
      const latestEntry = entries[0];
      
      // Eğer son 24 saat içinde öneri yoksa yeni öneriler oluştur
      const { data: existingRecs, error: recsError } = await supabase
        .from('recommendations')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recsError) throw recsError;

      if (!existingRecs || existingRecs.length === 0) {
        // Yeni öneriler oluştur
        await this.createRecommendations(latestEntry.mood, latestEntry.keywords);
      }

      // Güncel önerileri getir
      return await this.getRecommendations();
    }

    return [];
  },

  async markAsViewed(id) {
    const { error } = await supabase
      .from('recommendations')
      .update({ is_viewed: true })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteOldRecommendations() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 7 günden eski önerileri sil
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const { error } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', user.id)
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
  }
};

// Admin işlemleri
export const adminApi = {
  async getAllTherapists(status = 'all') {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Terapistleri getir
    let query = supabase
      .from('therapist_profiles')
      .select('*');
    
    // Onay durumuna göre filtrele
    if (status === 'verified') {
      query = query.eq('is_verified', true);
    } else if (status === 'pending') {
      query = query.eq('is_verified', false);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async verifyTherapist(therapistId, isVerified) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Terapist onayını güncelle
    const { data, error } = await supabase
      .from('therapist_profiles')
      .update({ is_verified: isVerified })
      .eq('id', therapistId)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async getSystemStats() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Kullanıcı sayıları
    const { count: userCount, error: userError } = await supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user');
    
    if (userError) throw userError;
    
    // Terapist sayıları
    const { count: therapistCount, error: therapistError } = await supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'therapist');
    
    if (therapistError) throw therapistError;
    
    // Onay bekleyen terapist sayısı
    const { count: pendingTherapistCount, error: pendingError } = await supabase
      .from('therapist_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', false);
    
    if (pendingError) throw pendingError;
    
    // Toplam randevu sayısı
    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });
    
    if (appointmentError) throw appointmentError;
    
    return {
      userCount,
      therapistCount,
      pendingTherapistCount,
      appointmentCount
    };
  },
  
  async setUserRole(userId, role) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Kullanıcı rolünü güncelle
    const { data, error } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async getAllUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Tüm kullanıcı rollerini getir
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('id, role, created_at')
      .order('created_at', { ascending: false });
    
    if (userRolesError) throw userRolesError;
    
    // Tüm profilleri getir
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name');
      
    if (profilesError) throw profilesError;
    
    // Verileri birleştir
    const users = userRoles.map(userRole => {
      const profile = profiles.find(p => p.id === userRole.id) || {};
      
      // E-posta bilgisi için kullanıcı ID'sini kullan
      // Gerçek uygulamada bu bilgiyi backend'den almanız gerekebilir
      const email = userRole.id === user.id ? user.email : `user-${userRole.id.substring(0, 8)}@etherea.app`;
      
      return {
        id: userRole.id,
        role: userRole.role,
        created_at: userRole.created_at,
        name: profile.name || 'İsimsiz Kullanıcı',
        email: email
      };
    });
    
    return users;
  },
  
  async getAllAppointments() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Tüm randevuları getir
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });
    
    if (appointmentsError) throw appointmentsError;
    
    // Kullanıcı ve psikolog bilgilerini ayrı ayrı getir
    const userIds = appointments.map(a => a.user_id);
    const therapistIds = appointments.map(a => a.therapist_id);
    
    // Kullanıcı profillerini getir
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
      
    if (profilesError) throw profilesError;
    
    // Psikolog profillerini getir
    const { data: therapists, error: therapistsError } = await supabase
      .from('therapist_profiles')
      .select('id, full_name')
      .in('id', therapistIds);
      
    if (therapistsError) throw therapistsError;
    
    // Verileri birleştir
    const result = appointments.map(appointment => {
      const userProfile = profiles.find(p => p.id === appointment.user_id) || {};
      const therapistProfile = therapists.find(t => t.id === appointment.therapist_id) || {};
      
      return {
        ...appointment,
        user_name: userProfile.name || 'İsimsiz Kullanıcı',
        therapist_name: therapistProfile.full_name || 'İsimsiz Psikolog'
      };
    });
    
    return result;
  },
  
  async updateAppointmentStatus(appointmentId, status) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Randevu durumunu güncelle
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async updateSystemSettings(settings) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Sistem ayarlarını güncelle
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        value: settings,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'general')
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async updateEmailSettings(settings) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // E-posta ayarlarını güncelle
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        value: settings,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'email')
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  async clearSystemCache() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Burada gerçek bir önbellek temizleme işlemi yapmanız gerekecek
    // Şimdilik başarılı olduğunu varsayalım
    return { success: true };
  },

  async getSystemSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // Sistem ayarlarını getir
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'general')
      .single();
    
    if (error) throw error;
    return data.value;
  },
  
  async getEmailSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Kullanıcının admin olup olmadığını kontrol et
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError) throw roleError;
    if (userRole.role !== 'admin') throw new Error('Bu işlem için yetkiniz bulunmamaktadır');
    
    // E-posta ayarlarını getir
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'email')
      .single();
    
    if (error) throw error;
    return data.value;
  },
}; 