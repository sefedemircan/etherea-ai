import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack, Center, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMailCheck } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');

    try {
      setLoading(true);
      await signUp({ email, password, name });
      setIsRegistered(true);
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Kayıt yapılamadı. Lütfen bilgilerinizi kontrol edin.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <Center h="100vh" bg="#F9F6FF">
        <Paper shadow="md" p="xl" w={400}>
          <Stack align="center" spacing="lg">
            <IconMailCheck size={48} color="#9A7BFF" />
            <Title order={2} c="#5E4B8B" ta="center">E-posta Onayı Gerekli</Title>
            <Text c="dimmed" size="sm" ta="center">
              Hesabınız başarıyla oluşturuldu! Lütfen e-posta adresinize gönderilen onay bağlantısına tıklayın.
              Onayladıktan sonra giriş yapabilirsiniz.
            </Text>
            <Button
              variant="light"
              color="etherea.4"
              fullWidth
              onClick={() => navigate('/auth/signin')}
            >
              Giriş Sayfasına Git
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center h="100vh" bg="#F9F6FF">
      <Paper shadow="md" p="xl" w={400}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2} c="#5E4B8B" ta="center">Etherea'ya Katılın</Title>
            <Text c="dimmed" size="sm" ta="center">
              Duygusal yolculuğunuza başlamak için hesap oluşturun
            </Text>

            <TextInput
              name="name"
              label="Ad Soyad"
              placeholder="Ad Soyad"
              required
            />

            <TextInput
              name="email"
              label="E-posta"
              placeholder="ornek@mail.com"
              required
            />

            <PasswordInput
              name="password"
              label="Şifre"
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              loading={loading}
              variant="light"
              color="etherea.4"
              fullWidth
            >
              Kayıt Ol
            </Button>

            <Text size="sm" ta="center">
              Zaten hesabınız var mı?{' '}
              <Text
                span
                c="#9A7BFF"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/auth/signin')}
              >
                Giriş Yapın
              </Text>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
} 