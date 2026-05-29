import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useP2P } from '../contexts/P2PContext';

export default function SetupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const p2p = useP2P();

  const handleStart = async () => {
    if (!name.trim()) return;
    await p2p.setMyProfile(name.trim());
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pear Social</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#a78bfa"
        value={name}
        onChangeText={setName}
        testID="name-input"
      />
      <TouchableOpacity style={styles.button} onPress={handleStart} testID="get-started-btn">
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4c1d95', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 32 },
  input: { width: '100%', borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, padding: 12, color: '#fff', fontSize: 18, marginBottom: 16 },
  button: { backgroundColor: '#7c3aed', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
