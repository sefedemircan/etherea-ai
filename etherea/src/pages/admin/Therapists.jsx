import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Tabs,
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
  Divider,
  List,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconX,
  IconEye,
  IconAlertCircle,
  IconUserCheck,
  IconUserX,
  IconClock,
} from '@tabler/icons-react';
import { adminApi } from '../../services/supabase';

export default function Therapists() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [verifyOpened, setVerifyOpened] = useState(false);
  const [rejectOpened, setRejectOpened] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTherapists(activeTab);
  }, [activeTab]);

  async function loadTherapists(status) {
    try {
      setLoading(true);
      const data = await adminApi.getAllTherapists(status);
      setTherapists(data);
    } catch (err) {
      console.error('Psikologlar yüklenirken hata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(id) {
    try {
      setActionLoading(true);
      await adminApi.verifyTherapist(id, true);
      notifications.show({
        title: 'Başarılı',
        message: 'Psikolog başarıyla onaylandı',
        color: 'green',
      });
      setVerifyOpened(false);
      loadTherapists(activeTab);
    } catch (err) {
      console.error('Onaylama hatası:', err);
      notifications.show({
        title: 'Hata',
        message: err.message || 'Psikolog onaylanırken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(id) {
    try {
      setActionLoading(true);
      await adminApi.verifyTherapist(id, false);
      notifications.show({
        title: 'Başarılı',
        message: 'Psikolog başarıyla reddedildi',
        color: 'orange',
      });
      setRejectOpened(false);
      loadTherapists(activeTab);
    } catch (err) {
      console.error('Reddetme hatası:', err);
      notifications.show({
        title: 'Hata',
        message: err.message || 'Psikolog reddedilirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && therapists.length === 0) {
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

  const rows = therapists.map((therapist) => (
    <tr key={therapist.id}>
      <td>
        <Group gap="sm">
          <Avatar color="etherea.4" radius="xl">
            {therapist.full_name?.charAt(0).toUpperCase() || 'T'}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>
              {therapist.full_name}
            </Text>
            <Text size="xs" c="dimmed">
              {therapist.title}
            </Text>
          </div>
        </Group>
      </td>
      <td>
        <Badge
          color={therapist.is_verified ? 'green' : 'orange'}
          variant="light"
        >
          {therapist.is_verified ? 'Onaylandı' : 'Onay Bekliyor'}
        </Badge>
      </td>
      <td>
        <Text size="sm">{therapist.experience_years} Yıl</Text>
      </td>
      <td>
        <Group gap={0} justify="right">
          <Tooltip label="Detaylar">
            <ActionIcon
              onClick={() => {
                setSelectedTherapist(therapist);
                setDetailsOpened(true);
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
          {!therapist.is_verified && (
            <Tooltip label="Onayla">
              <ActionIcon
                color="green"
                onClick={() => {
                  setSelectedTherapist(therapist);
                  setVerifyOpened(true);
                }}
              >
                <IconCheck size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {therapist.is_verified && (
            <Tooltip label="Onayı Kaldır">
              <ActionIcon
                color="red"
                onClick={() => {
                  setSelectedTherapist(therapist);
                  setRejectOpened(true);
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </td>
    </tr>
  ));

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Psikologlar
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconUserCheck size={14} />}>
            Tümü
          </Tabs.Tab>
          <Tabs.Tab value="pending" leftSection={<IconClock size={14} />}>
            Onay Bekleyenler
          </Tabs.Tab>
          <Tabs.Tab value="verified" leftSection={<IconCheck size={14} />}>
            Onaylananlar
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Paper withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Psikolog</th>
                <th>Durum</th>
                <th>Deneyim</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Detay Modalı */}
      <Modal
        opened={detailsOpened}
        onClose={() => setDetailsOpened(false)}
        title={<Title order={4}>Psikolog Detayları</Title>}
        size="lg"
      >
        {selectedTherapist && (
          <Stack>
            <Group>
              <Avatar size="xl" color="etherea.4" radius="xl">
                {selectedTherapist.full_name?.charAt(0).toUpperCase() || 'T'}
              </Avatar>
              <div>
                <Text size="xl" fw={700}>
                  {selectedTherapist.full_name}
                </Text>
                <Text size="md">{selectedTherapist.title}</Text>
                <Badge
                  color={selectedTherapist.is_verified ? 'green' : 'orange'}
                  variant="light"
                  size="sm"
                  mt={5}
                >
                  {selectedTherapist.is_verified ? 'Onaylandı' : 'Onay Bekliyor'}
                </Badge>
              </div>
            </Group>

            <Divider />

            <div>
              <Text fw={700} mb={5}>
                Hakkında
              </Text>
              <Text size="sm">{selectedTherapist.about}</Text>
            </div>

            <div>
              <Text fw={700} mb={5}>
                Uzmanlık Alanları
              </Text>
              <Group gap={5}>
                {selectedTherapist.specializations?.map((spec, index) => (
                  <Badge key={index} color="etherea.4" variant="light">
                    {spec}
                  </Badge>
                ))}
              </Group>
            </div>

            <div>
              <Text fw={700} mb={5}>
                Eğitim
              </Text>
              <List size="sm" spacing="xs">
                {selectedTherapist.education?.map((edu, index) => (
                  <List.Item key={index}>{edu}</List.Item>
                ))}
              </List>
            </div>

            <div>
              <Text fw={700} mb={5}>
                Sertifikalar
              </Text>
              <List size="sm" spacing="xs">
                {selectedTherapist.certifications?.map((cert, index) => (
                  <List.Item key={index}>{cert}</List.Item>
                ))}
              </List>
            </div>

            <Group>
              <div>
                <Text fw={700} mb={5}>
                  Deneyim
                </Text>
                <Text>{selectedTherapist.experience_years} Yıl</Text>
              </div>

              <div>
                <Text fw={700} mb={5}>
                  Seans Ücreti
                </Text>
                <Text>{selectedTherapist.session_fee} ₺</Text>
              </div>

              <div>
                <Text fw={700} mb={5}>
                  Diller
                </Text>
                <Group gap={5}>
                  {selectedTherapist.languages?.map((lang, index) => (
                    <Badge key={index} color="serenity.3" variant="light">
                      {lang}
                    </Badge>
                  ))}
                </Group>
              </div>
            </Group>

            <Group justify="right" mt="md">
              <Button variant="default" onClick={() => setDetailsOpened(false)}>
                Kapat
              </Button>
              {!selectedTherapist.is_verified ? (
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => {
                    setDetailsOpened(false);
                    setVerifyOpened(true);
                  }}
                >
                  Onayla
                </Button>
              ) : (
                <Button
                  color="red"
                  leftSection={<IconX size={16} />}
                  onClick={() => {
                    setDetailsOpened(false);
                    setRejectOpened(true);
                  }}
                >
                  Onayı Kaldır
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Onaylama Modalı */}
      <Modal
        opened={verifyOpened}
        onClose={() => setVerifyOpened(false)}
        title={<Title order={4}>Psikolog Onayı</Title>}
      >
        <Text mb="md">
          <b>{selectedTherapist?.full_name}</b> isimli psikoloğu onaylamak istediğinize emin misiniz?
        </Text>
        <Text size="sm" c="dimmed" mb="xl">
          Onaylandıktan sonra psikolog platformda hizmet vermeye başlayabilecek.
        </Text>
        <Group justify="right">
          <Button variant="default" onClick={() => setVerifyOpened(false)} disabled={actionLoading}>
            İptal
          </Button>
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={() => handleVerify(selectedTherapist?.id)}
            loading={actionLoading}
          >
            Onayla
          </Button>
        </Group>
      </Modal>

      {/* Reddetme Modalı */}
      <Modal
        opened={rejectOpened}
        onClose={() => setRejectOpened(false)}
        title={<Title order={4}>Onay Kaldırma</Title>}
      >
        <Text mb="md">
          <b>{selectedTherapist?.full_name}</b> isimli psikoloğun onayını kaldırmak istediğinize emin misiniz?
        </Text>
        <Text size="sm" c="dimmed" mb="xl">
          Onay kaldırıldıktan sonra psikolog platformda hizmet veremeyecek.
        </Text>
        <Group justify="right">
          <Button variant="default" onClick={() => setRejectOpened(false)} disabled={actionLoading}>
            İptal
          </Button>
          <Button
            color="red"
            leftSection={<IconX size={16} />}
            onClick={() => handleReject(selectedTherapist?.id)}
            loading={actionLoading}
          >
            Onayı Kaldır
          </Button>
        </Group>
      </Modal>
    </Container>
  );
} 