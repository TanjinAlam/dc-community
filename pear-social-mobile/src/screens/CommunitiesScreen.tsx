import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function CommunitiesScreen() {
  const [communities, setCommunities] = useState<any[]>([]);
  const p2p = useP2P();
  const navigation = useNavigation<any>();

  useEffect(() => {
    p2p.getCommunities().then(setCommunities);
  }, [p2p]);

  return (
    <View style={styles.container} testID="communities-screen">
      <Text style={styles.header}>Communities</Text>
      <TouchableOpacity style={styles.discoverBtn} onPress={() => navigation.navigate('Discover')}>
        <Text style={styles.discoverText}>Discover Communities</Text>
      </TouchableOpacity>
      <FlatList
        data={communities}
        keyExtractor={(item) => item.communityKey}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('CommunityFeed', { community: item })}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.role}>{item.role}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No communities yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#fff', padding: 16, paddingTop: 48 },
  discoverBtn: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#4c1d95', borderRadius: 8, padding: 12, alignItems: 'center' },
  discoverText: { color: '#a78bfa', fontWeight: '600' },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#312e81' },
  name: { color: '#fff', fontWeight: '600', fontSize: 16 },
  role: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
});
