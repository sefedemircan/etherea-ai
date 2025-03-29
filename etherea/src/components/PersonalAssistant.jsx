import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Group, 
  Avatar, 
  Stack, 
  Loader, 
  Accordion,
  Badge,
  Divider,
  ActionIcon,
  Tooltip,
  Textarea
} from '@mantine/core';
import { 
  IconRefresh, 
  IconSend, 
  IconBulb, 
  IconHeartHandshake, 
  IconChartLine 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { aiApi } from '../services/openai';
import { journalApi } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// Asistanın önbellek süresi (milisaniye cinsinden, 30 dakika)
const ASSISTANT_CACHE_DURATION = 30 * 60 * 1000;

function PersonalAssistant() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    // Önbellekten asistan verilerini yükleme
    const loadCachedAssistant = () => {
      try {
        const cachedData = localStorage.getItem('etherea_assistant');
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = new Date().getTime();
          // Önbellek süresi dolmadıysa, önbellekten yükle
          if (now - timestamp < ASSISTANT_CACHE_DURATION) {
            setAssistant(data.assistant);
            setUserData(data.userData);
            setLoading(false);
            return true; // Önbellekten yüklendi
          }
        }
        return false; // Önbellekten yüklenmedi
      } catch (error) {
        console.error('Önbellek okuma hatası:', error);
        return false;
      }
    };

    // Önbellekte geçerli veri yoksa yeni veri yükle
    if (!loadCachedAssistant()) {
      loadUserData();
    }
  }, [user]);

  // Asistan verilerini önbelleğe kaydetme
  const cacheAssistantData = (userData, assistant) => {
    try {
      const cacheData = {
        data: { userData, assistant },
        timestamp: new Date().getTime()
      };
      localStorage.setItem('etherea_assistant', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Önbellek yazma hatası:', error);
    }
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Kullanıcının son 10 günlük girdisini al
      const entries = await journalApi.getEntries(10);
      
      // Kullanıcı profil bilgilerini al
      const profile = await journalApi.getUserProfile();
      
      // Kullanıcının duygu durumu istatistiklerini hesapla
      const moodStats = calculateMoodStats(entries);
      
      // Kullanıcının en sık kullandığı anahtar kelimeleri bul
      const frequentKeywords = findFrequentKeywords(entries);
      
      // Kullanıcı verilerini birleştir
      const userData = {
        profile,
        entries,
        moodStats,
        frequentKeywords,
        lastEntry: entries.length > 0 ? entries[0] : null,
        timestamp: new Date().toISOString()
      };
      
      setUserData(userData);
      
      // Kişiselleştirilmiş asistanı oluştur
      const assistantResponse = await aiApi.createPersonalizedAssistant(userData);
      setAssistant(assistantResponse);
      
      // Asistan verilerini önbelleğe kaydet
      cacheAssistantData(userData, assistantResponse);
    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Kişisel asistan yüklenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMoodStats = (entries) => {
    if (!entries.length) return { average: 0, trend: 'stable', positive: 0, negative: 0, neutral: 0 };
    
    const moodSum = entries.reduce((sum, entry) => sum + entry.mood, 0);
    const average = moodSum / entries.length;
    
    // Duygu durumu trendi (son 3 giriş)
    let trend = 'stable';
    if (entries.length >= 3) {
      const recent = entries.slice(0, 3).map(e => e.mood);
      if (recent[0] > recent[1] && recent[1] > recent[2]) {
        trend = 'improving';
      } else if (recent[0] < recent[1] && recent[1] < recent[2]) {
        trend = 'declining';
      }
    }
    
    // Duygu durumu dağılımı
    const counts = entries.reduce((acc, entry) => {
      if (entry.mood >= 4) acc.positive++;
      else if (entry.mood <= 2) acc.negative++;
      else acc.neutral++;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });
    
    return {
      average,
      trend,
      positive: (counts.positive / entries.length) * 100,
      negative: (counts.negative / entries.length) * 100,
      neutral: (counts.neutral / entries.length) * 100
    };
  };

  const findFrequentKeywords = (entries) => {
    // Tüm anahtar kelimeleri birleştir
    const allKeywords = entries.flatMap(entry => entry.keywords || []);
    
    // Anahtar kelimelerin frekansını hesapla
    const keywordCounts = allKeywords.reduce((acc, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {});
    
    // Frekansa göre sırala ve en sık kullanılan 10 kelimeyi döndür
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Önbelleği temizle
      localStorage.removeItem('etherea_assistant');
      
      await loadUserData();
      notifications.show({
        title: 'Başarılı',
        message: 'Kişisel asistan yenilendi',
        color: 'green',
      });
    } catch (error) {
      console.error('Asistan yenilenirken hata:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      // Kullanıcı mesajını mevcut verilere ekle
      const updatedUserData = {
        ...userData,
        userMessage,
        timestamp: new Date().toISOString()
      };
      
      // Yeni asistan yanıtı al
      const assistantResponse = await aiApi.createPersonalizedAssistant(updatedUserData);
      setAssistant(assistantResponse);
      setUserMessage('');
      
      // Asistan verilerini önbelleğe kaydet
      cacheAssistantData(updatedUserData, assistantResponse);
      
      notifications.show({
        title: 'Başarılı',
        message: 'Asistan yanıt verdi',
        color: 'green',
      });
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Mesajınız iletilemedi',
        color: 'red',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <Paper shadow="sm" p="xl" radius="md">
        <Stack align="center" spacing="md">
          <Loader color="etherea.4" size="md" />
          <Text>Kişisel asistanınız hazırlanıyor...</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md">
      <Group position="apart" mb="md">
        <Group>
          <Avatar 
            size="md" 
            color="etherea.4" 
            radius="xl"
          >
            <IconHeartHandshake size={24} />
          </Avatar>
          <div>
            <Title order={4}>Kişisel Asistanınız</Title>
            <Text size="sm" c="dimmed">Size özel tavsiyeler ve içgörüler</Text>
          </div>
        </Group>
        <Tooltip label="Yenile">
          <ActionIcon 
            color="etherea.4" 
            onClick={handleRefresh} 
            loading={refreshing}
            variant="light"
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {assistant && (
        <Stack spacing="md">
          <Paper shadow="xs" p="md" radius="md" bg="etherea.1">
            <Text c="dimmed" fw={500} mb="sm">{assistant.message}</Text>
            <Badge color="serenity.4" mb="md">Günlük Tavsiye: {assistant.daily_tip}</Badge>
            <Text fs="italic" size="sm" c="etherea.6">{assistant.affirmation}</Text>
          </Paper>

          <Accordion
            variant="separated"
            radius="md"
            styles={{
              item: {
                backgroundColor: 'var(--mantine-color-etherea-0)',
                border: '1px solid var(--mantine-color-etherea-2)',
                marginBottom: '8px',
                '&[dataActive]': {
                  backgroundColor: 'var(--mantine-color-etherea-0)'
                }
              },
              control: {
                padding: '12px 16px',
                '&:hover': {
                  backgroundColor: 'var(--mantine-color-etherea-1) !important'
                }
              },
              chevron: {
                color: 'var(--mantine-color-etherea-4)'
              },
              panel: {
                padding: '1px',
                backgroundColor: 'var(--mantine-color-etherea-0)'
              }
            }}
          >
            <Accordion.Item value="insights">
              <Accordion.Control c="etherea.4" icon={<IconChartLine size={20} />}>
                İçgörüler
              </Accordion.Control>
              <Accordion.Panel>
                <Text c="dimmed" size="sm">{assistant.insights}</Text>
              </Accordion.Panel>
            </Accordion.Item>
          
            <Accordion.Item value="suggestions">
              <Accordion.Control c="etherea.4" icon={<IconBulb size={20} />}>
                Öneriler
              </Accordion.Control>
              <Accordion.Panel>
                <ul>
                  {assistant.suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <Text c="dimmed" size="sm">{suggestion}</Text>
                    </li>
                  ))}
                </ul>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Divider my="sm" label="Asistanınızla Konuşun" labelPosition="center" />
          
          <Group align="flex-start">
            <Textarea
              placeholder="Asistanınıza bir soru sorun veya düşüncelerinizi paylaşın..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              minRows={2}
              style={{ flexGrow: 1 }}
            />
            <Button
              leftSection={<IconSend size={16} />}
              onClick={handleSendMessage}
              loading={sendingMessage}
              disabled={!userMessage.trim()}
              color="warmth.6"
              className="send-button"
            >
              Gönder
            </Button>
          </Group>
        </Stack>
      )}
    </Paper>
  );
}

export default PersonalAssistant; 