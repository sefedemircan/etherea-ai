import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Text, Group, Avatar, ScrollArea, TextInput, Button, Badge } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';

function Messages() {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Psikologları ve konuşmaları yükle
  useEffect(() => {
    loadTherapists();
    
    // Gerçek zamanlı mesaj güncellemeleri için subscription
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        handleNewMessage(payload.new);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Seçili psikolog değiştiğinde mesajları yükle
  useEffect(() => {
    if (selectedTherapist) {
      loadMessages(selectedTherapist.id);
    }
  }, [selectedTherapist]);

  const loadTherapists = async () => {
    try {
      // Önce kullanıcının rolünü kontrol et
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError) throw roleError;

      // Tüm konuşmaları getir
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read,
          sender:profiles!sender_id(
            id,
            name,
            avatar_url
          ),
          receiver:profiles!receiver_id(
            id,
            name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!messages || messages.length === 0) {
        setTherapists([]);
        return;
      }

      // Benzersiz kullanıcı ID'lerini topla
      const uniqueUserIds = new Set();
      messages.forEach(message => {
        const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        uniqueUserIds.add(otherId);
      });

      // Psikolog profillerini getir
      const { data: therapistProfiles, error: therapistError } = await supabase
        .from('therapist_profiles')
        .select('id, full_name, title, avatar_url')
        .in('id', Array.from(uniqueUserIds));

      if (therapistError) throw therapistError;

      // Psikolog profillerini ID'ye göre maple
      const therapistMap = new Map();
      if (therapistProfiles) {
        therapistProfiles.forEach(profile => {
          if (profile?.id) {
            therapistMap.set(profile.id, profile);
          }
        });
      }

      // Konuşmaları kullanıcılara göre grupla
      const conversationMap = new Map();
      
      messages.forEach(message => {
        if (!message) return;

        const isUserSender = message.sender_id === user.id;
        const otherId = isUserSender ? message.receiver_id : message.sender_id;
        const otherProfile = isUserSender ? message.receiver : message.sender;
        const therapistProfile = therapistMap.get(otherId);

        // Varsayılan değerler
        let name = 'İsimsiz Kullanıcı';
        let avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`;
        let title = null;

        // Kullanıcı rolüne göre profil bilgilerini belirle
        if (userRole.role === 'therapist') {
          // Psikolog için normal profil bilgilerini kullan
          if (otherProfile) {
            name = otherProfile.name || name;
            avatar_url = otherProfile.avatar_url || avatar_url;
          }
        } else {
          // Normal kullanıcı için psikolog bilgilerini kullan
          if (therapistProfile) {
            name = therapistProfile.full_name || name;
            avatar_url = therapistProfile.avatar_url || avatar_url;
            title = therapistProfile.title;
          }
        }

        const existingConv = conversationMap.get(otherId);
        if (!existingConv) {
          conversationMap.set(otherId, {
            id: otherId,
            name,
            title,
            avatar_url,
            lastMessage: message.content || '',
            lastMessageDate: message.created_at,
            unreadCount: (!isUserSender && !message.is_read) ? 1 : 0
          });
        } else {
          // Okunmamış mesaj sayısını güncelle
          if (!isUserSender && !message.is_read) {
            existingConv.unreadCount = (existingConv.unreadCount || 0) + 1;
          }
          // Son mesajı güncelle
          if (message.created_at > existingConv.lastMessageDate) {
            existingConv.lastMessage = message.content || '';
            existingConv.lastMessageDate = message.created_at;
          }
        }
      });

      setTherapists(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Konuşmalar yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Konuşmalar yüklenemedi',
        color: 'red'
      });
      setTherapists([]); // Hata durumunda boş liste göster
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId) => {
    try {
      // Önce kullanıcının rolünü kontrol et
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError) throw roleError;

      // Mesajları getir
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:profiles!sender_id(
            id,
            name,
            avatar_url
          ),
          receiver:profiles!receiver_id(
            id,
            name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Eğer diğer kullanıcı bir psikologsa, psikolog profilini getir
      let therapistProfile = null;
      if (userRole.role !== 'therapist') {
        const { data: therapist, error: therapistError } = await supabase
          .from('therapist_profiles')
          .select('id, full_name, title, avatar_url')
          .eq('id', userId)
          .single();

        if (!therapistError) {
          therapistProfile = therapist;
        }
      }

      // Mesajları zenginleştir
      const enrichedMessages = messages.map(message => {
        if (!message) return null;

        const senderIsUser = message.sender_id === user.id;
        const senderProfile = message[senderIsUser ? 'sender' : 'receiver'];
        const receiverProfile = message[senderIsUser ? 'receiver' : 'sender'];

        return {
          ...message,
          sender: {
            id: message.sender_id,
            name: senderIsUser 
              ? (senderProfile?.name || 'İsimsiz Kullanıcı')
              : (therapistProfile?.full_name || receiverProfile?.name || 'İsimsiz Kullanıcı'),
            avatar_url: (senderIsUser ? senderProfile?.avatar_url : therapistProfile?.avatar_url) || 
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`
          },
          receiver: {
            id: message.receiver_id,
            name: senderIsUser
              ? (therapistProfile?.full_name || receiverProfile?.name || 'İsimsiz Kullanıcı')
              : (senderProfile?.name || 'İsimsiz Kullanıcı'),
            avatar_url: (senderIsUser ? therapistProfile?.avatar_url : receiverProfile?.avatar_url) ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.receiver_id}`
          }
        };
      }).filter(Boolean);

      setMessages(enrichedMessages);

      // Okunmamış mesajları okundu olarak işaretle
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', userId);
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Mesajlar yüklenemedi',
        color: 'red'
      });
    }
  };

  const handleNewMessage = (message) => {
    // Yeni mesaj mevcut konuşmaya aitse ekle
    if (selectedTherapist && (message.sender_id === selectedTherapist.id || message.receiver_id === selectedTherapist.id)) {
      setMessages(prev => [...prev, message]);
    }
    
    // Psikolog listesini güncelle
    loadTherapists();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTherapist) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedTherapist.id,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Mesaj gönderilemedi',
        color: 'red'
      });
    }
  };

  return (
    <Stack spacing="lg">
      <Title order={3}>Psikologlarla Mesajlaşma</Title>
      
      <Group align="flex-start" spacing="lg" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Psikolog Listesi */}
        <Paper shadow="sm" p="md" radius="md" style={{ width: 300, height: '100%' }}>
          <ScrollArea h="100%">
            <Stack spacing="md">
              {therapists.map(therapist => (
                <Paper
                  key={therapist.id}
                  p="sm"
                  radius="md"
                  onClick={() => setSelectedTherapist(therapist)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedTherapist?.id === therapist.id ? '#F0EBFF' : 'transparent'
                  }}
                >
                  <Group>
                    <Avatar src={therapist.avatar_url} radius="xl" />
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{therapist.name}</Text>
                      <Text size="xs" c="dimmed">{therapist.title}</Text>
                      {therapist.lastMessage && (
                        <Text size="xs" c="dimmed" lineClamp={1}>{therapist.lastMessage}</Text>
                      )}
                    </div>
                    {therapist.unreadCount > 0 && (
                      <Badge color="etherea.4" variant="filled" size="sm">
                        {therapist.unreadCount}
                      </Badge>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        </Paper>

        {/* Mesajlaşma Alanı */}
        <Paper shadow="sm" p="md" radius="md" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {selectedTherapist ? (
            <>
              {/* Mesaj Geçmişi */}
              <ScrollArea h="100%" mb="md">
                <Stack spacing="xs">
                  {messages.map(message => (
                    <Group key={message.id} justify={message.sender_id === user.id ? 'flex-end' : 'flex-start'}>
                      {message.sender_id !== user.id && (
                        <Avatar 
                          src={selectedTherapist?.avatar_url} 
                          radius="xl" 
                          size="sm"
                        />
                      )}
                      <Paper
                        p="sm"
                        radius="md"
                        bg={message.sender_id === user.id ? 'etherea.4' : 'etherea.1'}
                        sx={(theme) => ({
                          maxWidth: '70%',
                          marginLeft: message.sender_id === user.id ? 'auto' : '0',
                          marginRight: message.sender_id === user.id ? '0' : 'auto',
                        })}
                      >
                        <Text 
                          size="sm" 
                          c={message.sender_id === user.id ? 'white' : 'etherea.7'}
                        >
                          {message.content}
                        </Text>
                        <Text 
                          size="xs" 
                          c={message.sender_id === user.id ? 'gray.2' : 'dimmed'} 
                          ta={message.sender_id === user.id ? 'right' : 'left'}
                          mt={4}
                        >
                          {new Date(message.created_at).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </Paper>
                      {message.sender_id === user.id && (
                        <Avatar 
                          src={user.user_metadata?.avatar_url} 
                          radius="xl" 
                          size="sm"
                        />
                      )}
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>

              {/* Mesaj Gönderme */}
              <Group>
                <TextInput
                  placeholder="Mesajınızı yazın..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  leftSection={<IconSend size={16} />}
                  bg="etherea.4"
                  c="white"
                >
                  Gönder
                </Button>
              </Group>
            </>
          ) : (
            <Text c="dimmed" ta="center" mt="xl">
              Mesajlaşmak için bir psikolog seçin
            </Text>
          )}
        </Paper>
      </Group>
    </Stack>
  );
}

export default Messages; 