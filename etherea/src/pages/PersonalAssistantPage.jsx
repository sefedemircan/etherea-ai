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
    
    </Stack>
  );
}

export default PersonalAssistantPage; 