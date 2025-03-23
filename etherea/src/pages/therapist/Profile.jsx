import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Avatar,
  Button,
  Badge,
  Grid,
  FileInput,
  Modal,
  TextInput,
  Textarea,
  MultiSelect,
  NumberInput,
  LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconEdit, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

const SPECIALIZATIONS = [
  'Klinik Psikoloji',
  'Bilişsel Davranışçı Terapi',
  'Çift ve Aile Terapisi',
  'Çocuk ve Ergen Psikolojisi',
  'Travma ve EMDR',
  'Kaygı Bozuklukları',
  'Depresyon',
  'Bağımlılık',
  'Yeme Bozuklukları',
  'Cinsel Terapi',
];

const LANGUAGES = [
  'Türkçe',
  'İngilizce',
  'Almanca',
  'Fransızca',
  'İspanyolca',
  'İtalyanca',
  'Arapça',
];

const SESSION_TYPES = [
  { value: 'online', label: 'Online Görüşme' },
  { value: 'in_person', label: 'Yüz Yüze Görüşme' },
];

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    title: '',
    about: '',
    specializations: [],
    education: [],
    certifications: [],
    experience_years: 0,
    session_fee: 0,
    languages: [],
    session_types: [],
  });
  const [uploadingDiploma, setUploadingDiploma] = useState(false);
  const [uploadingCertificates, setUploadingCertificates] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(profile);
      setEditForm({
        full_name: profile.full_name,
        title: profile.title,
        about: profile.about,
        specializations: profile.specializations,
        education: profile.education,
        certifications: profile.certifications,
        experience_years: profile.experience_years,
        session_fee: profile.session_fee,
        languages: profile.languages,
        session_types: profile.session_types,
      });
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Profil bilgileri yüklenemedi',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('therapist_profiles')
        .update(editForm)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...editForm });
      setEditModalOpen(false);
      notifications.show({
        title: 'Başarılı',
        message: 'Profil bilgileri güncellendi',
        color: 'green',
      });
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Profil güncellenemedi',
        color: 'red',
      });
    }
  };

  const handleFileUpload = async (file, type) => {
    if (type === 'diploma') {
      setUploadingDiploma(true);
    } else {
      setUploadingCertificates(true);
    }

    try {
      // Dosya tipi kontrolü
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Desteklenmeyen dosya formatı. Lütfen PDF, JPG veya PNG yükleyin.');
      }

      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Dosya boyutu 5MB\'dan büyük olamaz.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${type}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('therapist-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('therapist-documents')
        .getPublicUrl(filePath);

      const updates = type === 'diploma'
        ? { diploma_url: publicUrl }
        : { certificates_url: publicUrl };

      const { error: updateError } = await supabase
        .from('therapist_profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, ...updates });
      notifications.show({
        title: 'Başarılı',
        message: `${type === 'diploma' ? 'Diploma' : 'Sertifikalar'} yüklendi`,
        color: 'green',
      });
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'Dosya yüklenemedi',
        color: 'red',
      });
    } finally {
      if (type === 'diploma') {
        setUploadingDiploma(false);
      } else {
        setUploadingCertificates(false);
      }
    }
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Paper shadow="sm" radius="md" p="xl" withBorder>
        <Group position="apart" mb="xl">
          <Group>
            <Avatar
              src={profile.avatar_url}
              size={120}
              radius={60}
              color="etherea.4"
            >
              {profile.full_name.charAt(0)}
            </Avatar>
            <div>
              <Title order={2}>{profile.full_name}</Title>
              <Text size="lg" c="dimmed">{profile.title}</Text>
              <Group mt="md">
                <Badge color={profile.is_verified ? 'green' : 'yellow'}>
                  {profile.is_verified ? 'Onaylı Hesap' : 'Onay Bekliyor'}
                </Badge>
                <Badge color={profile.is_active ? 'blue' : 'gray'}>
                  {profile.is_active ? 'Aktif' : 'Pasif'}
                </Badge>
              </Group>
            </div>
          </Group>
          <Button
            leftSection={<IconEdit size={20} />}
            bg="etherea.2"
            c="etherea.5"
            onClick={() => setEditModalOpen(true)}
          >
            Profili Düzenle
          </Button>
        </Group>

        <Grid>
          <Grid.Col span={8}>
            <Stack spacing="xl">
              <Paper shadow="xs" p="md" radius="md">
                <Title order={4} mb="md">Hakkında</Title>
                <Text c="dimmed">{profile.about}</Text>
              </Paper>

              <Paper shadow="xs" p="md" radius="md">
                <Title order={4} mb="md">Uzmanlık Alanları</Title>
                <Group>
                  {profile.specializations.map((spec, index) => (
                    <Badge key={index} size="lg" variant="light" color="etherea.4">
                      {spec}
                    </Badge>
                  ))}
                </Group>
              </Paper>

              <Paper shadow="xs" p="md" radius="md">
                <Title order={4} mb="md">Eğitim</Title>
                <Stack spacing="xs">
                  {profile.education.map((edu, index) => (
                    <Text c="dimmed" key={index}>{edu}</Text>
                  ))}
                </Stack>
              </Paper>

              {profile.certifications.length > 0 && (
                <Paper shadow="xs" p="md" radius="md">
                  <Title order={4} mb="md">Sertifikalar</Title>
                  <Stack spacing="xs">
                    {profile.certifications.map((cert, index) => (
                      <Text c="dimmed" key={index}>{cert}</Text>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={4}>
            <Stack spacing="xl">
              <Paper shadow="xs" p="md" radius="md">
                <Title order={4} mb="md">Detaylar</Title>
                <Stack spacing="md">
                  <div>
                    <Text size="sm" fw={500} c="dimmed">Deneyim</Text>
                    <Text fw={700} c="dimmed">{profile.experience_years} Yıl</Text>
                  </div>
                  <div>
                    <Text fw={500} size="sm" c="dimmed">Seans Ücreti</Text>
                    <Text fw={700} c="dimmed">{profile.session_fee} TL</Text>
                  </div>
                  <div>
                    <Text fw={500} size="sm" c="dimmed">Konuşulan Diller</Text>
                    <Group>
                      {profile.languages.map((lang, index) => (
                        <Badge key={index} variant="light" color="etherea.4">
                          {lang}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                  <div>
                    <Text fw={500} size="sm" c="dimmed">Görüşme Tipleri</Text>
                    <Group>
                      {profile.session_types.map((type, index) => (
                        <Badge key={index} variant="light" color="etherea.4">
                          {SESSION_TYPES.find(t => t.value === type)?.label}
                        </Badge>
                      ))}
                    </Group>
                  </div>
                </Stack>
              </Paper>

              <Paper shadow="xs" p="md" radius="md">
                <Title order={4} mb="md">Belgeler</Title>
                <Stack spacing="md">
                  <div>
                    <Group position="apart" mb="xs">
                      <Text c="dimmed" size="sm">Diploma</Text>
                      <Button
                        component="label"
                        size="xs"
                        variant="light"
                        leftSection={<IconUpload size={14} />}
                        loading={uploadingDiploma}
                      >
                        Yükle
                        <FileInput
                          style={{ display: 'none' }}
                          accept="application/pdf,image/*"
                          onChange={(file) => handleFileUpload(file, 'diploma')}
                        />
                      </Button>
                    </Group>
                    {profile.diploma_url ? (
                      <Group spacing="xs">
                        <IconCheck size={16} color="green" />
                        <Text size="sm" c="dimmed">Yüklendi</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="red">Yüklenmedi</Text>
                    )}
                  </div>

                  <div>
                    <Group position="apart" mb="xs">
                      <Text c="dimmed" size="sm">Sertifikalar</Text>
                      <Button
                        component="label"
                        size="xs"
                        variant="light"
                        leftSection={<IconUpload size={14} />}
                        loading={uploadingCertificates}
                      >
                        Yükle
                        <FileInput
                          style={{ display: 'none' }}
                          accept="application/pdf"
                          onChange={(file) => handleFileUpload(file, 'certificate')}
                        />
                      </Button>
                    </Group>
                    {profile.certificates_url ? (
                      <Group spacing="xs">
                        <IconCheck size={16} color="green" />
                        <Text size="sm" c="dimmed">Yüklendi</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="red">Yüklenmedi</Text>
                    )}
                  </div>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Paper>

      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Profili Düzenle"
        size="lg"
      >
        <Stack spacing="md">
          <TextInput
            label="Ad Soyad"
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
          <TextInput
            label="Unvan"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <Textarea
            label="Hakkında"
            value={editForm.about}
            onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
            minRows={4}
          />
          <MultiSelect
            label="Uzmanlık Alanları"
            data={SPECIALIZATIONS}
            value={editForm.specializations}
            onChange={(value) => setEditForm({ ...editForm, specializations: value })}
            searchable
          />
          <Textarea
            label="Eğitim Bilgileri"
            value={editForm.education.join('\n')}
            onChange={(e) => setEditForm({ ...editForm, education: e.target.value.split('\n').filter(Boolean) })}
            minRows={3}
            placeholder="Her satıra bir eğitim bilgisi..."
          />
          <Textarea
            label="Sertifikalar"
            value={editForm.certifications.join('\n')}
            onChange={(e) => setEditForm({ ...editForm, certifications: e.target.value.split('\n').filter(Boolean) })}
            minRows={3}
            placeholder="Her satıra bir sertifika..."
          />
          <NumberInput
            label="Deneyim Yılı"
            value={editForm.experience_years}
            onChange={(value) => setEditForm({ ...editForm, experience_years: value })}
            min={0}
          />
          <NumberInput
            label="Seans Ücreti (TL)"
            value={editForm.session_fee}
            onChange={(value) => setEditForm({ ...editForm, session_fee: value })}
            min={0}
          />
          <MultiSelect
            label="Konuştuğunuz Diller"
            data={LANGUAGES}
            value={editForm.languages}
            onChange={(value) => setEditForm({ ...editForm, languages: value })}
            searchable
          />
          <MultiSelect
            label="Görüşme Tipleri"
            data={SESSION_TYPES}
            value={editForm.session_types}
            onChange={(value) => setEditForm({ ...editForm, session_types: value })}
          />
          <Group position="right" mt="xl">
            <Button variant="light" onClick={() => setEditModalOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleProfileUpdate}>
              Kaydet
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default Profile; 