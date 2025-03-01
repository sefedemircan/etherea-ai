import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  SimpleGrid,
  Text,
  Group,
  RingProgress,
  Stack,
  Loader,
  Alert,
} from '@mantine/core';
import {
  IconUsers,
  IconUserCheck,
  IconCalendarStats,
  IconAlertCircle,
} from '@tabler/icons-react';
import { adminApi } from '../../services/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await adminApi.getSystemStats();
        setStats(data);
      } catch (err) {
        console.error('İstatistikler yüklenirken hata:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center" py="xl">
          <Loader color="etherea.4" size="lg" />
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Hata" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  const statCards = [
    {
      title: 'Toplam Kullanıcı',
      value: stats?.userCount || 0,
      icon: <IconUsers size={30} color="#9A7BFF" />,
      color: 'etherea.3',
    },
    {
      title: 'Toplam Psikolog',
      value: stats?.therapistCount || 0,
      icon: <IconUserCheck size={30} color="#8ED5F0" />,
      color: 'serenity.3',
    },
    {
      title: 'Onay Bekleyen Psikologlar',
      value: stats?.pendingTherapistCount || 0,
      icon: <IconUserCheck size={30} color="#FF802E" />,
      color: 'warmth.7',
    },
    {
      title: 'Toplam Randevu',
      value: stats?.appointmentCount || 0,
      icon: <IconCalendarStats size={30} color="#9A7BFF" />,
      color: 'etherea.3',
    },
  ];

  // Onay oranı hesaplama
  const verifiedTherapists = stats?.therapistCount - stats?.pendingTherapistCount;
  const verificationRate = stats?.therapistCount > 0
    ? Math.round((verifiedTherapists / stats.therapistCount) * 100)
    : 0;

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Gösterge Paneli
      </Title>

      <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb="xl">
        {statCards.map((stat, index) => (
          <Paper key={index} p="md" radius="md" withBorder>
            <Group justify="apart">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {stat.title}
                </Text>
                <Text c="etherea.4" size="xl" fw={700}>
                  {stat.value}
                </Text>
              </div>
              {stat.icon}
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Psikolog Onay Durumu
          </Title>
          <Group justify="apart">
            <Stack gap={0}>
              <Text c="etherea.4" size="xl" fw={700}>
                %{verificationRate}
              </Text>
              <Text size="sm" c="dimmed">
                Onaylanmış Psikologlar
              </Text>
            </Stack>
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[{ value: verificationRate, color: 'etherea.4' }]}
              label={
                <Text c="etherea.4" size="xs" ta="center" fw={700}>
                  {verificationRate}%
                </Text>
              }
            />
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Kullanıcı / Psikolog Oranı
          </Title>
          <Group justify="apart">
            <Stack gap={0}>
              <Text c="etherea.4" size="xl" fw={700}>
                {stats?.userCount > 0 ? (stats.userCount / stats.therapistCount).toFixed(1) : 0}:1
              </Text>
              <Text size="sm" c="dimmed">
                Kullanıcı/Psikolog
              </Text>
            </Stack>
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[
                { value: stats?.therapistCount || 0, color: 'serenity.3' },
                { value: stats?.userCount || 0, color: 'etherea.4' },
              ]}
              label={
                <Text c="etherea.4" size="xs" ta="center" fw={700}>
                  Oran
                </Text>
              }
            />
          </Group>
        </Paper>
      </SimpleGrid>
    </Container>
  );
} 