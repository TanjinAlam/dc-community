import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AvatarImage from './AvatarImage';
import { useP2P } from '../contexts/P2PContext';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function PostCard({ post }: { post: any }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const p2p = useP2P();

  useEffect(() => {
    if (post.photoKey) {
      p2p.getPhoto(post.photoKey, post.id || '').then((base64) => {
        if (base64) setPhotoUri(`data:image/jpeg;base64,${base64}`);
      });
    }
  }, [post.photoKey, post.id, p2p]);

  return (
    <View style={styles.card}>
      <AvatarImage driveKey={post.driveKey} name={post.authorName || post.author?.slice(0, 8) || '?'} />
      <View style={styles.content}>
        <Text style={styles.author}>{post.authorName || post.author?.slice(0, 8)}</Text>
        <Text style={styles.text}>{post.text}</Text>
        {post.photoKey && (
          photoUri
            ? <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            : <View style={styles.photoPlaceholder} />
        )}
        <Text style={styles.time}>{timeAgo(post.ts)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  content: { flex: 1, marginLeft: 12 },
  author: { color: '#a78bfa', fontWeight: '600', marginBottom: 4 },
  text: { color: '#fff', marginBottom: 4 },
  time: { color: '#6b7280', fontSize: 12 },
  photo: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  photoPlaceholder: { width: '100%', height: 200, borderRadius: 8, marginTop: 8, backgroundColor: '#312e81' },
});
