import { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Card, 
  Tabs, 
  Text, 
  Box,
  Loader,
  Stack,
  Modal,
  Select,
  Textarea,
  Grid
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendarPlus, IconCheck, IconX } from '@tabler/icons-react';
import { appointmentApi } from '../services/supabase';
import AppointmentCard from '../components/AppointmentCard';
import { useAuth } from '../contexts/AuthContext';

export default function Appointments() {
  const { userRole } = useAuth();
  const isTherapist = userRole === 'therapist';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  
  // Yeni randevu bilgileri (sadece normal kullanıcılar için)
  const [newAppointment, setNewAppointment] = useState({
    therapist_id: '',
    appointment_date: null,
    start_time: '',
    end_time: '',
    session_type: 'online',
    notes: ''
  });
  const [therapists, setTherapists] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // userRole değiştiğinde randevuları yükle
  useEffect(() => {
    loadAppointments();
  }, [userRole]);

  async function loadAppointments() {
    setLoading(true);
    try {
      let data;
      if (isTherapist) {
        data = await appointmentApi.getTherapistAppointments();
      } else {
        data = await appointmentApi.getUserAppointments();
      }
      setAppointments(data);
    } catch (error) {
      console.error('Randevular yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  }

  // Randevuları gelecek ve geçmiş olarak filtrele
  const upcomingAppointments = appointments.filter(appointment => {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);
    return (
      (appointmentDate >= now || 
      (appointmentDate.toDateString() === now.toDateString() && 
        appointment.status === 'confirmed'))
    );
  }).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

  const pastAppointments = appointments.filter(appointment => {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointment_date);
    return (
      appointmentDate < now && 
      !(appointmentDate.toDateString() === now.toDateString() && 
        appointment.status === 'confirmed')
    );
  }).sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

  // Terapistler için: bekleyen randevuları filtrele
  const pendingAppointments = appointments.filter(appointment => 
    appointment.status === 'pending'
  ).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

  async function loadTherapists() {
    setLoadingTherapists(true);
    try {
      // Veritabanından gerçek terapistleri al
      const therapistsData = await appointmentApi.getAllTherapists();
      
      // Select bileşeni için uygun format
      const formattedTherapists = therapistsData.map(therapist => ({
        value: therapist.id,
        label: therapist.full_name || 'İsimsiz Terapist'
      }));
      
      setTherapists(formattedTherapists);
    } catch (error) {
      console.error('Terapistler yüklenirken hata oluştu:', error);
    } finally {
      setLoadingTherapists(false);
    }
  }

  async function loadAvailableSlots() {
    if (!newAppointment.therapist_id || !newAppointment.appointment_date) return;
    
    setLoadingSlots(true);
    try {
      const formattedDate = newAppointment.appointment_date.toISOString().split('T')[0];
      const slots = await appointmentApi.getTherapistAvailability(
        newAppointment.therapist_id, 
        formattedDate
      );
      
      const formattedSlots = slots.map(slot => ({
        value: `${slot.start}-${slot.end}`,
        label: `${slot.start} - ${slot.end}`
      }));
      
      setAvailableSlots(formattedSlots);
    } catch (error) {
      console.error('Müsait saatler yüklenirken hata oluştu:', error);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (opened && !isTherapist) {
      loadTherapists();
    }
  }, [opened, isTherapist]);

  useEffect(() => {
    if (newAppointment.therapist_id && newAppointment.appointment_date) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [newAppointment.therapist_id, newAppointment.appointment_date]);

  const handleInputChange = (field, value) => {
    setNewAppointment(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeSlotChange = (value) => {
    if (!value) return;
    const [start, end] = value.split('-');
    setNewAppointment(prev => ({ 
      ...prev, 
      start_time: start,
      end_time: end
    }));
  };

  const handleCreateAppointment = async () => {
    try {
      const formattedAppointment = {
        ...newAppointment,
        appointment_date: newAppointment.appointment_date.toISOString().split('T')[0] // ISO format olarak yyyy-mm-dd
      };
      
      await appointmentApi.createAppointment(formattedAppointment);
      close();
      setNewAppointment({
        therapist_id: '',
        appointment_date: null,
        start_time: '',
        end_time: '',
        session_type: 'online',
        notes: ''
      });
      loadAppointments();
    } catch (error) {
      console.error('Randevu oluşturulurken hata oluştu:', error);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      if (isTherapist) {
        await appointmentApi.therapistUpdateAppointment(id, { status });
      } else {
        await appointmentApi.updateAppointmentStatus(id, status);
      }
      loadAppointments();
    } catch (error) {
      console.error('Randevu durumu güncellenirken hata oluştu:', error);
    }
  };

  const renderUserAppointments = () => (
    <>
      <Group position="apart" mb="lg">
        <Title order={2}>Randevularım</Title>
        <Button c="etherea.5" bg="etherea.1" onClick={open}>
          <IconCalendarPlus size={16} style={{ marginRight: '8px' }} />
          Yeni Randevu Oluştur
        </Button>
      </Group>

      {loading ? (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader />
        </Box>
      ) : (
        <Tabs defaultValue="upcoming">
          <Tabs.List>
            <Tabs.Tab value="upcoming">Yaklaşan Randevular</Tabs.Tab>
            <Tabs.Tab value="past">Geçmiş Randevular</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="upcoming" pt="md">
            {upcomingAppointments.length === 0 ? (
              <Card withBorder p="lg" radius="md">
                <Text align="center" c="dimmed">Yaklaşan randevunuz bulunmamaktadır.</Text>
              </Card>
            ) : (
              <Stack spacing="md">
                {upcomingAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onUpdate={handleStatusUpdate}
                    userType="user"
                  />
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="past" pt="md">
            {pastAppointments.length === 0 ? (
              <Card withBorder p="lg" radius="md">
                <Text align="center" c="dimmed">Geçmiş randevunuz bulunmamaktadır.</Text>
              </Card>
            ) : (
              <Stack spacing="md">
                {pastAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userType="user"
                  />
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      <Modal 
        opened={opened} 
        onClose={close} 
        title="Yeni Randevu Oluştur"
        size="lg"
      >
        <Box p="md">
          <Grid gutter="md">
            <Grid.Col span={12}>
              <Select
                label="Terapist"
                placeholder="Terapist seçin"
                data={therapists}
                value={newAppointment.therapist_id}
                onChange={(value) => handleInputChange('therapist_id', value)}
                required
                loading={loadingTherapists || undefined}
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <DatePicker
                label="Randevu Tarihi"
                placeholder="Tarih seçin"
                value={newAppointment.appointment_date}
                onChange={(date) => handleInputChange('appointment_date', date)}
                required
                minDate={new Date()}
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <Select
                label="Saat Aralığı"
                placeholder="Saat aralığı seçin"
                data={availableSlots}
                value={`${newAppointment.start_time}-${newAppointment.end_time}`}
                onChange={handleTimeSlotChange}
                disabled={!newAppointment.therapist_id || !newAppointment.appointment_date}
                loading={loadingSlots || undefined}
                required
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <Select
                label="Seans Tipi"
                placeholder="Seans tipi seçin"
                data={[
                  { value: 'online', label: 'Online Görüşme' },
                  { value: 'in_person', label: 'Yüz Yüze Görüşme' }
                ]}
                value={newAppointment.session_type}
                onChange={(value) => handleInputChange('session_type', value)}
                required
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <Textarea
                label="Notlar (İsteğe Bağlı)"
                placeholder="Randevu ile ilgili eklemek istediğiniz notlar"
                value={newAppointment.notes}
                onChange={(e) => handleInputChange('notes', e.currentTarget.value)}
                minRows={3}
              />
            </Grid.Col>
          </Grid>

          <Group position="right" mt="md">
            <Button variant="filled" c="white" bg="red" onClick={close}>
              <IconX size={16} style={{ marginRight: '8px' }} />
              İptal
            </Button>
            <Button 
              c="etherea.5"
              bg="etherea.2"
              onClick={handleCreateAppointment} 
              disabled={
                !newAppointment.therapist_id ||
                !newAppointment.appointment_date ||
                !newAppointment.start_time ||
                !newAppointment.end_time ||
                !newAppointment.session_type
              }
            >
              <IconCheck size={16} style={{ marginRight: '8px' }} />
              Randevu Oluştur
            </Button>
          </Group>
        </Box>
      </Modal>
    </>
  );

  const renderTherapistAppointments = () => (
    <>
      <Title order={2} mb="lg">Randevularım</Title>

      {loading ? (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader />
        </Box>
      ) : (
        <Tabs defaultValue="pending">
          <Tabs.List>
            <Tabs.Tab value="pending">Onay Bekleyen Randevular</Tabs.Tab>
            <Tabs.Tab value="upcoming">Yaklaşan Randevular</Tabs.Tab>
            <Tabs.Tab value="past">Geçmiş Randevular</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            {pendingAppointments.length === 0 ? (
              <Card withBorder p="lg" radius="md">
                <Text align="center" c="dimmed">Onay bekleyen randevu bulunmamaktadır.</Text>
              </Card>
            ) : (
              <Stack spacing="md">
                {pendingAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onUpdate={handleStatusUpdate}
                    userType="therapist"
                  />
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="upcoming" pt="md">
            {upcomingAppointments.length === 0 ? (
              <Card withBorder p="lg" radius="md">
                <Text align="center" c="dimmed">Yaklaşan randevunuz bulunmamaktadır.</Text>
              </Card>
            ) : (
              <Stack spacing="md">
                {upcomingAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onUpdate={handleStatusUpdate}
                    userType="therapist"
                  />
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="past" pt="md">
            {pastAppointments.length === 0 ? (
              <Card withBorder p="lg" radius="md">
                <Text align="center" c="dimmed">Geçmiş randevunuz bulunmamaktadır.</Text>
              </Card>
            ) : (
              <Stack spacing="md">
                {pastAppointments.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userType="therapist"
                  />
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </>
  );

  return (
    <Container size="lg" py="xl">
      {isTherapist ? renderTherapistAppointments() : renderUserAppointments()}
    </Container>
  );
} 