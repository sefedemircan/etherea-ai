import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Text, Group, Avatar, ScrollArea, TextInput, Button, Badge } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifications } from '@mantine/notifications';

function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Konuşmaları yükle
  useEffect(() => {
    loadConversations();
    
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

  // Seçili kullanıcı değiştiğinde mesajları yükle
  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
    }
  }, [selectedUser]);

  const loadConversations = async () => {
    try {
      // Psikoloğun tüm konuşmalarını getir
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read,
          sender:profiles!sender_id(id, name, avatar_url),
          receiver:profiles!receiver_id(id, name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Benzersiz kullanıcı ID'lerini topla
      const uniqueUserIds = new Set();
      messages.forEach(message => {
        const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        uniqueUserIds.add(otherId);
      });

      // Kullanıcı profillerini getir
      const { data: userProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', Array.from(uniqueUserIds));

      if (profileError) throw profileError;

      // Profil bilgilerini Map'te sakla
      const userProfileMap = new Map();
      userProfiles?.forEach(profile => {
        userProfileMap.set(profile.id, profile);
      });

      // Konuşmaları kullanıcılara göre grupla
      const conversationMap = new Map();
      messages.forEach(message => {
        if (!message) return;
        
        const isUserSender = message.sender_id === user.id;
        const otherId = isUserSender ? message.receiver_id : message.sender_id;
        const otherProfile = isUserSender ? message.receiver : message.sender;
        
        // Diğer kullanıcının profil bilgilerini al
        const userProfile = userProfileMap.get(otherId);
        
        // Varsayılan değerler
        let name = 'İsimsiz Kullanıcı';
        let avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`;
        
        // Profil bilgilerini belirle
        if (otherProfile) {
          name = otherProfile.name || name;
          avatar_url = otherProfile.avatar_url || avatar_url;
        } else if (userProfile) {
          name = userProfile.name || name;
          avatar_url = userProfile.avatar_url || avatar_url;
        }

        const existingConv = conversationMap.get(otherId);
        if (!existingConv) {
          conversationMap.set(otherId, {
            id: otherId,
            name: name,
            avatar_url: avatar_url,
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

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Konuşmalar yüklenirken hata:', error);
      notifications.show({
        title: 'Hata',
        message: 'Konuşmalar yüklenemedi',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:profiles!sender_id(id, name, avatar_url),
          receiver:profiles!receiver_id(id, name, avatar_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Mesajları zenginleştir
      const enrichedMessages = data.map(message => {
        const isUserSender = message.sender_id === user.id;
        const senderProfile = isUserSender ? message.sender : message.receiver;
        const receiverProfile = isUserSender ? message.receiver : message.sender;
        
        return {
          ...message,
          senderName: senderProfile?.name || 'İsimsiz Kullanıcı',
          senderAvatar: senderProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`,
          receiverName: receiverProfile?.name || 'İsimsiz Kullanıcı',
          receiverAvatar: receiverProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.receiver_id}`
        };
      });
      
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
    if (selectedUser && (message.sender_id === selectedUser.id || message.receiver_id === selectedUser.id)) {
      setMessages(prev => [...prev, message]);
    }
    
    // Konuşma listesini güncelle
    loadConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.id,
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
      <Title order={3}>Mesajlar</Title>
      
      <Group align="flex-start" spacing="lg" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Konuşmalar Listesi */}
        <Paper shadow="sm" p="md" radius="md" style={{ width: 300, height: '100%' }}>
          <ScrollArea h="100%">
            <Stack spacing="md">
              {conversations.map(conv => (
                <Paper
                  key={conv.id}
                  p="sm"
                  radius="md"
                  onClick={() => setSelectedUser(conv)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedUser?.id === conv.id ? '#F0EBFF' : 'transparent'
                  }}
                >
                  <Group>
                    <Avatar src={conv.avatar_url} radius="xl" />
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>{conv.name}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{conv.lastMessage}</Text>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge color="etherea.4" variant="filled" size="sm">
                        {conv.unreadCount}
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
          {selectedUser ? (
            <>
              {/* Mesaj Geçmişi */}
              <ScrollArea h="100%" mb="md">
                <Stack spacing="xs">
                  {messages.map(message => (
                    <Group key={message.id} justify={message.sender_id === user.id ? 'flex-end' : 'flex-start'}>
                      {message.sender_id !== user.id && (
                        <Avatar 
                          src={message.senderAvatar} 
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
                          color: message.sender_id === user.id ? 'white' : 'inherit'
                        })}
                      >
                        <Text size="sm">{message.content}</Text>
                        <Text size="xs" c="dimmed" align="right">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Paper>
                      {message.sender_id === user.id && (
                        <Avatar 
                          src={message.senderAvatar} 
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
              Mesajlaşmak için bir konuşma seçin
            </Text>
          )}
        </Paper>
      </Group>
    </Stack>
  );
}

export default Messages; 