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
  Loader,
  Alert,
  Tooltip,
  TextInput,
  Select,
  ScrollArea,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconEye, IconAlertCircle } from '@tabler/icons-react';
import { adminApi } from '../../services/supabase';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [statusModalOpened, setStatusModalOpened] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      // Bu fonksiyonu adminApi'ye eklemeniz gerekecek
      const data = await adminApi.getAllAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Randevular yüklenirken hata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(appointmentId, status) {
    try {
      setActionLoading(true);
      // Bu fonksiyonu adminApi'ye eklemeniz gerekecek
      await adminApi.updateAppointmentStatus(appointmentId, status);
      notifications.show({
        title: 'Başarılı',
        message: 'Randevu durumu başarıyla güncellendi',
        color: 'green',
      });
      setStatusModalOpened(false);
      loadAppointments();
    } catch (err) {
      console.error('Durum değiştirme hatası:', err);
      notifications.show({
        title: 'Hata',
        message: err.message || 'Randevu durumu güncellenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && appointments.length === 0) {
    return (
      <Container size="lg" py="xl">
        <Group position="center" py="xl">
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

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.therapist_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'confirmed':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'confirmed':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const rows = filteredAppointments.map((appointment) => (
    <tr key={appointment.id}>
      <td>
        <Text size="sm" weight={500}>
          {appointment.user_name}
        </Text>
      </td>
      <td>
        <Text size="sm">{appointment.therapist_name}</Text>
      </td>
      <td>
        <Text size="sm">
          {new Date(appointment.appointment_date).toLocaleDateString('tr-TR')}
        </Text>
        <Text size="xs" color="dimmed">
          {appointment.start_time} - {appointment.end_time}
        </Text>
      </td>
      <td>
        <Badge color={getStatusColor(appointment.status)} variant="light">
          {getStatusText(appointment.status)}
        </Badge>
      </td>
      <td>
        <Group spacing={0} position="right">
          <Tooltip label="Detaylar">
            <ActionIcon
              onClick={() => {
                setSelectedAppointment(appointment);
                setDetailsOpened(true);
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </td>
    </tr>
  ));

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Randevular
      </Title>

      <Group position="apart" mb="md">
        <TextInput
          placeholder="Randevu ara..."
          icon={<IconSearch size={14} />}
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
                <th>Psikolog</th>
                <th>Tarih & Saat</th>
                <th>Durum</th>
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
        title={<Title order={4}>Randevu Detayları</Title>}
      >
        {selectedAppointment && (
          <Stack>
            <div>
              <Text weight={700} mb={5}>
                Kullanıcı
              </Text>
              <Text>{selectedAppointment.user_name}</Text>
            </div>

            <div>
              <Text weight={700} mb={5}>
                Psikolog
              </Text>
              <Text>{selectedAppointment.therapist_name}</Text>
            </div>

            <div>
              <Text weight={700} mb={5}>
                Tarih ve Saat
              </Text>
              <Text>
                {new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')},{' '}
                {selectedAppointment.start_time} - {selectedAppointment.end_time}
              </Text>
            </div>

            <div>
              <Text weight={700} mb={5}>
                Görüşme Tipi
              </Text>
              <Text>
                {selectedAppointment.session_type === 'online'
                  ? 'Online Görüşme'
                  : 'Yüz Yüze Görüşme'}
              </Text>
            </div>

            {selectedAppointment.session_type === 'online' && selectedAppointment.session_link && (
              <div>
                <Text weight={700} mb={5}>
                  Görüşme Linki
                </Text>
                <Text>{selectedAppointment.session_link}</Text>
              </div>
            )}

            <div>
              <Text weight={700} mb={5}>
                Durum
              </Text>
              <Badge color={getStatusColor(selectedAppointment.status)} variant="light">
                {getStatusText(selectedAppointment.status)}
              </Badge>
            </div>

            {selectedAppointment.notes && (
              <div>
                <Text weight={700} mb={5}>
                  Notlar
                </Text>
                <Text>{selectedAppointment.notes}</Text>
              </div>
            )}

            <Divider />

            <Group position="right">
              <Button variant="default" onClick={() => setDetailsOpened(false)}>
                Kapat
              </Button>
              <Button
                color="etherea.4"
                onClick={() => {
                  setDetailsOpened(false);
                  setNewStatus(selectedAppointment.status);
                  setStatusModalOpened(true);
                }}
              >
                Durumu Değiştir
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Durum Değiştirme Modalı */}
      <Modal
        opened={statusModalOpened}
        onClose={() => setStatusModalOpened(false)}
        title={<Title order={4}>Randevu Durumunu Değiştir</Title>}
      >
        {selectedAppointment && (
          <Stack>
            <Text>
              <b>
                {selectedAppointment.user_name} - {selectedAppointment.therapist_name}
              </b>{' '}
              randevusunun durumunu değiştir:
            </Text>

            <Select
              label="Yeni Durum"
              placeholder="Durum seçin"
              value={newStatus}
              onChange={setNewStatus}
              data={[
                { value: 'pending', label: 'Beklemede' },
                { value: 'confirmed', label: 'Onaylandı' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'cancelled', label: 'İptal Edildi' },
              ]}
            />

            <Group position="right" mt="md">
              <Button variant="default" onClick={() => setStatusModalOpened(false)} disabled={actionLoading}>
                İptal
              </Button>
              <Button
                color="etherea.4"
                onClick={() => handleStatusChange(selectedAppointment.id, newStatus)}
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