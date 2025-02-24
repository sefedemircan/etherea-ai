import { Outlet } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, Title, Box, Button, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome, IconPencil, IconChartLine, IconBulb, IconLogout, IconNotebook } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';

function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { icon: IconHome, label: 'Ana Sayfa', path: '/' },
    { icon: IconPencil, label: 'Günlük Yaz', path: '/entry' },
    { icon: IconNotebook, label: 'Günlüklerim', path: '/journals' },
    { icon: IconChartLine, label: 'Analizler', path: '/analysis' },
    { icon: IconBulb, label: 'Öneriler', path: '/recommendations' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      notifications.show({
        title: 'Başarılı',
        message: 'Çıkış yapıldı',
        color: 'green',
      });
      navigate('/auth/signin');
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Çıkış yapılamadı',
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

export default Layout; 