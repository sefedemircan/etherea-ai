import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Stack, Title, Textarea, Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSend, IconBrain } from '@tabler/icons-react';

function JournalEntry() {
  const { date } = useParams();
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleSubmit = async () => {
    try {
      // TODO: API entegrasyonu
      notifications.show({
        title: 'Başarılı',
        message: 'Günlük kaydedildi',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Günlük kaydedilemedi',
        color: 'red',
      });
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // TODO: OpenAI API entegrasyonu
      setSuggestions([
        'Bugün oldukça stresli görünüyorsun. Biraz meditasyon yapmayı düşünebilirsin.',
        'Son zamanlarda sık sık aileden bahsediyorsun. Onlarla daha fazla vakit geçirmek iyi gelebilir.',
      ]);
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Analiz yapılamadı',
        color: 'red',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Stack spacing="lg">
      <Paper shadow="sm" p="md" radius="md">
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
            disabled={!content.trim()}
          >
            Kaydet
          </Button>
        </Group>
      </Paper>

      {suggestions.length > 0 && (
        <Paper shadow="sm" p="md" radius="md">
          <Title order={4} mb="md">AI Önerileri</Title>
          <Stack>
            {suggestions.map((suggestion, index) => (
              <Text key={index} size="sm">
                • {suggestion}
              </Text>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default JournalEntry; 