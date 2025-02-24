import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Grid, Text, LoadingOverlay, Skeleton, Badge, Tooltip, Group } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi, journalApi } from '../services/supabase';
import { aiApi } from '../services/openai';
import { notifications } from '@mantine/notifications';

function Analysis() {
  const [moodData, setMoodData] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [summary, setSummary] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    mood: true,
    keywords: true,
    summary: true
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Paralel veri çekme işlemleri, her bölüm kendi verisi hazır olduğunda yüklenecek
    Promise.allSettled([
      // Duygu durumu verilerini yükle
      analyticsApi.getMoodTrends(startDate, endDate)
        .then(moodTrends => {
          const formattedMoodData = moodTrends.map(item => ({
            date: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            mood: item.mood
          }));
          setMoodData(formattedMoodData);
          setLoadingStates(prev => ({ ...prev, mood: false }));
        })
        .catch(() => {
          notifications.show({
            title: 'Hata',
            message: 'Duygu durumu verileri yüklenemedi',
            color: 'red',
          });
          setLoadingStates(prev => ({ ...prev, mood: false }));
        }),

      // Anahtar kelimeleri yükle
      analyticsApi.getKeywords()
        .then(keywordData => {
          const maxFrequency = Math.max(...keywordData.map(k => k.frequency));
          const formattedKeywords = keywordData.map(k => ({
            text: k.keyword,
            size: 15 + (k.frequency / maxFrequency) * 25
          }));
          setKeywords(formattedKeywords);
          setLoadingStates(prev => ({ ...prev, keywords: false }));
        })
        .catch(() => {
          notifications.show({
            title: 'Hata',
            message: 'Anahtar kelimeler yüklenemedi',
            color: 'red',
          });
          setLoadingStates(prev => ({ ...prev, keywords: false }));
        }),

      // Son günlükleri al ve AI özeti oluştur
      journalApi.getEntries()
        .then(async entries => {
          if (entries.length > 0) {
            const recentEntries = entries.slice(0, 5);
            const aiSummary = await aiApi.generateSummary(recentEntries);
            setSummary(aiSummary.summary);
          }
          setLoadingStates(prev => ({ ...prev, summary: false }));
        })
        .catch(() => {
          notifications.show({
            title: 'Hata',
            message: 'AI özeti oluşturulamadı',
            color: 'red',
          });
          setLoadingStates(prev => ({ ...prev, summary: false }));
        })
    ]);
  };

  const renderMoodChart = () => (
    <Paper shadow="sm" p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loadingStates.mood} overlayProps={{ blur: 2 }} />
      <Title order={4} mb="lg">Duygu Durumu Grafiği</Title>
      {!loadingStates.mood && moodData.length > 0 ? (
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
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          Henüz yeterli veri bulunmuyor
        </Text>
      )}
    </Paper>
  );

  const renderKeywords = () => {
    const getKeywordColor = (frequency) => {
      // En yüksek frekansa göre renk belirleme
      const maxSize = Math.max(...keywords.map(k => k.size));
      const ratio = (frequency - 15) / (maxSize - 15); // 15 minimum boyut
      
      if (ratio > 0.8) return 'etherea.6';      // En sık
      if (ratio > 0.6) return 'etherea.5';      // Çok sık
      if (ratio > 0.4) return 'etherea.4';      // Orta sık
      if (ratio > 0.2) return 'etherea.3';      // Az sık
      return 'etherea.2';                       // En az sık
    };

    const getKeywordSize = (size) => {
      // Badge boyutunu belirle
      if (size > 35) return 'xl';
      if (size > 30) return 'lg';
      if (size > 25) return 'md';
      if (size > 20) return 'sm';
      return 'xs';
    };

    return (
      <Paper shadow="sm" p="md" radius="md" pos="relative">
        <LoadingOverlay visible={loadingStates.keywords} overlayProps={{ blur: 2 }} />
        <Title order={4} mb="md">Anahtar Kelimeler</Title>
        {!loadingStates.keywords && keywords.length > 0 ? (
          <Stack spacing="lg">
            <Text size="sm" c="dimmed" ta="center">
              Son 30 günde en sık kullandığınız kelimeler ve duygular
            </Text>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '12px', 
              justifyContent: 'center',
              padding: '20px',
              minHeight: '200px',
              alignItems: 'center',
              background: '#F0EBFF',
              borderRadius: '8px'
            }}>
              {keywords.map((keyword, index) => (
                <Tooltip
                  key={index}
                  label={`${keyword.text} (${Math.round((keyword.size - 15) * 4)}% sıklıkta)`}
                  position="top"
                  withArrow
                >
                  <Badge
                    size={getKeywordSize(keyword.size)}
                    radius="md"
                    variant="light"
                    color={getKeywordColor(keyword.size)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    {keyword.text}
                  </Badge>
                </Tooltip>
              ))}
            </div>
            <Group justify="center" gap="lg">
              <Badge size="xs" variant="light" color="etherea.2">En az kullanılan</Badge>
              <Badge size="sm" variant="light" color="etherea.3">Az kullanılan</Badge>
              <Badge variant="light" color="etherea.4">Orta sıklıkta</Badge>
              <Badge size="lg" variant="light" color="etherea.5">Sık kullanılan</Badge>
              <Badge size="xl" variant="light" color="etherea.6">En sık kullanılan</Badge>
            </Group>
          </Stack>
        ) : (
          <Stack align="center" spacing="md" py="xl">
            <Text c="dimmed" ta="center">
              Henüz anahtar kelime bulunmuyor
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Günlük girdileri oluşturdukça, en sık kullandığınız kelimeler burada görünecek
            </Text>
          </Stack>
        )}
      </Paper>
    );
  };

  const renderSummary = () => (
    <Paper shadow="sm" p="md" radius="md" pos="relative">
      <LoadingOverlay visible={loadingStates.summary} overlayProps={{ blur: 2 }} />
      <Title order={4} mb="md">AI Özeti</Title>
      {!loadingStates.summary && summary ? (
        <Text c="etherea.6">{summary}</Text>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          Henüz yeterli günlük girişi bulunmuyor
        </Text>
      )}
    </Paper>
  );

  return (
    <Stack spacing="lg">
      <Grid>
        <Grid.Col span={12}>
          {renderMoodChart()}
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          {renderKeywords()}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          {renderSummary()}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

export default Analysis; 