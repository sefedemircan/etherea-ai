import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Button,
  Stack,
  Switch,
  NumberInput,
  TextInput,
  Divider,
  Alert,
  Accordion,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { adminApi } from '../../services/supabase';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sistem ayarları
  const [systemSettings, setSystemSettings] = useState({
    allowNewRegistrations: true,
    allowTherapistRegistrations: true,
    maintenanceMode: false,
    sessionFeePercentage: 10,
  });

  // E-posta ayarları
  const [emailSettings, setEmailSettings] = useState({
    sendWelcomeEmails: true,
    sendAppointmentReminders: true,
    reminderHoursBeforeAppointment: 24,
    adminEmail: 'admin@etherea.com',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setInitialLoading(true);
        
        // Sistem ayarlarını yükle
        const systemData = await adminApi.getSystemSettings();
        setSystemSettings(systemData);
        
        // E-posta ayarlarını yükle
        const emailData = await adminApi.getEmailSettings();
        setEmailSettings(emailData);
      } catch (err) {
        console.error('Ayarlar yüklenirken hata:', err);
        setError(err.message);
      } finally {
        setInitialLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  const handleSystemSettingChange = (key, value) => {
    setSystemSettings({
      ...systemSettings,
      [key]: value,
    });
  };

  const handleEmailSettingChange = (key, value) => {
    setEmailSettings({
      ...emailSettings,
      [key]: value,
    });
  };

  const handleSaveSystemSettings = async () => {
    try {
      setLoading(true);
      await adminApi.updateSystemSettings(systemSettings);
      notifications.show({
        title: 'Başarılı',
        message: 'Sistem ayarları başarıyla güncellendi',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'Ayarlar kaydedilirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    try {
      setLoading(true);
      await adminApi.updateEmailSettings(emailSettings);
      notifications.show({
        title: 'Başarılı',
        message: 'E-posta ayarları başarıyla güncellendi',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('E-posta ayarları kaydedilirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'E-posta ayarları kaydedilirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      await adminApi.clearSystemCache();
      notifications.show({
        title: 'Başarılı',
        message: 'Sistem önbelleği başarıyla temizlendi',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      console.error('Önbellek temizlenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'Önbellek temizlenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
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

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Sistem Ayarları
      </Title>

      <Accordion 
        defaultValue="system" 
        mb="xl"
        styles={{
          control: {
            backgroundColor: '#F9F6FF',
            '&:hover': {
              backgroundColor: '#E6DFF8',
            }
          },
          item: {
            borderColor: '#E6DFF8',
            '&[data-active]': {
              backgroundColor: '#F9F6FF',
            }
          },
          panel: {
            backgroundColor: '#F9F6FF',
          },
          label: {
            color: '#5E4B8B',
            '&:hover': {
              color: '#9A7BFF',
            }
          },
          chevron: {
            color: '#9A7BFF',
          }
        }}
      >
        <Accordion.Item value="system">
          <Accordion.Control>
            <Title order={4} c="etherea.7">Genel Ayarlar</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Paper p="md" withBorder>
              <Stack>
                <Switch
                  c="dimmed"
                  label="Yeni Kullanıcı Kayıtlarına İzin Ver"
                  checked={systemSettings.allowNewRegistrations}
                  onChange={(event) =>
                    handleSystemSettingChange('allowNewRegistrations', event.currentTarget.checked)
                  }
                />

                <Switch
                  c="dimmed"
                  label="Psikolog Kayıtlarına İzin Ver"
                  checked={systemSettings.allowTherapistRegistrations}
                  onChange={(event) =>
                    handleSystemSettingChange('allowTherapistRegistrations', event.currentTarget.checked)
                  }
                />

                <Switch
                  c="dimmed"
                  label="Bakım Modu"
                  description="Etkinleştirildiğinde, sadece adminler siteye erişebilir"
                  checked={systemSettings.maintenanceMode}
                  onChange={(event) =>
                    handleSystemSettingChange('maintenanceMode', event.currentTarget.checked)
                  }
                />

                <NumberInput
                  c="dimmed"
                  label="Platform Komisyon Oranı (%)"
                  description="Psikolog seans ücretlerinden alınacak komisyon yüzdesi"
                  value={systemSettings.sessionFeePercentage}
                  onChange={(value) => handleSystemSettingChange('sessionFeePercentage', value)}
                  min={0}
                  max={100}
                />

                <Group position="right" mt="md">
                  <Button
                    c="white"
                    color="etherea.4"
                    onClick={handleSaveSystemSettings}
                    loading={loading}
                  >
                    Ayarları Kaydet
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="email">
          <Accordion.Control>
            <Title order={4} c="etherea.7">E-posta Ayarları</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Paper p="md" withBorder>
              <Stack>
                <Switch
                  c="dimmed"
                  label="Hoşgeldiniz E-postaları Gönder"
                  checked={emailSettings.sendWelcomeEmails}
                  onChange={(event) =>
                    handleEmailSettingChange('sendWelcomeEmails', event.currentTarget.checked)
                  }
                />

                <Switch
                  c="dimmed"
                  label="Randevu Hatırlatma E-postaları Gönder"
                  checked={emailSettings.sendAppointmentReminders}
                  onChange={(event) =>
                    handleEmailSettingChange('sendAppointmentReminders', event.currentTarget.checked)
                  }
                />

                <NumberInput
                  c="dimmed"
                  label="Randevu Hatırlatma Süresi (Saat)"
                  description="Randevudan kaç saat önce hatırlatma e-postası gönderilecek"
                  value={emailSettings.reminderHoursBeforeAppointment}
                  onChange={(value) =>
                    handleEmailSettingChange('reminderHoursBeforeAppointment', value)
                  }
                  min={1}
                  max={72}
                />

                <TextInput
                  c="dimmed"
                  label="Admin E-posta Adresi"
                  description="Sistem bildirimleri bu adrese gönderilecek"
                  value={emailSettings.adminEmail}
                  onChange={(event) =>
                    handleEmailSettingChange('adminEmail', event.currentTarget.value)
                  }
                />

                <Group position="right" mt="md">
                  <Button
                    c="white"
                    color="etherea.4"
                    onClick={handleSaveEmailSettings}
                    loading={loading}
                  >
                    E-posta Ayarlarını Kaydet
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="maintenance">
          <Accordion.Control>
            <Title order={4} c="etherea.7">Bakım İşlemleri</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Paper p="md" withBorder>
              <Stack>
                <Alert c="orange" icon={<IconAlertCircle size={16} />} color="orange">
                  <Text c="dimmed">Aşağıdaki işlemler sistem performansını etkileyebilir. Lütfen dikkatli kullanın.</Text>
                </Alert>

                <Text c="dimmed">
                  Sistem önbelleğini temizlemek, performansı geçici olarak düşürebilir ancak bazı
                  hataları çözebilir.
                </Text>

                <Group position="right" mt="md">
                  <Button
                    color="orange"
                    c="white"
                    onClick={handleClearCache}
                    loading={loading}
                  >
                    Önbelleği Temizle
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
} 