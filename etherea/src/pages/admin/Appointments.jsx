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
import { adminApi, supabase } from '../../services/supabase';

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
  const [testResults, setTestResults] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [directAppointments, setDirectAppointments] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      
      // İlk önce normal method ile deneyelim
      try {
        const data = await adminApi.getAllAppointments();
        
        if (data && data.length > 0) {
          setAppointments(data);
          setLoading(false);
          return;
        }
      } catch {
        // Normal yöntem hata verdi, bir sonraki yöntemi deneyeceğiz
      }
      
      // Normal metod başarısız olduysa veya boş veri döndürdüyse, direkt erişim metodunu deneyeceğiz
      try {
        const directData = await adminApi.getAppointmentsDirectAccess();
        
        if (directData && directData.length > 0) {
          // directData artık tüm bilgileri içeriyor, doğrudan kullanabiliriz
          setAppointments(directData);
          setLoading(false);
          return;
        }
      } catch {
        // Doğrudan erişim de başarısız oldu
      }
      
      // Her iki method da başarısız olduysa, boş liste göster
      setAppointments([]);
      setError('Randevular yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      
    } catch (err) {
      console.error('Randevular yüklenirken hata:', err);
      setError(err.message);
      setAppointments([]);
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

  // Doğrudan tabloyu test eden fonksiyon
  async function testDirectTable() {
    setDirectLoading(true);
    try {
      console.log('Direkt tablo testi başlatılıyor...');
      
      // Direkt SQL sorgusu yapmayı dene
      const { data, error } = await supabase
        .from('appointments')
        .select('*');
        
      if (error) {
        console.error('Direkt sorgu hatası:', error);
        setError('Direkt tablo sorgusu hata: ' + error.message);
      } else {
        console.log('Direkt sorgu sonucu:', data);
        setDirectAppointments(data || []);
        
        // Eğer veri varsa doğrudan bunu göster
        if (data && data.length > 0) {
          const processedData = data.map(appointment => ({
            ...appointment,
            therapist_name: 'Therapist ID: ' + appointment.therapist_id,
            user_name: 'User ID: ' + appointment.user_id,
            therapist_specialization: [],
            user_avatar: null
          }));
          
          setAppointments(processedData);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Test sırasında hata:', err);
      setError('Tablo testi başarısız: ' + err.message);
    } finally {
      setDirectLoading(false);
    }
  }

  // Veritabanı erişimini test eden fonksiyon
  async function testDatabaseAccess() {
    setTestLoading(true);
    try {
      const results = await adminApi.testDatabaseAccess();
      setTestResults(results);
      console.log('Veritabanı erişim testi sonuçları:', results);
    } catch (error) {
      console.error('Test sırasında hata:', error);
      setError('Veritabanı erişim testi başarısız: ' + error.message);
    } finally {
      setTestLoading(false);
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
        
        <Group>
          <Button 
            variant="outline" 
            color="grape" 
            loading={directLoading}
            onClick={testDirectTable}
          >
            Direkt Tablo Testi
          </Button>
          
          <Button 
            variant="outline" 
            color="grape" 
            loading={testLoading}
            onClick={testDatabaseAccess}
          >
            Veritabanı Erişimini Test Et
          </Button>
        </Group>
      </Group>

      {/* Direkt Tablo Test Sonuçları */}
      {directAppointments && directAppointments.length > 0 && (
        <Paper shadow="xs" withBorder p="md" mb="md" style={{ backgroundColor: '#fff2e6' }}>
          <Title order={5} mb="sm">Direkt Tablo Sonuçları</Title>
          <Text size="sm" mb="xs">Toplam {directAppointments.length} randevu bulundu</Text>
          
          <ScrollArea h={200}>
            <pre style={{ fontSize: '12px' }}>
              {JSON.stringify(directAppointments, null, 2)}
            </pre>
          </ScrollArea>
        </Paper>
      )}

      {/* Veritabanı Test Sonuçları */}
      {testResults && (
        <Paper shadow="xs" withBorder p="md" mb="md" style={{ backgroundColor: '#f9f6ff' }}>
          <Title order={5} mb="sm">Veritabanı Erişim Sonuçları</Title>
          <Text size="sm" mb="xs">Kullanıcı: {testResults.user} ({testResults.email})</Text>
          <Text size="sm" mb="md">Tablo Erişimleri:</Text>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Object.entries(testResults.tables).map(([table, data]) => (
              <div 
                key={table} 
                style={{ 
                  padding: '10px', 
                  borderRadius: '5px',
                  backgroundColor: data.access ? '#e6ffee' : '#ffecec'
                }}
              >
                <Text fw={700}>{table}</Text>
                {data.access ? (
                  <>
                    <Text size="xs" c="green">Erişim var • {data.count} kayıt</Text>
                    {data.count > 0 && data.sample && (
                      <div style={{ marginTop: '8px', padding: '5px', backgroundColor: '#f5f5f5', borderRadius: '3px' }}>
                        <Text size="xs" fw={500}>Örnek Veri:</Text>
                        <ScrollArea h={80} mt={5}>
                          <pre style={{ fontSize: '10px', margin: 0 }}>
                            {JSON.stringify(data.sample, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                ) : (
                  <Text size="xs" c="red">Erişim yok • {data.code || data.error || 'Hata'}</Text>
                )}
              </div>
            ))}
          </div>
          
          {testResults.tables.appointments && testResults.tables.appointments.access && testResults.tables.appointments.count > 0 && (
            <Button 
              mt="lg" 
              variant="light" 
              color="green" 
              fullWidth
              onClick={() => {
                // Appointments verilerini doğrudan göster
                const appointmentsData = testResults.tables.appointments.sample ? 
                  [testResults.tables.appointments.sample] : [];
                  
                setDirectAppointments(appointmentsData);
                
                // UI'da göster
                const processedData = appointmentsData.map(appointment => ({
                  ...appointment,
                  therapist_name: 'Therapist ID: ' + appointment.therapist_id,
                  user_name: 'User ID: ' + appointment.user_id,
                  therapist_specialization: [],
                  user_avatar: null
                }));
                
                if (processedData.length > 0) {
                  setAppointments(processedData);
                  setError(null);
                }
              }}
            >
              Örnek Randevuyu Göster
            </Button>
          )}
        </Paper>
      )}

      <Paper withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th style={{ color: '#5E4B8B' }}>Kullanıcı</th>
                <th style={{ color: '#5E4B8B' }}>Psikolog</th>
                <th style={{ color: '#5E4B8B' }}>Tarih & Saat</th>
                <th style={{ color: '#5E4B8B' }}>Durum</th>
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
        title={<Title order={4} c="etherea.7" component="span">Randevu Detayları</Title>}
        styles={{
          header: {
            backgroundColor: '#F9F6FF',
          },
          body: {
            backgroundColor: '#F9F6FF',
          }
        }}
      >
        {selectedAppointment && (
          <Stack>
            <div>
              <Text fw={700} mb={5} c="etherea.7">
                Kullanıcı
              </Text>
              <Text c="etherea.9">{selectedAppointment.user_name}</Text>
            </div>

            <div>
              <Text fw={700} mb={5} c="etherea.7">
                Psikolog
              </Text>
              <Text c="etherea.9">{selectedAppointment.therapist_name}</Text>
            </div>

            <div>
              <Text fw={700} mb={5} c="etherea.7">
                Tarih ve Saat
              </Text>
              <Text c="etherea.9">
                {new Date(selectedAppointment.appointment_date).toLocaleDateString('tr-TR')},{' '}
                {selectedAppointment.start_time} - {selectedAppointment.end_time}
              </Text>
            </div>

            <div>
              <Text fw={700} mb={5} c="etherea.7">
                Görüşme Tipi
              </Text>
              <Text c="etherea.9">
                {selectedAppointment.session_type === 'online'
                  ? 'Online Görüşme'
                  : 'Yüz Yüze Görüşme'}
              </Text>
            </div>

            {selectedAppointment.session_type === 'online' && selectedAppointment.session_link && (
              <div>
                <Text fw={700} mb={5} c="etherea.7">
                  Görüşme Linki
                </Text>
                <Text c="etherea.9">{selectedAppointment.session_link}</Text>
              </div>
            )}

            <div>
              <Text fw={700} mb={5} c="etherea.7">
                Durum
              </Text>
              <Badge color={getStatusColor(selectedAppointment.status)} variant="light">
                {getStatusText(selectedAppointment.status)}
              </Badge>
            </div>

            {selectedAppointment.notes && (
              <div>
                <Text fw={700} mb={5} c="etherea.7">
                  Notlar
                </Text>
                <Text c="etherea.9">{selectedAppointment.notes}</Text>
              </div>
            )}

            <Divider />

            <Group justify="right">
              <Button variant="light" color="etherea.4" onClick={() => setDetailsOpened(false)}>
                Kapat
              </Button>
              <Button
                color="etherea.4"
                c="white"
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
        title={<Title order={4} c="etherea.7" component="span">Randevu Durumunu Değiştir</Title>}
        styles={{
          header: {
            backgroundColor: '#F9F6FF',
          },
          body: {
            backgroundColor: '#F9F6FF',
          }
        }}
      >
        {selectedAppointment && (
          <Stack>
            <Text c="dimmed">
              <b style={{ color: '#5E4B8B' }}>
                {selectedAppointment.user_name} - {selectedAppointment.therapist_name}
              </b>{' '}
              randevusunun durumunu değiştir:
            </Text>

            <Select
              label="Yeni Durum"
              placeholder="Durum seçin"
              value={newStatus}
              onChange={setNewStatus}
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
                { value: 'pending', label: 'Beklemede' },
                { value: 'confirmed', label: 'Onaylandı' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'cancelled', label: 'İptal Edildi' },
              ]}
            />

            <Group justify="right" mt="md">
              <Button variant="light" color="etherea.4" onClick={() => setStatusModalOpened(false)} disabled={actionLoading}>
                İptal
              </Button>
              <Button
                color="etherea.4"
                c="white"
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