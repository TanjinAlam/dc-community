import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useP2P } from '../contexts/P2PContext';

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const p2p = useP2P();

  useEffect(() => { p2p.listCommunities().then(r => setResults(r || [])); }, [p2p]);

  const handleSearch = async () => {
    const found = query.trim()
      ? await p2p.searchCommunities(query.trim())
      : await p2p.listCommunities();
    setResults(found || []);
  };

  const join = (communityKey: string) => p2p.joinCommunity(communityKey);

  return (
    <View style={styles.container} testID="discover-screen">
      <Text style={styles.header}>Discover Communities</Text>
      <View style={styles.searchRow}>
        <TextInput style={styles.input} placeholder="Search..." placeholderTextColor="#999" value={query} onChangeText={setQuery} testID="search-input" />
        <TouchableOpacity style={styles.btn} onPress={handleSearch}>
          <Text style={styles.btnText}>Search</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.communityKey}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.description}</Text>
            </View>
            <TouchableOpacity onPress={() => join(item.communityKey)} style={styles.joinBtn}>
              <Text style={styles.joinText}>Join</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#fff', padding: 16, paddingTop: 48 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#4c1d95', borderRadius: 8, paddingHorizontal: 12, color: '#fff', marginRight: 8 },
  btn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#312e81', alignItems: 'center' },
  name: { color: '#fff', fontWeight: '600' },
  desc: { color: '#6b7280', fontSize: 12 },
  joinBtn: { backgroundColor: '#7c3aed', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  joinText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
