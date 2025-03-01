import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Stack, Title, Text, Group, Avatar, Badge, Button, Grid, Rating, TextInput } from '@mantine/core';
import { IconMessage, IconSearch } from '@tabler/icons-react';
import { supabase } from '../services/supabase';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';

function TherapistList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTherapists();
  }, []);

  const loadTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select(`
          id,
          full_name,
          title,
          specializations,
          about,
          experience_years,
          session_fee,
          avatar_url,
          rating,
          rating_count,
          is_active,
          languages,
          session_types
        `)
        .eq('is_verified', true)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setTherapists(data);
    } catch (error) {
      console.error('Psikologlar yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Psikologlar yüklenemedi',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (therapist) => {
    if (!user) {
      notifications.show({
        title: 'Hata',
        message: 'Mesaj göndermek için giriş yapmalısınız',
        color: 'red'
      });
      navigate('/auth/signin');
      return;
    }

    try {
      // Önce mesaj var mı kontrol et
      const { data: existingMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${therapist.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${therapist.id})`)
        .limit(1);

      if (messagesError) throw messagesError;

      // Eğer mesaj yoksa ilk mesajı gönder
      if (!existingMessages?.length) {
        const { error: sendError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: therapist.id,
            content: 'Merhaba, sizinle görüşmek istiyorum.'
          });

        if (sendError) throw sendError;
      }

      // Mesajlar sayfasına yönlendir
      navigate('/messages');
    } catch (error) {
      console.error('Mesajlaşma başlatılırken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Mesajlaşma başlatılamadı',
        color: 'red'
      });
    }
  };

  const filteredTherapists = therapists.filter(therapist => 
    therapist.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    therapist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    therapist.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Stack spacing="lg">
      <Group position="apart">
        <Title order={3}>Psikologlar</Title>
        <TextInput
          placeholder="İsim, uzmanlık alanı veya ünvan ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<IconSearch size={16} />}
          style={{ width: 300 }}
        />
      </Group>

      <Grid>
        {filteredTherapists.map(therapist => (
          <Grid.Col key={therapist.id} span={{ base: 12, sm: 6, lg: 4 }}>
            <Paper shadow="sm" p="md" radius="md">
              <Group position="apart" mb="xs">
                <Group>
                  <Avatar src={therapist.avatar_url} size="lg" radius="xl" />
                  <div>
                    <Text fw={500}>{therapist.full_name}</Text>
                    <Text size="sm" c="dimmed">{therapist.title}</Text>
                  </div>
                </Group>
                <Button
                  variant="light"
                  color="etherea.4"
                  leftSection={<IconMessage size={16} />}
                  onClick={() => startChat(therapist)}
                >
                  Mesaj Gönder
                </Button>
              </Group>

              <Group spacing="xs" mb="xs">
                {therapist.specializations.map((spec, index) => (
                  <Badge key={index} variant="dot" color="etherea.4">
                    {spec}
                  </Badge>
                ))}
              </Group>

              <Text size="sm" lineClamp={3} mb="md">
                {therapist.about}
              </Text>

              <Group position="apart" mt="md">
                <div>
                  <Text size="sm" c="dimmed">Deneyim</Text>
                  <Text fw={500}>{therapist.experience_years} Yıl</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Seans Ücreti</Text>
                  <Text fw={500}>{therapist.session_fee} TL</Text>
                </div>
                <div>
                  <Group spacing={4}>
                    <Rating value={therapist.rating} readOnly fractions={2} />
                    <Text size="sm" c="dimmed">({therapist.rating_count})</Text>
                  </Group>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}

export default TherapistList; 