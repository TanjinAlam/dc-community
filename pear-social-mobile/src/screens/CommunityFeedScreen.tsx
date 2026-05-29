import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';
import CommunityPostCard from '../components/CommunityPostCard';

export default function CommunityFeedScreen() {
  const route = useRoute<any>();
  const { community } = route.params;
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const p2p = useP2P();

  useEffect(() => {
    p2p.getCommunityFeed(community.communityKey).then(setPosts);
    p2p.onFeedUpdate(() => p2p.getCommunityFeed(community.communityKey).then(setPosts));
  }, [community.communityKey, p2p]);

  const handlePost = async () => {
    if (!text.trim()) return;
    await p2p.submitPost({ text: text.trim(), communityKeyHex: community.communityKey });
    setText('');
    p2p.getCommunityFeed(community.communityKey).then(setPosts);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{community.name}</Text>
      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="Post to community..." placeholderTextColor="#999" value={text} onChangeText={setText} />
        <TouchableOpacity style={styles.postBtn} onPress={handlePost}>
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id || String(item.ts)}
        renderItem={({ item }) => <CommunityPostCard post={item} communityKey={community.communityKey} isOwner={community.role === 'owner'} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff', padding: 16, paddingTop: 48 },
  composer: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  input: { flex: 1, borderWidth: 1, borderColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 12, color: '#fff', marginRight: 8 },
  postBtn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600' },
});
