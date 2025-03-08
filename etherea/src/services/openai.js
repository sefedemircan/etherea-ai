import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const aiApi = {
  async analyzeEntry(content) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen bir terapist ve duygusal analiz uzmanısın. 
            Kullanıcının günlük girdisini analiz edip, duygu durumunu tespit et 
            ve yapıcı önerilerde bulun. Yanıtını JSON formatında ver:
            {
              "mood": 1-5 arası bir sayı (1: çok kötü, 5: çok iyi),
              "keywords": ["anahtar", "kelimeler"],
              "summary": "Kısa bir özet",
              "suggestions": ["öneri1", "öneri2"],
              "recommendations": {
                "music": [
                  {
                    "title": "Şarkı/Playlist adı",
                    "description": "Kısa açıklama",
                    "link": "spotify_url"
                  }
                ],
                "meditation": [
                  {
                    "title": "Meditasyon adı",
                    "description": "Kısa açıklama",
                    "link": "youtube_url"
                  }
                ],
                "reading": [
                  {
                    "title": "Kitap adı",
                    "description": "Kısa açıklama",
                    "link": "goodreads_url"
                  }
                ]
              }
            }`
          },
          {
            role: 'user',
            content
          }
        ],
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
      throw new Error('Günlük analizi yapılamadı');
    }
  },

  async analyzeVoice(transcript) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen bir ses analizi ve duygusal değerlendirme uzmanısın.
            Kullanıcının ses kaydından elde edilen metni analiz ederek, konuşma tonu, 
            kullanılan kelimeler ve ifade biçiminden duygu durumunu tespit et.
            Ses kaydı metne dönüştürüldüğü için, ses tonu bilgisi olmadığını dikkate al.
            Ancak kullanılan kelimeler, cümle yapıları ve ifade biçimlerinden duygu durumunu analiz et.
            Yanıtını JSON formatında ver:
            {
              "mood": 1-5 arası bir sayı (1: çok kötü, 5: çok iyi),
              "emotion_detected": "Tespit edilen ana duygu (örn: mutluluk, üzüntü, kaygı, öfke, nötr)",
              "confidence": 1-10 arası bir sayı (analiz güven seviyesi),
              "keywords": ["anahtar", "kelimeler"],
              "speech_patterns": ["Tespit edilen konuşma kalıpları"],
              "summary": "Kısa bir özet",
              "suggestions": ["öneri1", "öneri2"]
            }`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
      throw new Error('Ses analizi yapılamadı');
    }
  },

  async generateSummary(entries) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen bir terapist ve duygusal analiz uzmanısın.
            Kullanıcının son günlük girdilerini analiz edip genel bir özet çıkar.
            Olumlu yönleri vurgula ve yapıcı önerilerde bulun. Yanıtını JSON formatında ver:
            {
              "summary": "Genel durum özeti",
              "mood_analysis": "Duygu durumu analizi",
              "patterns": ["Tespit edilen pattern1", "pattern2"],
              "suggestions": ["öneri1", "öneri2"]
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(entries)
          }
        ],
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
      throw new Error('Özet oluşturulamadı');
    }
  },

  async generateRecommendations(mood, keywords) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen bir terapist ve kişisel gelişim uzmanısın. 
            Kullanıcının duygu durumu (${mood}/5) ve anahtar kelimeleri (${keywords.join(', ')}) 
            baz alarak kişiselleştirilmiş öneriler sun. Her öneri türü için 3 adet öneri yap.
            
            Öneriler şu kriterlere göre seçilmeli:
            - Müzik: Duygu durumuna uygun, rahatlatıcı veya motive edici şarkılar/playlistler
            - Meditasyon: Duygu durumunu dengeleyici veya iyileştirici meditasyon/nefes egzersizleri
            - Okuma: Kişisel gelişim, psikoloji veya motivasyon içerikli kitaplar/makaleler
            
            Yanıtını JSON formatında ver:
            {
              "music": [
                {
                  "title": "Şarkı/Playlist adı",
                  "description": "Neden bu öneriyi yaptığına dair detaylı açıklama",
                  "link": "spotify_url",
                  "image_url": "kapak_görseli_url"
                }
              ],
              "meditation": [
                {
                  "title": "Meditasyon/Video adı",
                  "description": "Neden bu öneriyi yaptığına dair detaylı açıklama",
                  "link": "youtube_url",
                  "image_url": "thumbnail_url"
                }
              ],
              "reading": [
                {
                  "title": "Kitap/Makale adı",
                  "description": "Neden bu öneriyi yaptığına dair detaylı açıklama",
                  "link": "goodreads_url/blog_url",
                  "image_url": "kitap_kapağı_url"
                }
              ]
            }`
          }
        ],
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
      throw new Error('Öneriler oluşturulamadı');
    }
  },
  
  async createPersonalizedAssistant(userData) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen kullanıcıya özel bir AI asistanısın. Kullanıcının geçmiş verileri, 
            duygu durumu, günlük içerikleri ve tercihleri hakkında bilgi sahibisin.
            Bu bilgilere dayanarak kişiselleştirilmiş, empatik ve yapıcı yanıtlar ver.
            Kullanıcının adıyla hitap et ve onun benzersiz ihtiyaçlarına odaklan.
            Yanıtını JSON formatında ver:
            {
              "message": "Kişiselleştirilmiş mesaj",
              "insights": "Kullanıcının durumu hakkında içgörüler",
              "suggestions": ["öneri1", "öneri2", "öneri3"],
              "daily_tip": "Günlük pratik bir tavsiye",
              "affirmation": "Olumlu bir doğrulama cümlesi"
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(userData)
          }
        ],
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Hatası:', error);
      throw new Error('Kişiselleştirilmiş asistan yanıtı oluşturulamadı');
    }
  }
}; 