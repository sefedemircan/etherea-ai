import { useState, useEffect } from 'react';
import { Button, Group, Text, Paper, Progress } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconPlayerStop } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function VoiceRecorder({ onTranscriptionComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Web Speech API desteğini kontrol et
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      notifications.show({
        title: 'Uyarı',
        message: 'Tarayıcınız ses tanıma özelliğini desteklemiyor.',
        color: 'yellow',
      });
      return;
    }

    // SpeechRecognition nesnesini oluştur
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'tr-TR';

    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimTranscript(interimTranscript);
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Ses tanıma hatası:', event.error);
      notifications.show({
        title: 'Hata',
        message: 'Ses tanıma sırasında bir hata oluştu',
        color: 'red',
      });
      stopRecording();
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognition) return;

    setTranscript('');
    setInterimTranscript('');
    setIsRecording(true);
    recognition.start();

    notifications.show({
      title: 'Bilgi',
      message: 'Ses kaydı başladı',
      color: 'green',
    });
  };

  const stopRecording = () => {
    if (!recognition) return;

    recognition.stop();
    setIsRecording(false);
    setInterimTranscript('');

    if (transcript.trim()) {
      onTranscriptionComplete(transcript.trim());
    }

    notifications.show({
      title: 'Bilgi',
      message: 'Ses kaydı tamamlandı',
      color: 'green',
    });
  };

  if (!isSupported) {
    return (
      <Paper shadow="sm" p="md" radius="md" bg="warmth.1">
        <Text c="warmth.6">
          Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md">
      <Group justify="center" mb="md">
        {!isRecording ? (
          <Button
            leftSection={<IconMicrophone size={20} />}
            onClick={startRecording}
            variant="light"
            color="etherea.4"
          >
            Kayda Başla
          </Button>
        ) : (
          <Button
            leftSection={<IconPlayerStop size={20} />}
            onClick={stopRecording}
            variant="light"
            color="red"
          >
            Kaydı Bitir
          </Button>
        )}
      </Group>

      {isRecording && (
        <>
          <Progress
            value={100}
            animated
            color="etherea.4"
            mb="md"
          />
          <Text size="sm" c="dimmed" mb="xs">
            Konuşmaya devam edin...
          </Text>
        </>
      )}

      {(transcript || interimTranscript) && (
        <Paper shadow="xs" p="sm" radius="md" bg="etherea.1">
          <Text>
            {transcript}
            <Text span c="dimmed" fs="italic">
              {interimTranscript}
            </Text>
          </Text>
        </Paper>
      )}
    </Paper>
  );
}

export default VoiceRecorder; 