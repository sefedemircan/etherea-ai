import { Stack, Title, Text, Paper } from '@mantine/core';
import PersonalAssistant from '../components/PersonalAssistant';

function PersonalAssistantPage() {
  return (
    <Stack spacing="lg">
      <Title order={2}>Kişisel Asistanınız</Title>
      <Text c="dimmed">
        Kişisel asistanınız, günlük girdilerinizi ve duygu durumunuzu analiz ederek size özel tavsiyeler sunar.
        Asistanınızla sohbet edebilir, sorular sorabilir ve günlük hayatınızda size yardımcı olacak öneriler alabilirsiniz.
      </Text>
      
      <Paper shadow="sm" p="xl" radius="md" bg="etherea.0">
        <PersonalAssistant />
      </Paper>
      
      <Paper shadow="sm" p="md" radius="md">
        <Title order={4} mb="md">Kişisel Asistan Hakkında</Title>
        <Text c="dimmed" mb="md">
          Kişisel asistanınız, yapay zeka teknolojisi kullanarak günlük girdilerinizi, duygu durumunuzu ve alışkanlıklarınızı
          analiz eder. Bu analizler sonucunda size özel içgörüler ve tavsiyeler sunar.
        </Text>
        <Text c="dimmed" mb="md">
          Asistanınız zamanla sizi daha iyi tanır ve önerilerini kişiselleştirir. Ne kadar çok günlük girerseniz,
          asistanınız o kadar doğru ve faydalı öneriler sunabilir.
        </Text>
        <Text c="dimmed">
          Asistanınızla konuşurken, duygularınızı, düşüncelerinizi ve sorularınızı paylaşabilirsiniz. Asistanınız
          size empatik ve yapıcı yanıtlar verecektir.
        </Text>
      </Paper>
    </Stack>
  );
}

export default PersonalAssistantPage; 