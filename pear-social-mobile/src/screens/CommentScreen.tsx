import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

function flattenTree(comments: any[], depth = 0): any[] {
  const result: any[] = [];
  for (const c of comments) {
    result.push({ ...c, _depth: depth });
    if (c.replies?.length) result.push(...flattenTree(c.replies, depth + 1));
  }
  return result;
}

export default function CommentScreen() {
  const route = useRoute<any>();
  const { postId, communityKey } = route.params;
  const [flat, setFlat] = useState<any[]>([]);
  const [text, setText] = useState('');
  const p2p = useP2P();

  const load = () => p2p.getCommentTree({ communityKey, postId }).then(tree => setFlat(flattenTree(tree || [])));

  useEffect(() => { load(); }, [postId, communityKey, p2p]);

  const submit = async () => {
    if (!text.trim()) return;
    await p2p.postComment({ parentId: postId, communityKey, text: text.trim() });
    setText('');
    load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={flat}
        keyExtractor={(item) => item.id || String(item.ts)}
        renderItem={({ item }) => (
          <View style={[styles.comment, { marginLeft: item._depth * 12 }]}>
            <Text style={styles.author}>{item.author?.slice(0, 8)}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.input}>
        <TextInput style={styles.textInput} placeholder="Add a comment..." placeholderTextColor="#999" value={text} onChangeText={setText} />
        <TouchableOpacity style={styles.btn} onPress={submit}>
          <Text style={styles.btnText}>Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  comment: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  author: { color: '#a78bfa', fontSize: 11, marginBottom: 2 },
  text: { color: '#fff', fontSize: 14 },
  input: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#312e81' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 12, color: '#fff', marginRight: 8 },
  btn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
