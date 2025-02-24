import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Group, Button, Stack, Title, Text, Grid, RingProgress, ActionIcon } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconPencil, IconMicrophone, IconUpload } from '@tabler/icons-react';

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

  const handleNewEntry = (type) => {
    navigate('/entry');
  };

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
            <Title order={4} mb="md">Takvim</Title>
            <Calendar
              size="lg"
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                if (date) navigate(`/entry/${date.toISOString().split('T')[0]}`);
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
                  { value: 40, color: '#9A7BFF' },
                  { value: 30, color: '#B5E6F6' },
                  { value: 30, color: '#FFD8BE' },
                ]}
                label={
                  <Text ta="center" size="sm">
                    30 Günlük<br />Duygu Dağılımı
                  </Text>
                }
              />
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default Home; 