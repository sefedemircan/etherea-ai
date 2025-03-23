import { Outlet } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, Title, Box, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUser, IconCalendar, IconMessage, IconLogout, IconSettings } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';

function TherapistLayout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { icon: IconUser, label: 'Profilim', path: '/therapist/profile' },
    { icon: IconCalendar, label: 'Randevularım', path: '/therapist/appointments' },
    { icon: IconMessage, label: 'Mesajlarım', path: '/therapist/messages' },
    { icon: IconSettings, label: 'Ayarlar', path: '/therapist/settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      notifications.show({
        title: 'Başarılı',
        message: 'Çıkış yapıldı',
        color: 'white',
        bg: 'etherea.7',
      });
      navigate('/auth/signin');
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: `Çıkış yapılamadı: ${error.message}`,
        color: 'red',
      });
    }
  };

  return (
    <Box style={{ background: '#F9F6FF', minHeight: '100vh' }}>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
        
        styles={{
          root: {
            background: '#F9F6FF',
          },
          main: {
            background: '#F9F6FF',
            paddingRight: 'md',
          },
          navbar: {
            background: '#F9F6FF',
            border: 'none',
          },
          header: {
            background: '#F9F6FF',
            border: 'none',
          }
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="#5E4B8B" />
              <Title order={3} c="etherea.5">etherea.<span style={{color: '#9A7BFF'}}>ai</span></Title>
            </Group>
            <Button
              variant="subtle"
              color="etherea.4"
              leftSection={<IconLogout size={20} />}
              onClick={handleSignOut}
            >
              Çıkış Yap
            </Button>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size="1.2rem" stroke={1.5} color="#9A7BFF" />}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              bg="#F9F6FF"
              styles={{
                root: {
                  borderRadius: 'md',
                  color: '#5E4B8B',
                  fontWeight: 500,
                  backgroundColor: '#F9F6FF',
                  '&[dataActive]': {
                    backgroundColor: '#E2D8FF',
                    color: '#9A7BFF',
                  },
                  '&:hover': {
                    backgroundColor: '#F0EBFF',
                    color: '#9A7BFF',
                  },
                },
                label: {
                  fontWeight: 500,
                }
              }}
            />
          ))}
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </Box>
  );
}

export default TherapistLayout; 