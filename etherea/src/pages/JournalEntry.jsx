import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Paper, Stack, Title, Textarea, Button, Group, Text, LoadingOverlay, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSend, IconBrain, IconKeyboard, IconMicrophone } from '@tabler/icons-react';
import { journalApi, recommendationsApi } from '../services/supabase';
import { aiApi } from '../services/openai';
import VoiceRecorder from '../components/VoiceRecorder';

function JournalEntry() {
  const { date } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [existingEntry, setExistingEntry] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'text');

  useEffect(() => {
    if (date) {
      loadExistingEntry();
    }
  }, [date]);

  const loadExistingEntry = async () => {
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Geçersiz tarih formatı');
      }
      
      const formattedDate = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate()
      )).toISOString().split('T')[0];

      const entry = await journalApi.getEntryByDate(formattedDate);
      if (entry) {
        setExistingEntry(entry);
        setContent(entry.content);
        if (entry.ai_summary) {
          setAnalysis({
            mood: entry.mood,
            keywords: entry.keywords,
            summary: entry.ai_summary,
            suggestions: entry.ai_suggestions
          });
        }
      }
    } catch (error) {
      console.error('Günlük yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Günlük yüklenirken bir hata oluştu',
        color: 'red',
      });
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      notifications.show({
        title: 'Uyarı',
        message: 'Lütfen önce günlük içeriğini yazın',
        color: 'yellow',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await aiApi.analyzeEntry(content);
      setAnalysis(result);
      notifications.show({
        title: 'Başarılı',
        message: 'Günlük analizi tamamlandı',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Analiz yapılırken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      notifications.show({
        title: 'Uyarı',
        message: 'Lütfen günlük içeriğini yazın',
        color: 'yellow',
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const entryData = {
        content,
        date: currentDate,
        mood: analysis?.mood || 3,
        keywords: analysis?.keywords || [],
        ai_summary: analysis?.summary || null,
        ai_suggestions: analysis?.suggestions || []
      };

      let savedEntry;
      if (existingEntry) {
        savedEntry = await journalApi.updateEntry(existingEntry.id, entryData);
      } else {
        savedEntry = await journalApi.createEntry(entryData);
      }

      // Eski önerileri temizle
      await recommendationsApi.deleteOldRecommendations();

      // Yeni öneriler oluştur
      try {
        await recommendationsApi.createRecommendations(
          savedEntry.mood,
          savedEntry.keywords || []
        );

        notifications.show({
          title: 'Başarılı',
          message: 'Günlük kaydedildi ve öneriler oluşturuldu',
          color: 'green',
        });
      } catch (error) {
        console.error('Öneriler oluşturulurken hata:', error);
        notifications.show({
          title: 'Uyarı',
          message: 'Günlük kaydedildi fakat öneriler oluşturulamadı',
          color: 'yellow',
        });
      }

      navigate('/recommendations');
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Günlük kaydedilemedi',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceTranscription = (transcription) => {
    setContent(prev => prev ? `${prev}\n\n${transcription}` : transcription);
  };

  return (
    <Stack spacing="lg">
      <Paper shadow="sm" p="md" radius="md" pos="relative">
        <LoadingOverlay visible={isSaving} overlayProps={{ blur: 2 }} />
        <Title order={4} mb="md">
          {date ? `${date} Tarihli Günlük` : 'Yeni Günlük Girdisi'}
        </Title>

        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            <Tabs.Tab
              bg={activeTab === 'text' ? 'etherea.2' : 'transparent'}
              c="etherea.5"
              value="text"
              leftSection={<IconKeyboard size={16} />}
            >
              Yazı
            </Tabs.Tab>
            <Tabs.Tab
              bg={activeTab === 'voice' ? 'etherea.2' : 'transparent'}
              value="voice"
              c="etherea.5"
              leftSection={<IconMicrophone size={16} />}
            >
              Ses
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="text" pt="xs">
            <Textarea
              placeholder="Bugün nasıl hissediyorsun?"
              minRows={10}
              autosize
              value={content}
              onChange={(event) => setContent(event.currentTarget.value)}
              styles={{
                input: {
                  backgroundColor: '#F9F6FF',
                  color: '#5E4B8B',
                  border: '1px solid #E2D8FF',
                  '&:focus': {
                    borderColor: '#9A7BFF',
                  },
                  '&::placeholder': {
                    color: '#9A7BFF',
                  },
                },
              }}
            />
          </Tabs.Panel>

          <Tabs.Panel value="voice" pt="xs">
            <VoiceRecorder onTranscriptionComplete={handleVoiceTranscription} />
            {content && (
              <Paper shadow="xs" p="sm" radius="md" bg="etherea.1" mt="md">
                <Text fw={500} size="sm" c="etherea.7" mb="xs">Kaydedilen Metin:</Text>
                <Text c="etherea.6">{content}</Text>
              </Paper>
            )}
          </Tabs.Panel>
        </Tabs>

        <Group mt="md" justify="space-between">
          <Button
            leftSection={<IconBrain size={20} />}
            variant="light"
            onClick={handleAnalyze}
            loading={isAnalyzing}
          >
            AI ile Analiz Et
          </Button>
          <Button
            leftSection={<IconSend size={20} />}
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!content.trim()}
            bg="etherea.3"
            c="etherea.5"
          >
            Kaydet
          </Button>
        </Group>
      </Paper>

      {analysis && (
        <Paper shadow="sm" p="md" radius="md">
          <Title c="etherea.6" order={4} mb="md">AI Analizi</Title>
          <Stack spacing="md">
            <Group>
              <Text fw={500} c="etherea.5">Duygu Durumu:</Text>
              <Text c="#5E4B8B">{['Çok Kötü', 'Kötü', 'Normal', 'İyi', 'Çok İyi'][analysis.mood - 1]}</Text>
            </Group>
            
            <div>
              <Text fw={500} c="etherea.5" mb="xs">Anahtar Kelimeler:</Text>
              <Group gap="xs">
                {analysis.keywords.map((keyword, index) => (
                  <Text
                    key={index}
                    size="sm"
                    px="xs"
                    py={4}
                    bg="etherea.1"
                    c="etherea.5"
                    style={{ borderRadius: '4px' }}
                  >
                    {keyword}
                  </Text>
                ))}
              </Group>
            </div>

            <div>
              <Text fw={500} c="etherea.5" mb="xs">Özet:</Text>
              <Text size="sm" c="etherea.6">{analysis.summary}</Text>
            </div>

            <div>
              <Text fw={500} c="etherea.5" mb="xs">Öneriler:</Text>
              {analysis.suggestions.map((suggestion, index) => (
                <Text key={index} size="sm" c="etherea.6" mb="xs">
                  • {suggestion}
                </Text>
              ))}
            </div>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default JournalEntry; 