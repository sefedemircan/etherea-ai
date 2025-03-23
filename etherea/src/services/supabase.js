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

  async getEntries(limit = 100) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getEntryByDate(date) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateEntry({ id, content, mood, keywords, ai_summary, ai_suggestions }) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        content,
        mood,
        keywords,
        ai_summary,
        ai_suggestions,
        updated_at: new Date()
      })
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
  
  async getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Kullanıcı oturumu bulunamadı');
    
    // Profil bilgilerini al
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Profil bilgileri alınırken hata:', error);
      // Profil bulunamadıysa temel kullanıcı bilgilerini döndür
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: user.created_at
      };
    }
    
    return {
      ...profile,
      email: user.email
    };
  }
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

// Kullanıcı Randevu API'si
export const appointmentApi = {
  // Kullanıcının randevularını getir
  async getUserAppointments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Kullanıcının randevularını getir
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      // Terapist bilgilerini getir
      const therapistIds = [...new Set(appointments.map(a => a.therapist_id))];
      
      const { data: therapists, error: therapistsError } = await supabase
        .from('therapist_profiles')
        .select('id, full_name, specializations')
        .in('id', therapistIds);

      if (therapistsError) throw therapistsError;

      // Verileri birleştir
      return appointments.map(appointment => {
        const therapist = therapists.find(t => t.id === appointment.therapist_id) || {};
        return {
          ...appointment,
          therapist_name: therapist.full_name || 'İsimsiz Terapist',
          therapist_specialization: therapist.specializations
        };
      });
    } catch (error) {
      console.error('Randevular alınırken hata oluştu:', error);
      throw error;
    }
  },

  // Tüm aktif terapistleri getir (user interface için)
  async getAllTherapists() {
    try {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('id, full_name, specializations, title, is_active, is_verified')
        .eq('is_active', true)
        .eq('is_verified', true);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Terapist listesi alınırken hata oluştu:', error);
      throw error;
    }
  },

  // Terapist için randevuları getir
  async getTherapistAppointments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Kullanıcının terapist olup olmadığını kontrol et
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (roleError) throw roleError;
      if (userRole.role !== 'therapist') throw new Error('Bu işlem için terapist olmanız gerekiyor');

      // Terapistin randevularını getir
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('therapist_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      // Kullanıcı bilgilerini getir
      const userIds = [...new Set(appointments.map(a => a.user_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Verileri birleştir
      return appointments.map(appointment => {
        const profile = profiles.find(p => p.id === appointment.user_id) || {};
        return {
          ...appointment,
          user_name: profile.name || 'İsimsiz Kullanıcı',
          user_avatar: profile.avatar_url
        };
      });
    } catch (error) {
      console.error('Terapist randevuları alınırken hata oluştu:', error);
      throw error;
    }
  },

  // Yeni randevu oluştur
  async createAppointment(appointmentData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          therapist_id: appointmentData.therapist_id,
          appointment_date: appointmentData.appointment_date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          session_type: appointmentData.session_type || 'online',
          notes: appointmentData.notes,
          status: 'pending'
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Randevu oluşturulurken hata oluştu:', error);
      throw error;
    }
  },

  // Randevu durumunu güncelle (kullanıcı)
  async updateAppointmentStatus(appointmentId, status) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Randevunun kullanıcıya ait olup olmadığını kontrol et
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('user_id')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      if (appointment.user_id !== user.id) throw new Error('Bu randevuyu güncelleme yetkiniz bulunmamaktadır');

      // Randevu durumunu güncelle
      const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Randevu durumu güncellenirken hata oluştu:', error);
      throw error;
    }
  },

  // Terapist randevu durumunu güncelle
  async therapistUpdateAppointment(appointmentId, updateData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Kullanıcının terapist olup olmadığını kontrol et
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (roleError) throw roleError;
      if (userRole.role !== 'therapist') throw new Error('Bu işlem için terapist olmanız gerekiyor');

      // Randevunun terapiste ait olup olmadığını kontrol et
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('therapist_id')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      if (appointment.therapist_id !== user.id) throw new Error('Bu randevuyu güncelleme yetkiniz bulunmamaktadır');

      // Randevuyu güncelle
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Terapist randevu güncellemesinde hata oluştu:', error);
      throw error;
    }
  },

  // Kullanıcı için randevu iptal etme
  async cancelAppointment(appointmentId, reason) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Randevunun kullanıcıya ait olup olmadığını kontrol et
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('user_id, status')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      if (appointment.user_id !== user.id) throw new Error('Bu randevuyu iptal etme yetkiniz bulunmamaktadır');
      
      // Onaylanmış randevular sadece belirli bir süre öncesine kadar iptal edilebilir
      if (appointment.status === 'confirmed') {
        // Randevu tarihini kontrol et
        const appointmentDate = new Date(appointment.appointment_date);
        const now = new Date();
        const hoursDifference = (appointmentDate - now) / (1000 * 60 * 60);
        
        if (hoursDifference < 24) {
          throw new Error('Onaylanmış randevular en az 24 saat öncesinden iptal edilebilir');
        }
      }

      // Randevuyu iptal et
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          notes: reason || 'Kullanıcı tarafından iptal edildi'
        })
        .eq('id', appointmentId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Randevu iptal edilirken hata oluştu:', error);
      throw error;
    }
  },

  // Terapist için boş saatleri getir
  async getTherapistAvailability(therapistId, date) {
    try {
      // Terapistin o günkü randevularını getir
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('therapist_id', therapistId)
        .eq('appointment_date', date)
        .in('status', ['confirmed', 'pending']);

      if (error) throw error;

      // Terapistin çalışma saatlerini getir (örnek olarak 09:00-17:00 arası)
      const workingHours = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
        { start: '13:00', end: '14:00' },
        { start: '14:00', end: '15:00' },
        { start: '15:00', end: '16:00' },
        { start: '16:00', end: '17:00' },
      ];

      // Müsait olmayan saatleri filtrele
      return workingHours.filter(slot => {
        return !appointments.some(appointment => 
          appointment.start_time === slot.start && appointment.end_time === slot.end
        );
      });
    } catch (error) {
      console.error('Terapist uygunluğu alınırken hata oluştu:', error);
      throw error;
    }
  }
};

