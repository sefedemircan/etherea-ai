import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack, Center, Container, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

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
      
      // Giriş yap
      const { user, session } = await signIn({ email, password });
      
      if (!user?.id) {
        throw new Error('Kullanıcı bilgileri alınamadı');
      }

      // Kullanıcının rolünü veritabanından al
      try {
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError) {
          console.error('Rol kontrolü hatası:', roleError);
          
          // Rol bulunamadıysa, yeni bir rol oluştur
          if (roleError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert({
                id: user.id,
                role: 'user'
              });
              
            if (insertError) {
              console.error('Rol oluşturma hatası:', insertError);
            }
          }
        }

        notifications.show({
          title: 'Başarılı',
          message: 'Hoş geldiniz!',
          color: 'green'
        });

        // Kullanıcı rolüne göre yönlendirme yap
        if (userRole?.role === 'therapist') {
          navigate('/therapist/profile');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Rol işlemi hatası:', error);
        // Hata olsa bile ana sayfaya yönlendir
        navigate('/');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Paper shadow="md" radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mb="xl">
          Etherea'ya Hoş Geldiniz
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              required
              name="email"
              label="E-posta"
              placeholder="ornek@mail.com"
            />
            <PasswordInput
              required
              name="password"
              label="Şifre"
              placeholder="******"
            />

            <Button c="white" bg="warmth.6" type="submit" loading={loading}>
              Giriş Yap
            </Button>
          </Stack>
        </form>

        <Divider my="lg" label="veya" labelPosition="center" />

        <Stack spacing="xs">
          <Button
            component={Link}
            to="/auth/signup"
            variant="light"
          >
            Yeni Hesap Oluştur
          </Button>
          
          <Button
            component={Link}
            to="/auth/therapist-signup"
            variant="subtle"
            color="etherea.6"
          >
            Psikolog Olarak Kaydol
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
} 