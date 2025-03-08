import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Group, Button, Stack, Title, Text, Grid, RingProgress, ActionIcon, Badge, Modal } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconPencil, IconMicrophone, IconUpload } from '@tabler/icons-react';
import { journalApi } from '../services/supabase';
import PersonalAssistant from '../components/PersonalAssistant';

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
        <Button bg="etherea.2" leftSection={<IconMicrophone size={20} />} onClick={() => onNewEntry('voice')}>
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
    if (type === 'voice') {
      navigate('/entry', { state: { initialTab: 'voice' } });
    } else {
      navigate('/entry');
    }
  };

  const getDayProps = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === formattedDate);
    
    if (entry) {
      let color;
      if (entry.mood >= 4) color = 'green';
      else if (entry.mood === 3) color = 'blue';
      else color = 'red';
      
      return {
        bg: `${color}.1`,
        style: { color: `var(--mantine-color-${color}-filled)` }
      };
    }
    
    return {};
  };

  const handleDateClick = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === formattedDate);
    
    if (entry) {
      navigate(`/entry/${formattedDate}`);
    } else {
      setSelectedDate(date);
      handleNewEntry('text');
    }
  };

  return (
    <Stack spacing="lg">
      <Title order={2}>Merhaba!</Title>
      
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack spacing="md">
            <PersonalAssistant />
            
            <MoodWidget />
            
            <QuickActions onNewEntry={handleNewEntry} />
            
            <Paper shadow="sm" p="md" radius="md">
              <Title order={4} mb="md">Duygu Durumu Özeti</Title>
              <Group justify="center" align="center">
                <RingProgress
                  size={150}
                  thickness={16}
                  roundCaps
                  sections={[
                    { value: moodStats.positive, color: 'green' },
                    { value: moodStats.neutral, color: 'blue' },
                    { value: moodStats.negative, color: 'red' }
                  ]}
                  label={
                    <Text ta="center" size="sm" fw={500}>
                      {entries.length} Günlük
                    </Text>
                  }
                />
                <Stack spacing={5}>
                  <Group gap="xs">
                    <Badge color="green">Olumlu</Badge>
                    <Text size="sm">{Math.round(moodStats.positive)}%</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="blue">Nötr</Badge>
                    <Text size="sm">{Math.round(moodStats.neutral)}%</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="red">Olumsuz</Badge>
                    <Text size="sm">{Math.round(moodStats.negative)}%</Text>
                  </Group>
                </Stack>
              </Group>
            </Paper>
          </Stack>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="md">Takvim</Title>
            <Calendar
              fullWidth
              getDayProps={getDayProps}
              onDateClick={handleDateClick}
              styles={{
                day: {
                  '&[data-selected]': {
                    backgroundColor: 'var(--mantine-color-etherea-4)',
                    color: 'var(--mantine-color-white)',
                  },
                },
              }}
            />
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default Home; 