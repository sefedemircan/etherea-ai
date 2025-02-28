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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          role: 'therapist'
        }
      }
    });

    if (authError) throw authError;

    // Profil oluşturmayı kaldırıyoruz çünkü bu işlemi
    // database trigger ile yapacağız

    return authData;
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