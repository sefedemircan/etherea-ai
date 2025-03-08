import { useState, useEffect } from 'react';
import { Button, Group, Text, Paper, Progress, Loader, Badge, Stack, Accordion } from '@mantine/core';
import { IconMicrophone, IconMicrophoneOff, IconPlayerStop, IconBrain, IconChartBar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { aiApi } from '../services/openai';

function VoiceRecorder({ onTranscriptionComplete, onAnalysisComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

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
    setAnalysis(null);
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

  const analyzeVoice = async () => {
    if (!transcript.trim()) {
      notifications.show({
        title: 'Uyarı',
        message: 'Analiz için önce ses kaydı yapmalısınız',
        color: 'yellow',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await aiApi.analyzeVoice(transcript);
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      
      notifications.show({
        title: 'Başarılı',
        message: 'Ses analizi tamamlandı',
        color: 'green',
      });
    } catch (error) {
      console.error('Ses analizi hatası:', error);
      notifications.show({
        title: 'Hata',
        message: 'Ses analizi sırasında bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      'mutluluk': 'green',
      'sevinç': 'green',
      'heyecan': 'green',
      'üzüntü': 'blue',
      'keder': 'blue',
      'kaygı': 'yellow',
      'endişe': 'yellow',
      'korku': 'orange',
      'öfke': 'red',
      'kızgınlık': 'red',
      'nötr': 'gray'
    };

    // Duygu durumunu küçük harfe çevir ve Türkçe karakterleri normalize et
    const normalizedEmotion = emotion.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Eşleşen bir renk varsa döndür, yoksa varsayılan olarak 'gray' döndür
    for (const [key, value] of Object.entries(emotionColors)) {
      if (normalizedEmotion.includes(key.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
        return value;
      }
    }
    
    return 'gray';
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
        
        {transcript && !isRecording && (
          <Button
            leftSection={<IconBrain size={20} />}
            onClick={analyzeVoice}
            variant="light"
            color="serenity.4"
            loading={isAnalyzing}
          >
            Ses Analizi Yap
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
        <Paper shadow="xs" p="sm" radius="md" bg="etherea.1" mb="md">
          <Text>
            {transcript}
            <Text span c="dimmed" fs="italic">
              {interimTranscript}
            </Text>
          </Text>
        </Paper>
      )}

      {isAnalyzing && (
        <Group justify="center" my="md">
          <Loader color="serenity.4" />
          <Text>Ses analizi yapılıyor...</Text>
        </Group>
      )}

      {analysis && (
        <Paper shadow="xs" p="md" radius="md" bg="serenity.1">
          <Stack>
            <Group>
              <Text c="dimmed" fw={600}>Duygu Analizi Sonuçları</Text>
              <Badge color={getEmotionColor(analysis.emotion_detected)}>
                {analysis.emotion_detected}
              </Badge>
              <Badge color="etherea.4">
                Duygu Durumu: {analysis.mood}/5
              </Badge>
              <Badge color="serenity.4">
                Güven Seviyesi: {analysis.confidence}/10
              </Badge>
            </Group>

            <Accordion>
              <Accordion.Item value="summary">
                <Accordion.Control c="dimmed" icon={<IconChartBar size={20} />}>
                  Analiz Özeti
                </Accordion.Control>
                <Accordion.Panel>
                  <Text c="dimmed" mb="xs">{analysis.summary}</Text>
                  
                  <Text c="dimmed" fw={600} mt="md">Anahtar Kelimeler:</Text>
                  <Group gap="xs" mb="md">
                    {analysis.keywords.map((keyword, index) => (
                      <Badge c="warmth.5" bg="etherea.1" key={index} color="warmth.3">
                        {keyword}
                      </Badge>
                    ))}
                  </Group>
                  
                  <Text c="dimmed" fw={600}>Konuşma Kalıpları:</Text>
                  <Group gap="xs" mb="md">
                    {analysis.speech_patterns.map((pattern, index) => (
                      <Badge c="etherea.5" bg="etherea.1" key={index} color="etherea.3" variant="outline">
                        {pattern}
                      </Badge>
                    ))}
                  </Group>
                  
                  <Text c="dimmed" fw={600}>Öneriler:</Text>
                  <ul style={{ color: '#828282' }}>
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Paper>
      )}
    </Paper>
  );
}

export default VoiceRecorder; 