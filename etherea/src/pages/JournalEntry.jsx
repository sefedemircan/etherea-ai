import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Stack, Title, Textarea, Button, Group, Text, LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSend, IconBrain } from '@tabler/icons-react';
import { journalApi } from '../services/supabase';
import { aiApi } from '../services/openai';

function JournalEntry() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [existingEntry, setExistingEntry] = useState(null);

  useEffect(() => {
    if (date) {
      loadExistingEntry();
    }
  }, [date]);

  const loadExistingEntry = async () => {
    try {
      const entry = await journalApi.getEntryByDate(date);
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
      const entryData = {
        content,
        date: date || new Date().toISOString().split('T')[0],
        mood: analysis?.mood || 3,
        keywords: analysis?.keywords || [],
        ai_summary: analysis?.summary || null,
        ai_suggestions: analysis?.suggestions || []
      };

      if (existingEntry) {
        await journalApi.updateEntry(existingEntry.id, entryData);
      } else {
        await journalApi.createEntry(entryData);
      }

      notifications.show({
        title: 'Başarılı',
        message: 'Günlük kaydedildi',
        color: 'green',
      });

      navigate('/');
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

  return (
    <Stack spacing="lg">
      <Paper shadow="sm" p="md" radius="md" pos="relative">
        <LoadingOverlay visible={isSaving} overlayProps={{ blur: 2 }} />
        <Title order={4} mb="md">
          {date ? `${date} Tarihli Günlük` : 'Yeni Günlük Girdisi'}
        </Title>
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
          >
            Kaydet
          </Button>
        </Group>
      </Paper>

      {analysis && (
        <Paper shadow="sm" p="md" radius="md">
          <Title order={4} mb="md">AI Analizi</Title>
          <Stack spacing="md">
            <Group>
              <Text fw={500}>Duygu Durumu:</Text>
              <Text>{['Çok Kötü', 'Kötü', 'Normal', 'İyi', 'Çok İyi'][analysis.mood - 1]}</Text>
            </Group>
            
            <div>
              <Text fw={500} mb="xs">Anahtar Kelimeler:</Text>
              <Group gap="xs">
                {analysis.keywords.map((keyword, index) => (
                  <Text
                    key={index}
                    size="sm"
                    px="xs"
                    py={4}
                    bg="etherea.1"
                    style={{ borderRadius: '4px' }}
                  >
                    {keyword}
                  </Text>
                ))}
              </Group>
            </div>

            <div>
              <Text fw={500} mb="xs">Özet:</Text>
              <Text size="sm">{analysis.summary}</Text>
            </div>

            <div>
              <Text fw={500} mb="xs">Öneriler:</Text>
              {analysis.suggestions.map((suggestion, index) => (
                <Text key={index} size="sm" mb="xs">
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