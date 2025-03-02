import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
  Text,
  MultiSelect,
  Textarea,
  NumberInput,
  Stack,
  Group,
  FileInput,
  Stepper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { IconUpload } from '@tabler/icons-react';
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

function TherapistSignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [active, setActive] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    initialValues: {
      // Hesap Bilgileri
      email: '',
      password: '',
      confirmPassword: '',
      
      // Kişisel Bilgiler
      full_name: '',
      title: '',
      about: '',
      experience_years: 0,
      
      // Uzmanlık ve Eğitim
      specializations: [],
      education: '',
      certifications: '',
      
      // Çalışma Detayları
      session_fee: 0,
      languages: [],
      session_types: [],
      
      // Dokümanlar
      diploma: null,
      certificates: null,
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Geçerli bir e-posta adresi girin'),
      password: (value) => (value.length < 6 ? 'Şifre en az 6 karakter olmalıdır' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'Şifreler eşleşmiyor' : null,
      full_name: (value) => (value.length < 3 ? 'Ad Soyad gereklidir' : null),
      title: (value) => (value.length < 2 ? 'Unvan gereklidir' : null),
      about: (value) => (value.length < 100 ? 'Lütfen kendinizi detaylı tanıtın (en az 100 karakter)' : null),
      experience_years: (value) => (value < 0 ? 'Geçerli bir deneyim yılı girin' : null),
      specializations: (value) => (value.length === 0 ? 'En az bir uzmanlık alanı seçin' : null),
      education: (value) => (value.length < 10 ? 'Eğitim bilgilerinizi detaylı girin' : null),
      session_fee: (value) => (value <= 0 ? 'Geçerli bir seans ücreti girin' : null),
      languages: (value) => (value.length === 0 ? 'En az bir dil seçin' : null),
      session_types: (value) => (value.length === 0 ? 'En az bir görüşme tipi seçin' : null),
    },
  });

  const nextStep = async () => {
    const currentStepFields = {
      0: ['email', 'password', 'confirmPassword'],
      1: ['full_name', 'title', 'about', 'experience_years'],
      2: ['specializations', 'education'],
      3: ['session_fee', 'languages', 'session_types', 'diploma']
    }[active];

    const validation = form.validate();
    const stepErrors = Object.keys(validation.errors).filter(field => 
      currentStepFields.includes(field)
    );

    if (stepErrors.length === 0) {
      setActive((current) => (current < 3 ? current + 1 : current));
    }
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = async (values) => {
    setIsLoading(true);
    try {
      // 1. Kullanıcı hesabı oluştur
      const authData = await signUp({
        email: values.email,
        password: values.password,
        name: values.full_name
      });

      if (!authData?.user?.id) {
        throw new Error('Kullanıcı kaydı başarısız oldu');
      }

      // Kullanıcının veritabanına kaydedilmesi için bekle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Kullanıcı rolünü 'therapist' olarak güncelle
      try {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            id: authData.user.id,
            role: 'therapist'
          });

        if (roleError) {
          console.error('Rol oluşturma hatası:', roleError);
          // Rol oluşturma başarısız olsa bile devam et
        }
      } catch (roleError) {
        console.error('Rol oluşturma hatası:', roleError);
        // Rol oluşturma başarısız olsa bile devam et
      }

      // 3. Psikolog profilini oluştur
      const { data: profile, error: profileError } = await supabase
        .from('therapist_profiles')
        .insert({
          id: authData.user.id,
          full_name: values.full_name,
          title: values.title,
          specializations: values.specializations,
          education: values.education.split('\n').filter(Boolean),
          certifications: values.certifications.split('\n').filter(Boolean),
          about: values.about,
          experience_years: values.experience_years,
          session_fee: values.session_fee,
          languages: values.languages,
          session_types: values.session_types.map(type => type.value),
          is_verified: false,
          is_active: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Profil oluşturulurken bir hata oluştu');
      }

      notifications.show({
        title: 'Başarılı',
        message: 'Kaydınız alınmıştır. Profiliniz yönetici onayından sonra aktif olacaktır. E-posta adresinize gönderilen doğrulama bağlantısını kullanarak hesabınızı aktifleştirebilirsiniz.',
        color: 'green',
      });

      navigate('/auth/signin');
    } catch (error) {
      console.error('Kayıt hatası:', error);
      notifications.show({
        title: 'Hata',
        message: error.message || 'Kayıt işlemi sırasında bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file, folder) => {
    try {
      // Dosya tipi kontrolü
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Desteklenmeyen dosya formatı. Lütfen JPG, PNG veya PDF yükleyin.');
      }

      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Dosya boyutu 5MB\'dan büyük olamaz.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('therapist-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Dosya yükleme hatası:', uploadError);
        throw new Error('Dosya yüklenirken bir hata oluştu.');
      }

      return filePath;
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      throw error;
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mb="xl">
          Psikolog Kaydı
        </Title>

        <Stepper active={active} breakpoint="sm" mb="xl">
          <Stepper.Step label="Hesap" description="Hesap Bilgileri">
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <Stack>
                <TextInput
                  required
                  label="E-posta"
                  placeholder="ornek@mail.com"
                  {...form.getInputProps('email')}
                />
                <PasswordInput
                  required
                  label="Şifre"
                  placeholder="******"
                  {...form.getInputProps('password')}
                />
                <PasswordInput
                  required
                  label="Şifre Tekrar"
                  placeholder="******"
                  {...form.getInputProps('confirmPassword')}
                />
                <Group justify="flex-end" mt="md">
                  <Button type="submit" color="etherea.2">İleri</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>

          <Stepper.Step label="Kişisel" description="Kişisel Bilgiler">
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <Stack>
                <TextInput
                  required
                  label="Ad Soyad"
                  placeholder="Dr. Ayşe Yılmaz"
                  {...form.getInputProps('full_name')}
                />
                <TextInput
                  required
                  label="Unvan"
                  placeholder="Klinik Psikolog"
                  {...form.getInputProps('title')}
                />
                <Textarea
                  required
                  label="Hakkında"
                  placeholder="Kendinizi tanıtın..."
                  minRows={4}
                  {...form.getInputProps('about')}
                />
                <NumberInput
                  required
                  label="Deneyim Yılı"
                  placeholder="5"
                  min={0}
                  {...form.getInputProps('experience_years')}
                />
                <Group justify="space-between" mt="md">
                  <Button variant="light" onClick={prevStep} color="etherea.2">Geri</Button>
                  <Button type="submit" color="etherea.2">İleri</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>

          <Stepper.Step label="Uzmanlık" description="Uzmanlık ve Eğitim">
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <Stack>
                <MultiSelect
                  required
                  label="Uzmanlık Alanları"
                  placeholder="Seçin..."
                  data={SPECIALIZATIONS}
                  searchable
                  {...form.getInputProps('specializations')}
                  styles={{
                    input: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                      '&:focus': {
                        borderColor: '#9A7BFF',
                      }
                    },
                    dropdown: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                    },
                    item: {
                      color: '#5E4B8B',
                      '&[dataSelected]': {
                        backgroundColor: '#E2D8FF',
                        color: '#5E4B8B',
                      },
                      '&[dataHovered]': {
                        backgroundColor: '#F0EBFF',
                        color: '#5E4B8B',
                      },
                    },
                    value: {
                      backgroundColor: '#E2D8FF',
                      color: '#5E4B8B',
                    }
                  }}
                />
                <Textarea
                  required
                  label="Eğitim Bilgileri"
                  placeholder="Her satıra bir eğitim bilgisi..."
                  minRows={3}
                  {...form.getInputProps('education')}
                />
                <Textarea
                  label="Sertifikalar"
                  placeholder="Her satıra bir sertifika..."
                  minRows={3}
                  {...form.getInputProps('certifications')}
                />
                <Group justify="space-between" mt="md">
                  <Button variant="light" onClick={prevStep} color="etherea.2">Geri</Button>
                  <Button type="submit" color="etherea.2">İleri</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>

          <Stepper.Step label="Detaylar" description="Çalışma Detayları">
            <form onSubmit={(e) => { e.preventDefault(); form.onSubmit(handleSubmit)(e); }}>
              <Stack>
                <NumberInput
                  required
                  label="Seans Ücreti (TL)"
                  placeholder="1000"
                  min={0}
                  {...form.getInputProps('session_fee')}
                />
                <MultiSelect
                  required
                  label="Konuştuğunuz Diller"
                  placeholder="Seçin..."
                  data={LANGUAGES}
                  searchable
                  {...form.getInputProps('languages')}
                  styles={{
                    input: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                      '&:focus': {
                        borderColor: '#9A7BFF',
                      }
                    },
                    dropdown: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                    },
                    item: {
                      color: '#5E4B8B',
                      '&[data-selected]': {
                        backgroundColor: '#E2D8FF',
                        color: '#5E4B8B',
                      },
                      '&[data-hovered]': {
                        backgroundColor: '#F0EBFF',
                        color: '#5E4B8B',
                      },
                    },
                    value: {
                      backgroundColor: '#E2D8FF',
                      color: '#5E4B8B',
                    }
                  }}
                />
                <MultiSelect
                  required
                  label="Görüşme Tipleri"
                  placeholder="Seçin..."
                  data={SESSION_TYPES}
                  {...form.getInputProps('session_types')}
                  styles={{
                    input: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                      '&:focus': {
                        borderColor: '#9A7BFF',
                      }
                    },
                    dropdown: {
                      backgroundColor: '#F9F6FF',
                      borderColor: '#E2D8FF',
                    },
                    item: {
                      color: '#5E4B8B',
                      '&[data-selected]': {
                        backgroundColor: '#E2D8FF',
                        color: '#5E4B8B',
                      },
                      '&[data-hovered]': {
                        backgroundColor: '#F0EBFF',
                        color: '#5E4B8B',
                      },
                    },
                    value: {
                      backgroundColor: '#E2D8FF',
                      color: '#5E4B8B',
                    }
                  }}
                />
                <FileInput
                  label="Diploma"
                  placeholder="Diploma yükleyin"
                  accept="application/pdf,image/*"
                  icon={<IconUpload size={14} />}
                  {...form.getInputProps('diploma')}
                  disabled
                />
                <FileInput
                  label="Sertifikalar (PDF)"
                  placeholder="Sertifikalarınızı yükleyin"
                  accept="application/pdf"
                  icon={<IconUpload size={14} />}
                  {...form.getInputProps('certificates')}
                  disabled
                />
                <Text size="sm" c="dimmed">
                  * Diploma ve sertifikalarınızı hesabınız onaylandıktan sonra profil sayfanızdan yükleyebilirsiniz.
                </Text>
                <Group justify="space-between" mt="md">
                  <Button variant="light" onClick={prevStep} color="etherea.2">Geri</Button>
                  <Button type="submit" loading={isLoading} color="etherea.2">Kaydı Tamamla</Button>
                </Group>
              </Stack>
            </form>
          </Stepper.Step>
        </Stepper>
      </Paper>
    </Container>
  );
}

export default TherapistSignUp; 