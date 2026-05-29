import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function ConversationScreen() {
  const route = useRoute<any>();
  const { friendPubkey } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [myKey, setMyKey] = useState('');
  const flatListRef = useRef<any>(null);
  const p2p = useP2P();

  useEffect(() => {
    p2p.getMyKey().then(setMyKey);
    loadMessages();
    p2p.onNewMessage((msg: any) => {
      if (msg.from === friendPubkey || msg.to === friendPubkey) {
        loadMessages();
      }
    });
  }, [friendPubkey, p2p]);

  const loadMessages = () =>
    p2p.getMessages(friendPubkey).then((msgs: any[]) => {
      setMessages([...(msgs || [])].reverse());
    });

  const handleSend = async () => {
    if (!text.trim()) return;
    await p2p.sendMessage(friendPubkey, text.trim());
    setText('');
    loadMessages();
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.from === myKey;
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
          <Text style={styles.bubbleTime}>
            {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id || String(item.ts)}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 12 }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          testID="message-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          testID="send-btn"
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  bubbleRow: { marginVertical: 3, flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  bubbleMe: { backgroundColor: '#7c3aed', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#312e81', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#fff', fontSize: 15 },
  bubbleTime: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#312e81',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#312e81',
    color: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 16 },
});
