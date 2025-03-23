import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  Group, 
  Button, 
  Stack,
  Grid,
  Avatar,
  Box,
  ActionIcon,
  Loader,
  Badge,
  Modal
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconMicrophone, 
  IconMicrophoneOff, 
  IconVideo, 
  IconVideoOff, 
  IconPhone, 
  IconChevronLeft,
  IconScreenShare,
  IconScreenShareOff,
  IconPlayerRecordFilled,
  IconRecordMail
} from '@tabler/icons-react';
import { videoSessionApi } from '../services/supabase';

export default function VideoSession() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTherapist, setIsTherapist] = useState(false);
  const [endOpened, { open: openEnd, close: closeEnd }] = useDisclosure(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const screenShareRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Video oturumu bilgilerini getir
  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const sessionData = await videoSessionApi.getVideoSession(roomName);
        setSession(sessionData);
        
        // Kullanıcı terapist mi kontrol et
        const isUserTherapist = sessionData.appointments.therapist_id === sessionData.created_by;
        setIsTherapist(isUserTherapist);
        
      } catch (err) {
        console.error('Video oturumu yüklenirken hata oluştu:', err);
        setError(err.message || 'Video oturumu yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    if (roomName) {
      getSession();
    }
  }, [roomName]);

  // Kamera ve mikrofonu başlat
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoEnabled, 
          audio: micEnabled 
        });
        
        mediaStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Not: Gerçek bir uygulamada burada WebRTC bağlantısı kurulmalıdır
        
      } catch (err) {
        console.error('Medya erişiminde hata:', err);
        setError('Kamera veya mikrofona erişilemedi. Lütfen izinleri kontrol edin.');
      }
    };

    if (session && !loading) {
      startMedia();
    }

    // Temizlik fonksiyonu
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (screenShareRef.current) {
        screenShareRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [session, loading, videoEnabled, micEnabled]);

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (screenShareEnabled) {
      if (screenShareRef.current) {
        screenShareRef.current.getTracks().forEach(track => track.stop());
        screenShareRef.current = null;
      }
      setScreenShareEnabled(false);
      
      // Kameraya geri dön
      if (localVideoRef.current && mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        
        screenShareRef.current = screenStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Ekran paylaşımı kapandığında otomatik olarak kameraya geri dön
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenShareEnabled(false);
          if (localVideoRef.current && mediaStreamRef.current) {
            localVideoRef.current.srcObject = mediaStreamRef.current;
          }
        };
        
        setScreenShareEnabled(true);
      } catch (err) {
        console.error('Ekran paylaşımı başlatılamadı:', err);
      }
    }
  };

  const toggleRecording = () => {
    // Not: Gerçek uygulamada kayıt işlemleri eklenmeli
    setIsRecording(!isRecording);
  };

  const endCall = () => {
    closeEnd();
    // Oturumu sonlandır ve kullanıcıyı randevular sayfasına yönlendir
    navigate('/appointments');
  };

  if (loading) {
    return (
      <Container size="md" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text>Video oturumu yükleniyor...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md">
        <Paper p="xl" shadow="md" withBorder>
          <Stack align="center" spacing="md">
            <Title order={3} color="red">Hata</Title>
            <Text>{error}</Text>
            <Button 
              leftIcon={<IconChevronLeft size={16} />} 
              onClick={() => navigate('/appointments')}
            >
              Randevularıma Dön
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container size="md">
        <Paper p="xl" shadow="md" withBorder>
          <Stack align="center" spacing="md">
            <Title order={3}>Oturum Bulunamadı</Title>
            <Text>İstediğiniz video oturumu bulunamadı veya erişim yetkiniz yok.</Text>
            <Button 
              leftIcon={<IconChevronLeft size={16} />} 
              onClick={() => navigate('/appointments')}
            >
              Randevularıma Dön
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Randevu bilgilerini formatla
  const appointment = session.appointments;
  const otherPerson = isTherapist ? appointment.user_name : appointment.therapist_name;
  const otherPersonAvatar = isTherapist ? appointment.user_avatar : appointment.therapist_picture;
  
  const appointmentDate = new Date(appointment.appointment_date);
  const formattedDate = appointmentDate.toLocaleDateString('tr-TR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <Container fluid p={0} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Üst Bilgi Çubuğu */}
      <Box 
        p="md" 
        style={{ 
          backgroundColor: 'var(--mantine-color-dark-6)',
          color: 'white'
        }}
      >
        <Grid align="center">
          <Grid.Col span={4}>
            <Group>
              <ActionIcon 
                variant="subtle" 
                color="gray"
                onClick={() => navigate('/appointments')}
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Title order={4} style={{ margin: 0 }}>Video Görüşmesi</Title>
            </Group>
          </Grid.Col>
          
          <Grid.Col span={4}>
            <Group position="center">
              <Badge 
                color={isRecording ? "red" : "blue"} 
                variant="filled" 
                size="lg"
              >
                {isRecording ? "Kayıt Yapılıyor" : "Canlı"}
              </Badge>
            </Group>
          </Grid.Col>
          
          <Grid.Col span={4}>
            <Group position="right">
              <Avatar src={otherPersonAvatar} radius="xl" />
              <div>
                <Text weight={500}>{otherPerson}</Text>
                <Text size="xs">{formattedDate}, {appointment.start_time}</Text>
              </div>
            </Group>
          </Grid.Col>
        </Grid>
      </Box>
      
      {/* Video Alanı */}
      <Box style={{ flex: 1, position: 'relative', backgroundColor: '#0f0f0f' }}>
        {/* Ana Video (Karşı taraf) */}
        <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
          <video 
            ref={remoteVideoRef}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              backgroundColor: '#1a1a1a' 
            }}
            autoPlay
            playsInline
          />
          
          {/* Kendi görüntün küçük videoda */}
          <Box style={{ 
            position: 'absolute', 
            width: '180px', 
            height: '120px', 
            bottom: '20px', 
            right: '20px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid var(--mantine-color-dark-9)'
          }}>
            <video 
              ref={localVideoRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Ayna görüntüsü
                backgroundColor: '#1a1a1a'
              }}
              autoPlay
              playsInline
              muted
            />
          </Box>
        </Box>
      </Box>
      
      {/* Kontroller */}
      <Box 
        p="md" 
        style={{ 
          backgroundColor: 'var(--mantine-color-dark-7)',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem'
        }}
      >
        <ActionIcon 
          variant={micEnabled ? "filled" : "outline"}
          color={micEnabled ? "blue" : "red"}
          radius="xl"
          size="xl"
          onClick={toggleMic}
        >
          {micEnabled ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
        </ActionIcon>
        
        <ActionIcon 
          variant={videoEnabled ? "filled" : "outline"}
          color={videoEnabled ? "blue" : "red"}
          radius="xl"
          size="xl"
          onClick={toggleVideo}
        >
          {videoEnabled ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
        </ActionIcon>
        
        <ActionIcon 
          variant={screenShareEnabled ? "filled" : "outline"}
          color={screenShareEnabled ? "blue" : "gray"}
          radius="xl"
          size="xl"
          onClick={toggleScreenShare}
        >
          {screenShareEnabled ? <IconScreenShare size={20} /> : <IconScreenShareOff size={20} />}
        </ActionIcon>
        
        {isTherapist && (
          <ActionIcon 
            variant={isRecording ? "filled" : "outline"}
            color={isRecording ? "red" : "gray"}
            radius="xl"
            size="xl"
            onClick={toggleRecording}
          >
            {isRecording ? <IconPlayerRecordFilled size={20} /> : <IconRecordMail size={20} />}
          </ActionIcon>
        )}
        
        <ActionIcon 
          variant="filled"
          color="red"
          radius="xl"
          size="xl"
          onClick={openEnd}
        >
          <IconPhone size={20} style={{ transform: 'rotate(135deg)' }} />
        </ActionIcon>
      </Box>
      
      {/* Video bilgilendirme/yardım modalı */}
      <Modal
        opened={endOpened}
        onClose={closeEnd}
        title="Görüşmeyi Sonlandır"
        size="sm"
      >
        <Stack align="center" spacing="md">
          <Text>Bu görüşmeyi sonlandırmak istediğinize emin misiniz?</Text>
          
          <Group>
            <Button variant="outline" onClick={closeEnd}>İptal</Button>
            <Button color="red" onClick={endCall}>Görüşmeyi Sonlandır</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
} 