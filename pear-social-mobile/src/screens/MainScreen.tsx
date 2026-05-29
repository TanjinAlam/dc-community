import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, RefreshControl, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useP2P } from '../contexts/P2PContext';
import PostCard from '../components/PostCard';
import MyQrModal from '../components/MyQrModal';
import AddFriendModal from '../components/AddFriendModal';

export default function MainScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pendingPhotoKey, setPendingPhotoKey] = useState<string | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const p2p = useP2P();

  const loadFeed = useCallback(async () => {
    const feed = await p2p.getFeed();
    setPosts(feed || []);
  }, [p2p]);

  useEffect(() => {
    loadFeed();
    p2p.onFeedUpdate((post) => setPosts(prev => [post, ...prev]));
  }, [loadFeed, p2p]);

  const handlePickPhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', includeBase64: true });
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const buffer = bytes.buffer;
        const driveKey = await p2p.attachPhoto(buffer);
        setPendingPhotoKey(driveKey);
        setPendingPhotoPreview(`data:image/jpeg;base64,${base64}`);
      }
    }
  };

  const handlePost = async () => {
    if (!text.trim()) return;
    await p2p.createPost(text.trim(), pendingPhotoKey);
    setText('');
    setPendingPhotoKey(null);
    setPendingPhotoPreview(null);
    loadFeed();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  return (
    <View style={styles.container} testID="main-screen">
      <View style={styles.headerRow}>
        <Text style={styles.header}>Pear Social</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowQr(true)} testID="qr-btn">
            <Text style={styles.iconBtnText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddFriend(true)} testID="add-friend-btn">
            <Text style={styles.iconBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id || String(item.ts)}
        renderItem={({ item }) => <PostCard post={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        testID="feed-list"
      />
      {pendingPhotoPreview && (
        <Image source={{ uri: pendingPhotoPreview }} style={styles.previewThumb} resizeMode="cover" />
      )}
      <View style={styles.composer}>
        <TouchableOpacity style={styles.cameraBtn} onPress={handlePickPhoto} testID="camera-btn">
          <Text style={styles.cameraBtnText}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="What's happening?"
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          testID="post-input"
        />
        <TouchableOpacity style={styles.postBtn} onPress={handlePost} testID="post-btn">
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>
      <MyQrModal visible={showQr} onClose={() => setShowQr(false)} />
      <AddFriendModal visible={showAddFriend} onClose={() => setShowAddFriend(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconBtn: { backgroundColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  iconBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  composer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#312e81', backgroundColor: '#1e1b4b', alignItems: 'center' },
  cameraBtn: { backgroundColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, justifyContent: 'center' },
  cameraBtnText: { fontSize: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 12, color: '#fff', marginRight: 8 },
  postBtn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600' },
  previewThumb: { width: 80, height: 80, borderRadius: 8, margin: 8, alignSelf: 'flex-end' },
});
