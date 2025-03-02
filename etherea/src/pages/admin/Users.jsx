import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Group,
  Badge,
  ActionIcon,
  Button,
  Modal,
  Stack,
  Avatar,
  Loader,
  Alert,
  Tooltip,
  TextInput,
  Select,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconEdit, IconAlertCircle } from '@tabler/icons-react';
import { adminApi } from '../../services/supabase';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleModalOpened, setRoleModalOpened] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      // Bu fonksiyonu adminApi'ye eklemeniz gerekecek
      const data = await adminApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Kullanıcılar yüklenirken hata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      setActionLoading(true);
      await adminApi.setUserRole(userId, role);
      notifications.show({
        title: 'Başarılı',
        message: 'Kullanıcı rolü başarıyla güncellendi',
        color: 'green',
      });
      setRoleModalOpened(false);
      loadUsers();
    } catch (err) {
      console.error('Rol değiştirme hatası:', err);
      notifications.show({
        title: 'Hata',
        message: err.message || 'Kullanıcı rolü güncellenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && users.length === 0) {
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

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rows = filteredUsers.map((user) => (
    <tr key={user.id}>
      <td>
        <Group gap="sm">
          <Avatar color="etherea.4" radius="xl">
            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <div>
            <Text c="etherea.5" size="sm" fw={500}>
              {user.name || 'İsimsiz Kullanıcı'}
            </Text>
            <Text size="xs" c="dimmed">
              {user.email}
            </Text>
          </div>
        </Group>
      </td>
      <td>
        <Badge
          color={
            user.role === 'admin'
              ? 'red'
              : user.role === 'therapist'
              ? 'blue'
              : 'green'
          }
          variant="filled"
        >
          {user.role === 'admin'
            ? 'Admin'
            : user.role === 'therapist'
            ? 'Psikolog'
            : 'Kullanıcı'}
        </Badge>
      </td>
      <td>{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
      <td>
        <Group gap={0} justify="right">
          <Tooltip label="Rol Değiştir">
            <ActionIcon
              onClick={() => {
                setSelectedUser(user);
                setNewRole(user.role);
                setRoleModalOpened(true);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </td>
    </tr>
  ));

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Kullanıcılar
      </Title>

      <Group justify="apart" mb="md">
        <TextInput
          placeholder="Kullanıcı ara..."
          leftSection={<IconSearch size={14} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          style={{ width: 300 }}
        />
      </Group>

      <Paper withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Kayıt Tarihi</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Rol Değiştirme Modalı */}
      <Modal
        opened={roleModalOpened}
        onClose={() => setRoleModalOpened(false)}
        title={<Title order={4}>Kullanıcı Rolünü Değiştir</Title>}
        styles={{
          header: {
            backgroundColor: '#F9F6FF',
          },
          body: {
            backgroundColor: '#F9F6FF',
          }
        }}
      >
        {selectedUser && (
          <Stack>
            <Text c="dimmed">
              <b style={{ color: '#5E4B8B' }}>{selectedUser.name || selectedUser.email}</b> kullanıcısının rolünü değiştir:
            </Text>

            <Select
              label="Yeni Rol"
              placeholder="Rol seçin"
              value={newRole}
              onChange={setNewRole}
              c="etherea.5"
              comboboxProps={{ withinPortal: true }}
              styles={{
                input: {
                  color: '#5E4B8B',
                  borderColor: '#5E4B8B',
                  backgroundColor: '#F9F6FF',
                },
                dropdown: {
                  backgroundColor: '#F9F6FF',
                },
                option: {
                  color: '#5E4B8B',
                  backgroundColor: '#F9F6FF',
                  '&:hover': {
                    backgroundColor: '#E6DFF8',
                  },
                  '&[data-selected]': {
                    backgroundColor: '#9A7BFF',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#8A6BEF',
                    }
                  }
                }
              }}
              data={[
                { value: 'user', label: 'Kullanıcı' },
                { value: 'therapist', label: 'Psikolog' },
                { value: 'admin', label: 'Admin' },
              ]}
            />

            <Group justify="right" mt="md">
              <Button variant="light" onClick={() => setRoleModalOpened(false)} disabled={actionLoading}>
                İptal
              </Button>
              <Button
                color="etherea.4"
                c="white"
                onClick={() => handleRoleChange(selectedUser.id, newRole)}
                loading={actionLoading}
              >
                Kaydet
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
} 