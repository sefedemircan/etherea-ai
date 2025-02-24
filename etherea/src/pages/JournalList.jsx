import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Text, Group, ActionIcon, LoadingOverlay, Badge } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { journalApi } from '../services/supabase';
import { notifications } from '@mantine/notifications';

function JournalList() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await journalApi.getEntries();
      setEntries(data);
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Günlükler yüklenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu günlüğü silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await journalApi.deleteEntry(id);
      setEntries(entries.filter(entry => entry.id !== id));
      notifications.show({
        title: 'Başarılı',
        message: 'Günlük silindi',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Günlük silinirken bir hata oluştu',
        color: 'red',
      });
    }
  };

  const getMoodEmoji = (mood) => {
    const emojis = ['😞', '😕', '😐', '🙂', '😊'];
    return emojis[mood - 1];
  };

  return (
    <Stack spacing="lg" pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      
      <Title order={3} c="#5E4B8B">Günlüklerim</Title>

      {entries.length === 0 && !isLoading ? (
        <Paper shadow="sm" p="xl" radius="md">
          <Stack align="center" spacing="md">
            <Text size="lg" c="#5E4B8B" ta="center">
              Henüz bir günlük girişi bulunmuyor
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Yeni bir günlük yazmak için "Günlük Yaz" sayfasını kullanabilirsiniz
            </Text>
          </Stack>
        </Paper>
      ) : (
        entries.map((entry) => (
          <Paper key={entry.id} shadow="sm" p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Group>
                <Text fw={500} c="#5E4B8B">{new Date(entry.date).toLocaleDateString('tr-TR', { 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</Text>
                <Badge 
                  variant="light" 
                  color="etherea.4"
                  leftSection={getMoodEmoji(entry.mood)}
                >
                  {['Çok Kötü', 'Kötü', 'Normal', 'İyi', 'Çok İyi'][entry.mood - 1]}
                </Badge>
              </Group>
              <Group>
                <ActionIcon 
                  variant="light" 
                  color="etherea.4"
                  onClick={() => navigate(`/entry/${entry.date}`)}
                >
                  <IconPencil size={18} />
                </ActionIcon>
                <ActionIcon 
                  variant="light" 
                  color="red"
                  onClick={() => handleDelete(entry.id)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Text lineClamp={3} size="sm" mb="xs" c="etherea.7">
              {entry.content}
            </Text>

            {entry.keywords && entry.keywords.length > 0 && (
              <Group gap="xs" mt="md">
                {entry.keywords.map((keyword, index) => (
                  <Badge 
                    key={index}
                    variant="dot"
                    bg="etherea.2" 
                    c="etherea.4"
                    size="sm"
                    style={{border: 'transparent'}}
                  >
                    {keyword}
                  </Badge>
                ))}
              </Group>
            )}
          </Paper>
        ))
      )}
    </Stack>
  );
}

export default JournalList; 