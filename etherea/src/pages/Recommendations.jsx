import { Paper, Stack, Title, Grid, Card, Text, Group, Button, Image } from '@mantine/core';
import { IconMusic, IconVideo, IconBook } from '@tabler/icons-react';

const mockRecommendations = {
  music: [
    {
      title: 'Rahatlatıcı Klasik Müzik',
      description: 'Bach - Air on the G String',
      image: 'https://picsum.photos/200/100',
      link: 'https://open.spotify.com',
    },
    {
      title: 'Pozitif Enerji Playlist',
      description: 'Günün enerjisini yükseltecek şarkılar',
      image: 'https://picsum.photos/200/100',
      link: 'https://open.spotify.com',
    },
  ],
  meditation: [
    {
      title: '10 Dakikalık Nefes Egzersizi',
      description: 'Stres azaltıcı nefes teknikleri',
      image: 'https://picsum.photos/200/100',
      link: 'https://youtube.com',
    },
    {
      title: 'Akşam Meditasyonu',
      description: 'Rahat bir uyku için rehberli meditasyon',
      image: 'https://picsum.photos/200/100',
      link: 'https://youtube.com',
    },
  ],
  reading: [
    {
      title: 'Kendini Keşfet',
      description: 'Kişisel gelişim ve farkındalık üzerine bir kitap',
      image: 'https://picsum.photos/200/100',
      link: 'https://goodreads.com',
    },
    {
      title: 'Pozitif Psikoloji',
      description: 'Mutluluğun bilimsel temelleri',
      image: 'https://picsum.photos/200/100',
      link: 'https://goodreads.com',
    },
  ],
};

function RecommendationCard({ item }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={item.image}
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
          component="a"
          href={item.link}
          target="_blank"
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

function RecommendationSection({ title, icon: Icon, items }) {
  return (
    <Paper shadow="sm" p="md" radius="md" bg="#F9F6FF">
      <Group mb="md">
        <Icon size={24} color="#9A7BFF" />
        <Title order={4} c="#5E4B8B">{title}</Title>
      </Group>
      <Grid>
        {items.map((item, index) => (
          <Grid.Col key={index} span={{ base: 12, sm: 6 }}>
            <RecommendationCard item={item} />
          </Grid.Col>
        ))}
      </Grid>
    </Paper>
  );
}

function Recommendations() {
  return (
    <Stack spacing="lg">
      <RecommendationSection
        title="Müzik Önerileri"
        icon={IconMusic}
        items={mockRecommendations.music}
      />
      <RecommendationSection
        title="Meditasyon Önerileri"
        icon={IconVideo}
        items={mockRecommendations.meditation}
      />
      <RecommendationSection
        title="Okuma Önerileri"
        icon={IconBook}
        items={mockRecommendations.reading}
      />
    </Stack>
  );
}

export default Recommendations; 