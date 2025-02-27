import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Group, Button, Stack, Title, Text, Grid, RingProgress, ActionIcon, Badge, Modal } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconPencil, IconMicrophone, IconUpload } from '@tabler/icons-react';
import { journalApi } from '../services/supabase';

function MoodWidget() {
  const [mood, setMood] = useState(5);
  const moods = ['😞', '😕', '😐', '🙂', '😊'];

  return (
    <Paper shadow="sm" p="md" radius="md">
      <Title order={4} mb="md">Bugünkü Ruh Halin Nasıl?</Title>
      <Group justify="center" gap="lg">
        {moods.map((emoji, index) => (
          <ActionIcon
            key={index}
            variant={mood === index ? 'filled' : 'subtle'}
            color={mood === index ? 'etherea.4' : 'etherea.2'}
            size="xl"
            onClick={() => setMood(index)}
          >
            <Text size="xl">{emoji}</Text>
          </ActionIcon>
        ))}
      </Group>
    </Paper>
  );
}

function QuickActions({ onNewEntry }) {
  return (
    <Paper shadow="sm" p="md" radius="md">
      <Title order={4} mb="md">Hızlı İşlemler</Title>
      <Group>
        <Button bg="etherea.1" leftSection={<IconPencil size={20} />} onClick={() => onNewEntry('text')}>
          Yazı
        </Button>
        <Button bg="etherea.2" leftSection={<IconMicrophone size={20} />} onClick={() => onNewEntry('voice')} disabled>
          Ses
        </Button>
        <Button bg="etherea.3" leftSection={<IconUpload size={20} />} onClick={() => onNewEntry('file')} disabled>
          Dosya
        </Button>
      </Group>
    </Paper>
  );
}

function Home() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moodStats, setMoodStats] = useState({
    positive: 0,
    neutral: 0,
    negative: 0
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await journalApi.getEntries();
      setEntries(data);

      // Duygu durumu istatistiklerini hesapla
      const stats = data.reduce((acc, entry) => {
        if (entry.mood >= 4) acc.positive += 1;
        else if (entry.mood === 3) acc.neutral += 1;
        else acc.negative += 1;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 });

      const total = data.length || 1;
      setMoodStats({
        positive: (stats.positive / total) * 100,
        neutral: (stats.neutral / total) * 100,
        negative: (stats.negative / total) * 100
      });
    } catch (error) {
      console.error('Günlükler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEntry = (type) => {
    navigate('/entry');
  };

  const getDayProps = (date) => {
    // Tarihi UTC'ye çevirip sadece YYYY-MM-DD kısmını alıyoruz
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ));
    const dateStr = utcDate.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === dateStr);
    
    if (!entry) return {};

    // Duygu durumuna göre renk belirleme
    let style = {
      backgroundColor: '#F9F6FF',
      position: 'relative'
    };

    if (entry.mood >= 4) {
      style.backgroundColor = 'rgba(154, 123, 255, 0.3)'; // Pozitif
    } else if (entry.mood === 3) {
      style.backgroundColor = 'rgba(181, 230, 246, 0.3)'; // Nötr
    } else {
      style.backgroundColor = 'rgba(255, 216, 190, 0.3)'; // Negatif
    }

    return {
      style,
      onClick: () => {
        setSelectedDate(date);
        // Modal veya yan panel açarak günlüğü göster
        setShowEntryModal(true);
        setSelectedEntry(entry);
      },
      "data-has-entry": "true"
    };
  };

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <Stack spacing="lg">
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <MoodWidget />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <QuickActions onNewEntry={handleNewEntry} />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper shadow="sm" p="md" radius="md">
            <Group position="apart" mb="md">
              <Title order={4}>Takvim</Title>
              <Group spacing="xs">
                <Badge style={{border: 'transparent'}} bg="etherea.4" color="etherea.6" variant="dot">Pozitif</Badge>
                <Badge style={{border: 'transparent'}} bg="serenity.4" color="serenity.6" variant="dot">Nötr</Badge>
                <Badge style={{border: 'transparent'}} bg="warmth.6" color="warmth.3" variant="dot">Negatif</Badge>
              </Group>
            </Group>
            <Calendar
              size="lg"
              value={selectedDate}
              onChange={setSelectedDate}
              getDayProps={getDayProps}
              styles={{
                day: {
                  '&[data-has-entry]': {
                    cursor: 'pointer',
                  }
                }
              }}
            />
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="md">Aylık Özet</Title>
            <Group justify="center">
              <RingProgress
                size={150}
                thickness={12}
                sections={[
                  { value: moodStats.positive, color: 'etherea.4' },
                  { value: moodStats.neutral, color: 'serenity.4' },
                  { value: moodStats.negative, color: 'warmth.6' },
                ]}
                label={
                  <Text ta="center" size="sm" c="etherea.6">
                    30 Günlük<br />Duygu Dağılımı
                  </Text>
                }
              />
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Günlük Detay Modalı */}
      {showEntryModal && selectedEntry && (
        <Modal
          opened={showEntryModal}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedEntry(null);
          }}
          title={
            <Group>
              <Text fw={500} c="etherea.7">
                {new Date(selectedEntry.date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
              <Badge 
                variant="light" 
                color={selectedEntry.mood >= 4 ? 'etherea.4' : selectedEntry.mood === 3 ? 'serenity.3' : 'warmth.3'}
              >
                {['Çok Kötü', 'Kötü', 'Normal', 'İyi', 'Çok İyi'][selectedEntry.mood - 1]}
              </Badge>
            </Group>
          }
          size="lg"
          styles={{
            header: {
              backgroundColor: '#F9F6FF',
              borderBottom: '1px solid #E2D8FF',
            },
            close: {
              color: '#5E4B8B',
              '&:hover': {
                backgroundColor: '#E2D8FF'
              }
            }
          }}
        >
          <Stack spacing="md">
            <Text mt={20} c="etherea.5">{selectedEntry.content}</Text>
            
            {selectedEntry.keywords && selectedEntry.keywords.length > 0 && (
              <div>
                <Text fw={500} size="sm" c="etherea.8" mb="xs">Anahtar Kelimeler:</Text>
                <Group gap="xs">
                  {selectedEntry.keywords.map((keyword, index) => (
                    <Badge style={{border: 'transparent'}} key={index} bg="etherea.6" variant="dot" color="etherea.4">
                      {keyword}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}

            {selectedEntry.ai_summary && (
              <div>
                <Text fw={500} size="sm" c="etherea.8" mb="xs">AI Özeti:</Text>
                <Text c="etherea.6" size="sm">{selectedEntry.ai_summary}</Text>
              </div>
            )}

            <Group position="right">
              <Button 
                variant="light" 
                color="etherea.4"
                onClick={() => navigate(`/entry/${selectedEntry.date}`)}
                leftSection={<IconPencil size={16} />}
              >
                Düzenle
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default Home; 