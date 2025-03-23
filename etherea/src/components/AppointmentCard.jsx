import { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Card, 
  Text, 
  Group, 
  Badge, 
  Button, 
  Avatar, 
  Grid, 
  ActionIcon,
  Menu,
  Modal,
  Textarea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconCalendar, 
  IconClock, 
  IconMap, 
  IconVideo, 
  IconDotsVertical, 
  IconCheck, 
  IconX,
  IconTrash
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { appointmentApi, videoSessionApi } from '../services/supabase';

function AppointmentCard({ appointment, onUpdate, userType = 'user' }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'blue';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'pending': return 'Onay Bekliyor';
      default: return 'Bilinmiyor';
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };

  // Randevunun bugün olup olmadığını ve zamanının yaklaşıp yaklaşmadığını kontrol eder
  const isUpcoming = () => {
    if (appointment.status !== 'confirmed') return false;
    
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);
    
    // Tarihler aynı mı kontrol et
    const sameDay = appointmentDate.toDateString() === now.toDateString();
    
    if (!sameDay) return false;
    
    // Başlangıç saati yaklaşmış mı kontrol et
    const [startHour, startMinute] = appointment.start_time.split(':').map(Number);
    const appointmentTime = new Date(appointmentDate);
    appointmentTime.setHours(startHour, startMinute);
    
    // 15 dakika öncesinden başlayarak ve sonraki 1 saat boyunca video butonunu göster
    const timeDiff = (appointmentTime - now) / 1000 / 60; // Dakika cinsinden fark
    return timeDiff <= 15 && timeDiff > -60;
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await appointmentApi.cancelAppointment(appointment.id, cancellationReason);
      close();
      if (onUpdate) {
        onUpdate(appointment.id, 'cancelled');
      }
    } catch (error) {
      console.error('Randevu iptal edilirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideoSession = async () => {
    setVideoLoading(true);
    try {
      if (!appointment.session_link) {
        await videoSessionApi.createVideoSession(appointment.id);
        if (onUpdate) {
          onUpdate(appointment.id, appointment.status);
        }
      }
    } catch (error) {
      console.error('Video oturumu oluşturulurken hata oluştu:', error);
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <>
      <Card withBorder shadow="sm" radius="md" p="md">
        <Grid>
          <Grid.Col span={9}>
            <Group position="apart" mb="xs">
              <Group>
                <Avatar 
                  src={userType === 'user' ? undefined : appointment.user_avatar}
                  radius="xl" 
                  size="md"
                />
                <div>
                  <Text weight={500}>
                    {userType === 'user' ? appointment.therapist_name : appointment.user_name}
                  </Text>
                  {userType === 'user' && appointment.therapist_specialization && (
                    <Text size="xs" color="dimmed">
                      {Array.isArray(appointment.therapist_specialization) 
                        ? appointment.therapist_specialization.join(', ')
                        : appointment.therapist_specialization}
                    </Text>
                  )}
                </div>
              </Group>
              <Badge color={getStatusColor(appointment.status)}>
                {getStatusText(appointment.status)}
              </Badge>
            </Group>

            <Group spacing="xs" mb="xs">
              <IconCalendar size={16} />
              <Text size="sm">{formatDate(appointment.appointment_date)}</Text>
            </Group>

            <Group spacing="xs" mb="xs">
              <IconClock size={16} />
              <Text size="sm">{appointment.start_time} - {appointment.end_time}</Text>
            </Group>

            <Group spacing="xs" mb="xs">
              <IconMap size={16} />
              <Text size="sm">
                {appointment.session_type === 'online' ? 'Online Görüşme' : 'Yüz Yüze Görüşme'}
              </Text>
            </Group>

            {appointment.notes && (
              <Text size="sm" mt="xs" italic>
                Not: {appointment.notes}
              </Text>
            )}
          </Grid.Col>

          <Grid.Col span={3}>
            <Group position="right" style={{ height: '100%' }} spacing="xs">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                {isUpcoming() && appointment.session_type === 'online' && (
                  <Button 
                    component={Link}
                    to={appointment.session_link || '#'}
                    onClick={!appointment.session_link ? handleCreateVideoSession : undefined}
                    loading={videoLoading ? "true" : undefined}
                    fullWidth
                    color="blue"
                  >
                    <IconVideo size={16} style={{ marginRight: '8px' }} />
                    Görüşmeye Katıl
                  </Button>
                )}

                {userType === 'user' && appointment.status === 'pending' && (
                  <Button 
                    variant="outline"
                    color="red"
                    fullWidth
                    onClick={open}
                  >
                    <IconX size={16} style={{ marginRight: '8px' }} />
                    İptal Et
                  </Button>
                )}

                {userType === 'therapist' && appointment.status === 'pending' && (
                  <>
                    <Button 
                      variant="outline"
                      color="green"
                      fullWidth
                      onClick={() => onUpdate(appointment.id, 'confirmed')}
                    >
                      <IconCheck size={16} style={{ marginRight: '8px' }} />
                      Onayla
                    </Button>
                    <Button 
                      variant="outline"
                      color="red"
                      fullWidth
                      onClick={open}
                    >
                      <IconX size={16} style={{ marginRight: '8px' }} />
                      Reddet
                    </Button>
                  </>
                )}

                <Menu>
                  <Menu.Target>
                    <ActionIcon>
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {appointment.status === 'confirmed' && (
                      <Menu.Item 
                        color="red"
                        onClick={open}
                      >
                        <IconX size={16} style={{ marginRight: '8px' }} />
                        İptal Et
                      </Menu.Item>
                    )}
                    {appointment.status === 'completed' && userType === 'therapist' && (
                      <Menu.Item color="red">
                        <IconTrash size={16} style={{ marginRight: '8px' }} />
                        Kaydı Sil
                      </Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </div>
            </Group>
          </Grid.Col>
        </Grid>
      </Card>

      <Modal
        opened={opened}
        onClose={close}
        title="Randevu İptali"
      >
        <Text size="sm" mb="md">
          Bu randevuyu iptal etmek istediğinize emin misiniz?
        </Text>
        <Textarea
          placeholder="İptal sebebi (isteğe bağlı)"
          label="İptal Sebebi"
          value={cancellationReason}
          onChange={(e) => setCancellationReason(e.currentTarget.value)}
          mb="md"
        />
        <Group position="right">
          <Button variant="outline" onClick={close}>İptal</Button>
          <Button color="red" onClick={handleCancel} loading={loading ? "true" : undefined}>Randevuyu İptal Et</Button>
        </Group>
      </Modal>
    </>
  );
}

AppointmentCard.propTypes = {
  appointment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    appointment_date: PropTypes.string.isRequired,
    start_time: PropTypes.string.isRequired,
    end_time: PropTypes.string.isRequired,
    session_type: PropTypes.string.isRequired,
    therapist_name: PropTypes.string,
    therapist_specialization: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array
    ]),
    user_name: PropTypes.string,
    user_avatar: PropTypes.string,
    notes: PropTypes.string,
    session_link: PropTypes.string
  }).isRequired,
  onUpdate: PropTypes.func,
  userType: PropTypes.oneOf(['user', 'therapist'])
};

export default AppointmentCard; 