// Video Oturum API'si
export const videoSessionApi = {
  // Video oturumu oluştur
  async createVideoSession(appointmentId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Randevuyu kontrol et
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('id, user_id, therapist_id, status, session_type')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      
      // Randevunun kullanıcıya veya terapiste ait olduğunu kontrol et
      if (appointment.user_id !== user.id && appointment.therapist_id !== user.id) {
        throw new Error('Bu randevu için video oturumu oluşturma yetkiniz yok');
      }

      // Randevunun durumunu ve tipini kontrol et
      if (appointment.status !== 'confirmed') {
        throw new Error('Sadece onaylanmış randevular için video oturumu oluşturulabilir');
      }

      if (appointment.session_type !== 'online') {
        throw new Error('Sadece çevrimiçi randevular için video oturumu oluşturulabilir');
      }

      // Benzersiz bir oda adı oluştur
      const roomName = `etherea-${appointmentId}-${Date.now()}`;

      // Video oturumu oluştur
      const { data: videoSession, error } = await supabase
        .from('video_sessions')
        .insert({
          appointment_id: appointmentId,
          room_name: roomName,
          created_by: user.id,
          status: 'created'
        })
        .select();

      if (error) throw error;

      // Randevuyu güncelle
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          session_link: `/video/${roomName}`,
          session_id: videoSession[0].id
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      return videoSession[0];
    } catch (error) {
      console.error('Video oturumu oluşturulurken hata oluştu:', error);
      throw error;
    }
  },

  // Video oturumu getir
  async getVideoSession(roomName) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Video oturumunu getir
      const { data: videoSession, error } = await supabase
        .from('video_sessions')
        .select('*, appointments(*)')
        .eq('room_name', roomName)
        .single();

      if (error) throw error;

      // Kullanıcının yetkisini kontrol et
      const appointment = videoSession.appointments;
      if (appointment.user_id !== user.id && appointment.therapist_id !== user.id) {
        throw new Error('Bu video oturumuna erişim yetkiniz yok');
      }

      return videoSession;
    } catch (error) {
      console.error('Video oturumu alınırken hata oluştu:', error);
      throw error;
    }
  },

  // Video oturumu durumunu güncelle
  async updateVideoSessionStatus(sessionId, status) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Video oturumunu getir
      const { data: videoSession, error: sessionError } = await supabase
        .from('video_sessions')
        .select('*, appointments(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Kullanıcının yetkisini kontrol et
      const appointment = videoSession.appointments;
      if (appointment.user_id !== user.id && appointment.therapist_id !== user.id) {
        throw new Error('Bu video oturumunu güncelleme yetkiniz yok');
      }

      // Durumu güncelle
      const { data, error } = await supabase
        .from('video_sessions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Video oturumu durumu güncellenirken hata oluştu:', error);
      throw error;
    }
  },

  // Video oturumu kaydını günlüğe ekle
  async saveVideoSessionRecording(sessionId, recordingUrl) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Video oturumunu getir
      const { data: videoSession, error: sessionError } = await supabase
        .from('video_sessions')
        .select('*, appointments(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Kullanıcının terapist olduğunu kontrol et
      if (videoSession.appointments.therapist_id !== user.id) {
        throw new Error('Sadece terapist video oturumu kaydı ekleyebilir');
      }

      // Kaydı ekle
      const { data, error } = await supabase
        .from('video_sessions')
        .update({ 
          recording_url: recordingUrl,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Video oturumu kaydı eklenirken hata oluştu:', error);
      throw error;
    }
  }
};

export default supabase; 