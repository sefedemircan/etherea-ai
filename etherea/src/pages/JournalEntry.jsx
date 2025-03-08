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
  const [voiceAnalysis, setVoiceAnalysis] = useState(null);

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
      // Eğer analiz yapılmadıysa, otomatik olarak yap
      let currentAnalysis = analysis;
      if (!currentAnalysis) {
        if (activeTab === 'voice' && voiceAnalysis) {
          currentAnalysis = {
            mood: voiceAnalysis.mood,
            keywords: voiceAnalysis.keywords,
            summary: voiceAnalysis.summary,
            suggestions: voiceAnalysis.suggestions
          };
        } else {
          const result = await aiApi.analyzeEntry(content);
          currentAnalysis = result;
        }
        setAnalysis(currentAnalysis);
      }

      const today = new Date().toISOString().split('T')[0];
      
      if (existingEntry) {
        await journalApi.updateEntry({
          id: existingEntry.id,
          content,
          mood: currentAnalysis.mood,
          keywords: currentAnalysis.keywords,
          ai_summary: currentAnalysis.summary,
          ai_suggestions: currentAnalysis.suggestions
        });
        notifications.show({
          title: 'Başarılı',
          message: 'Günlük güncellendi',
          color: 'green',
        });
      } else {
        await journalApi.createEntry({
          content,
          mood: currentAnalysis.mood,
          date: today,
          keywords: currentAnalysis.keywords,
          ai_summary: currentAnalysis.summary,
          ai_suggestions: currentAnalysis.suggestions
        });
        notifications.show({
          title: 'Başarılı',
          message: 'Günlük kaydedildi',
          color: 'green',
        });
      }
      
      navigate('/');
    } catch (error) {
      console.error('Günlük kaydedilirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Günlük kaydedilirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceTranscription = (transcript) => {
    setContent(transcript);
  };

  const handleVoiceAnalysis = (analysisResult) => {
    setVoiceAnalysis(analysisResult);
    // Ses analizinden gelen duygu durumu ve anahtar kelimeleri kullanarak analiz nesnesini güncelle
    setAnalysis({
      mood: analysisResult.mood,
      keywords: analysisResult.keywords,
      summary: analysisResult.summary,
      suggestions: analysisResult.suggestions
    });
  };

  return (
    <Stack spacing="md">
      <Title order={2}>Günlük Girişi</Title>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab c={activeTab === 'text' ? 'etherea.4' : 'dimmed'} bg={activeTab === 'text' ? 'etherea.1' : 'etherea.1'} value="text" leftSection={<IconKeyboard size={16} />}>
            Yazı
          </Tabs.Tab>
          <Tabs.Tab c={activeTab === 'voice' ? 'etherea.4' : 'dimmed'} bg={activeTab === 'voice' ? 'etherea.1' : 'etherea.1'} value="voice" leftSection={<IconMicrophone size={16} />}>
            Ses
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="text" pt="md">
          <Paper shadow="sm" p="md" radius="md" pos="relative">
            <LoadingOverlay visible={isSaving} overlayBlur={2} />
            <Textarea
              placeholder="Bugün nasıl hissettiğini yaz..."
              minRows={10}
              autosize
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<IconBrain size={20} />}
                onClick={handleAnalyze}
                loading={isAnalyzing}
                variant="light"
                color="etherea.4"
              >
                Analiz Et
              </Button>
              <Button
                leftSection={<IconSend size={20} />}
                onClick={handleSubmit}
                loading={isSaving}
              >
                Kaydet
              </Button>
            </Group>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="voice" pt="md">
          <VoiceRecorder 
            onTranscriptionComplete={handleVoiceTranscription} 
            onAnalysisComplete={handleVoiceAnalysis}
          />
          
          {content && (
            <Paper shadow="sm" p="md" radius="md" mt="md" pos="relative">
              <LoadingOverlay visible={isSaving} overlayBlur={2} />
              <Title order={4} mb="md">Metin Dökümü</Title>
              <Text c="dimmed">{content}</Text>
              <Group justify="flex-end" mt="md">
                <Button
                  c="etherea.4"
                  bg="etherea.1"
                  leftSection={<IconSend size={20} />}
                  onClick={handleSubmit}
                  loading={isSaving}
                >
                  Kaydet
                </Button>
              </Group>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>

      {analysis && (
        <Paper shadow="sm" p="md" radius="md">
          <Title order={4} mb="md">Analiz Sonuçları</Title>
          
          <Text c="dimmed" fw={600}>Duygu Durumu:</Text>
          <Text c="dimmed" fw={400} mb="md">{analysis.mood}/5</Text>
          
          <Text c="dimmed" fw={600}>Anahtar Kelimeler:</Text>
          <Text c="dimmed" fw={400} mb="md">{analysis.keywords.join(', ')}</Text>
          
          <Text c="dimmed" fw={600}>Özet:</Text>
          <Text c="dimmed" fw={400} mb="md">{analysis.summary}</Text>
          
          <Text c="dimmed" fw={600}>Öneriler:</Text>
          <ul style={{ color: '#828282' }}>
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </Paper>
      )}
    </Stack>
  );
}

export default JournalEntry; 