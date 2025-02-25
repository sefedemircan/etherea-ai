import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Grid, Card, Text, Group, Button, Image, LoadingOverlay } from '@mantine/core';
import { IconMusic, IconVideo, IconBook } from '@tabler/icons-react';
import { recommendationsApi } from '../services/supabase';
import { notifications } from '@mantine/notifications';

function RecommendationCard({ item, onView }) {
  const [isViewing, setIsViewing] = useState(false);

  const handleView = async () => {
    setIsViewing(true);
    try {
      await onView(item.id);
      window.open(item.link, '_blank');
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Öneri işaretlenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsViewing(false);
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={item.image_url || `https://picsum.photos/seed/${item.id}/400/200`}
          height={160}
          alt={item.title}
        />
      </Card.Section>

      <Stack mt="md" spacing="sm">
        <Text fw={500}>{item.title}</Text>
        <Text size="sm" c="dimmed">
          {item.description}
        </Text>
        <Button
          variant="light"
          color="etherea.4"
          fullWidth
          mt="md"
          radius="md"
          onClick={handleView}
          loading={isViewing}
          styles={{
            root: {
              backgroundColor: '#F9F6FF',
              '&:hover': {
                backgroundColor: '#FFD8BE',
              },
            },
          }}
        >
          İncele
        </Button>
      </Stack>
    </Card>
  );
}

function RecommendationSection({ title, icon: Icon, items, onView }) {
  if (items.length === 0) return null;

  return (
    <Paper shadow="sm" p="md" radius="md" bg="#F9F6FF">
      <Group mb="md">
        <Icon size={24} color="#9A7BFF" />
        <Title order={4} c="#5E4B8B">{title}</Title>
      </Group>
      <Grid>
        {items.map((item) => (
          <Grid.Col key={item.id} span={{ base: 12, sm: 6 }}>
            <RecommendationCard item={item} onView={onView} />
          </Grid.Col>
        ))}
      </Grid>
    </Paper>
  );
}

function Recommendations() {
  const [recommendations, setRecommendations] = useState({
    music: [],
    meditation: [],
    reading: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const data = await recommendationsApi.getLatestRecommendations();
      const grouped = data.reduce((acc, item) => {
        acc[item.type].push(item);
        return acc;
      }, {
        music: [],
        meditation: [],
        reading: []
      });
      setRecommendations(grouped);
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Öneriler yüklenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      await recommendationsApi.markAsViewed(id);
      // Önerileri güncelle
      setRecommendations(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(type => {
          updated[type] = updated[type].filter(item => item.id !== id);
        });
        return updated;
      });
    } catch (error) {
      throw error; // RecommendationCard bileşeni tarafından yakalanacak
    }
  };

  const hasRecommendations = Object.values(recommendations).some(list => list.length > 0);

  return (
    <Stack spacing="lg" pos="relative">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      
      {hasRecommendations ? (
        <>
          <RecommendationSection
            title="Müzik Önerileri"
            icon={IconMusic}
            items={recommendations.music}
            onView={handleView}
          />
          <RecommendationSection
            title="Meditasyon Önerileri"
            icon={IconVideo}
            items={recommendations.meditation}
            onView={handleView}
          />
          <RecommendationSection
            title="Okuma Önerileri"
            icon={IconBook}
            items={recommendations.reading}
            onView={handleView}
          />
        </>
      ) : !isLoading && (
        <Paper shadow="sm" p="xl" radius="md">
          <Stack align="center" spacing="md">
            <Text size="lg" c="#5E4B8B" ta="center">
              Şu an için yeni bir öneri bulunmuyor
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Yeni günlük girdileri oluşturdukça size özel öneriler burada görünecek
            </Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default Recommendations; 