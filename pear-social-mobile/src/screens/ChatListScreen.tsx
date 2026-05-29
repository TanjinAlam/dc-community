import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function ChatListScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const p2p = useP2P();
  const navigation = useNavigation<any>();

  useEffect(() => {
    p2p.getConversations().then(setConversations);
    p2p.getFriends().then(setFriends);
    p2p.onNewMessage(() => p2p.getConversations().then(setConversations));
  }, [p2p]);

  const allChattable = [
    ...conversations.map(c => ({ key: c.friendPubkey, lastMsg: c.lastMessage?.text || '', hasConv: true })),
    ...friends
      .filter(f => !conversations.find(c => c.friendPubkey === f))
      .map(f => ({ key: f, lastMsg: '', hasConv: false }))
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={allChattable}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('Conversation', { friendPubkey: item.key })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.key.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.key.slice(0, 20)}…</Text>
              {item.lastMsg ? <Text style={styles.preview} numberOfLines={1}>{item.lastMsg}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Add friends to start chatting</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#fff', padding: 16, paddingTop: 48 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  preview: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 48, fontSize: 14 },
});
