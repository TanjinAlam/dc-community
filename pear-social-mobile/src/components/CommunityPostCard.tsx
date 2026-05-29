import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function CommunityPostCard({ post, communityKey, isOwner }: { post: any; communityKey: string; isOwner: boolean }) {
  const [counts, setCounts] = useState({ up: 0, down: 0, score: 0 });
  const [myVote, setMyVote] = useState(0);
  const p2p = useP2P();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!post.id) return;
    p2p.getVoteCounts(post.id).then(setCounts);
    p2p.getMyVote(post.id).then(setMyVote);
  }, [post.id, p2p]);

  const vote = async (value: number) => {
    await p2p.castVote({ targetId: post.id, value });
    p2p.getVoteCounts(post.id).then(setCounts);
    p2p.getMyVote(post.id).then(setMyVote);
  };

  return (
    <View style={styles.card} testID="community-post-card">
      <View style={styles.votes}>
        <TouchableOpacity onPress={() => vote(1)} testID="upvote-btn">
          <Text style={[styles.arrow, myVote === 1 && styles.upvoted]}>▲</Text>
        </TouchableOpacity>
        <Text style={styles.score}>{counts.score}</Text>
        <TouchableOpacity onPress={() => vote(-1)} testID="downvote-btn">
          <Text style={[styles.arrow, myVote === -1 && styles.downvoted]}>▼</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.author}>{post.author?.slice(0, 12) || 'unknown'}</Text>
        <Text style={styles.text}>{post.text}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Comments', { postId: post.id, communityKey })} style={styles.commentsBtn}>
          <Text style={styles.commentsBtnText}>💬 Comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  votes: { alignItems: 'center', marginRight: 12, width: 32 },
  arrow: { fontSize: 18, color: '#6b7280' },
  upvoted: { color: '#f97316' },
  downvoted: { color: '#60a5fa' },
  score: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginVertical: 2 },
  content: { flex: 1 },
  author: { color: '#a78bfa', fontSize: 12, marginBottom: 4 },
  text: { color: '#fff' },
  commentsBtn: { marginTop: 8 },
  commentsBtnText: { color: '#6b7280', fontSize: 12 },
});
