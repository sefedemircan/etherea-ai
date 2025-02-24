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
            content: `Kullanıcının duygu durumu (${mood}/5) ve anahtar kelimeleri (${keywords.join(', ')}) 
            baz alarak kişiselleştirilmiş öneriler sun. Yanıtını JSON formatında ver:
            {
              "music": [
                {
                  "title": "Şarkı/Playlist adı",
                  "description": "Neden bu öneriyi yaptığına dair açıklama",
                  "link": "spotify_url"
                }
              ],
              "meditation": [
                {
                  "title": "Meditasyon adı",
                  "description": "Neden bu öneriyi yaptığına dair açıklama",
                  "link": "youtube_url"
                }
              ],
              "reading": [
                {
                  "title": "Kitap adı",
                  "description": "Neden bu öneriyi yaptığına dair açıklama",
                  "link": "goodreads_url"
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
  }
}; 