import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      setLoading(true);
      await signIn({ email, password });
      notifications.show({
        title: 'Başarılı',
        message: 'Hoş geldiniz!',
        color: 'white',
        bg: 'etherea.7',
      });
      navigate('/');
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="100vh" bg="#F9F6FF">
      <Paper shadow="md" p="xl" w={400}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={2} c="#5E4B8B" ta="center">Etherea'ya Hoş Geldiniz</Title>
            <Text c="dimmed" size="sm" ta="center">
              Günlüğünüze devam etmek için giriş yapın
            </Text>

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
              Giriş Yap
            </Button>

            <Text size="sm" ta="center">
              Hesabınız yok mu?{' '}
              <Text
                span
                c="#9A7BFF"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/auth/signup')}
              >
                Kayıt Olun
              </Text>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
} 