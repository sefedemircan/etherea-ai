import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Grid, Text, LoadingOverlay } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi, journalApi } from '../services/supabase';
import { aiApi } from '../services/openai';
import { notifications } from '@mantine/notifications';

function Analysis() {
  const [moodData, setMoodData] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Son 30 günün verilerini al
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Duygu durumu verilerini yükle
      const moodTrends = await analyticsApi.getMoodTrends(startDate, endDate);
      const formattedMoodData = moodTrends.map(item => ({
        date: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        mood: item.mood
      }));
      setMoodData(formattedMoodData);

      // Anahtar kelimeleri yükle
      const keywordData = await analyticsApi.getKeywords();
      const maxFrequency = Math.max(...keywordData.map(k => k.frequency));
      const formattedKeywords = keywordData.map(k => ({
        text: k.keyword,
        size: 15 + (k.frequency / maxFrequency) * 25 // 15-40px arası boyutlandırma
      }));
      setKeywords(formattedKeywords);

      // Son günlükleri al ve AI özeti oluştur
      const entries = await journalApi.getEntries();
      if (entries.length > 0) {
        const recentEntries = entries.slice(0, 5); // Son 5 günlük
        const aiSummary = await aiApi.generateSummary(recentEntries);
        setSummary(aiSummary.summary);
      }
    } catch (error) {
      notifications.show({
        title: 'Hata',
        message: 'Analiz verileri yüklenirken bir hata oluştu',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack spacing="lg">
      <Grid>
        <Grid.Col span={12}>
          <Paper shadow="sm" p="md" radius="md" pos="relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
            <Title order={4} mb="lg">Duygu Durumu Grafiği</Title>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2D8FF" />
                <XAxis 
                  dataKey="date" 
                  stroke="#5E4B8B"
                  tick={{ fill: '#5E4B8B' }}
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1, 2, 3, 4, 5]} 
                  stroke="#5E4B8B"
                  tick={{ fill: '#5E4B8B' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#F9F6FF',
                    border: '1px solid #E2D8FF',
                    borderRadius: '4px'
                  }}
                  labelStyle={{ color: '#5E4B8B' }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#9A7BFF"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#F9F6FF', stroke: '#9A7BFF' }}
                  activeDot={{ r: 6, fill: '#9A7BFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper shadow="sm" p="md" radius="md" pos="relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
            <Title order={4} mb="md">Anahtar Kelimeler</Title>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px', 
              justifyContent: 'center',
              minHeight: '200px',
              alignItems: 'center' 
            }}>
              {keywords.map((keyword, index) => (
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
          <Paper shadow="sm" p="md" radius="md" pos="relative">
            <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
            <Title order={4} mb="md">AI Özeti</Title>
            {summary ? (
              <Text>{summary}</Text>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Henüz yeterli günlük girişi bulunmuyor
              </Text>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default Analysis; 