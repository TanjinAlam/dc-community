import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useP2P } from '../contexts/P2PContext';

export default function AvatarImage({ driveKey, name }: { driveKey?: string; name: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const p2p = useP2P();

  useEffect(() => {
    if (driveKey) {
      p2p.getAvatar(driveKey).then((result) => {
        if (result) setUri(`data:${result.mimeType};base64,${result.base64}`);
      });
    }
  }, [driveKey, p2p]);

  const initials = name.slice(0, 2).toUpperCase();

  if (uri) return <Image source={{ uri }} style={styles.avatar} />;
  return (
    <View style={styles.initials}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: 20 },
  initials: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
  initialsText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
