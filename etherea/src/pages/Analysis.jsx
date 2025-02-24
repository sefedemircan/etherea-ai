import { Paper, Stack, Title, Grid, Text } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: '1 Şub', mood: 3 },
  { date: '2 Şub', mood: 4 },
  { date: '3 Şub', mood: 2 },
  { date: '4 Şub', mood: 5 },
  { date: '5 Şub', mood: 4 },
  { date: '6 Şub', mood: 3 },
  { date: '7 Şub', mood: 4 },
];

const mockKeywords = [
  { text: 'aile', size: 40 },
  { text: 'iş', size: 35 },
  { text: 'arkadaşlar', size: 30 },
  { text: 'spor', size: 25 },
  { text: 'kitap', size: 20 },
  { text: 'müzik', size: 15 },
];

function Analysis() {
  return (
    <Stack spacing="lg">
      <Grid>
        <Grid.Col span={12}>
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="lg">Duygu Durumu Grafiği</Title>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#5E4B8B"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#9A7BFF', stroke: '#5E4B8B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="md">Anahtar Kelimeler</Title>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {mockKeywords.map((keyword, index) => (
                <Text
                  key={index}
                  size={keyword.size}
                  style={{ cursor: 'pointer' }}
                  c={index % 2 === 0 ? '#9A7BFF' : '#5E4B8B'}
                >
                  {keyword.text}
                </Text>
              ))}
            </div>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="md">AI Özeti</Title>
            <Text>
              Son 7 günde genel olarak pozitif bir ruh haline sahipsin. 
              Özellikle aile ve arkadaşlarınla geçirdiğin zamanlar seni mutlu ediyor. 
              İş konusunda bazı stresli günler yaşamış olsan da, spor ve müzik 
              aktiviteleriyle bu stresi dengelemeyi başarmışsın.
            </Text>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default Analysis; 