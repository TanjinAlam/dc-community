import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function IncomingCallScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId, callerKey, isVideo, participants } = route.params || {};
  const p2p = useP2P();

  useEffect(() => {
    Vibration.vibrate([500, 500, 500, 500], true);
    return () => Vibration.cancel();
  }, []);

  const accept = async () => {
    Vibration.cancel();
    await p2p.acceptCall({ callId, callerKey, isVideo });
    navigation.replace('ActiveCall', { callId, participants, isVideo });
  };

  const decline = async () => {
    Vibration.cancel();
    await p2p.rejectCall({ callId, callerKey });
    navigation.goBack();
  };

  return (
    <View style={styles.container} testID="incoming-call-screen">
      <View style={styles.callerInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{callerKey?.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.callType}>{isVideo ? 'Incoming video call' : 'Incoming voice call'}</Text>
        <Text style={styles.callerKey}>{callerKey?.slice(0, 20)}…</Text>
        {participants?.length > 2 && (
          <Text style={styles.groupLabel}>+{participants.length - 1} others</Text>
        )}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.declineBtn} onPress={decline} testID="decline-btn">
          <Text style={[styles.btnIcon, styles.declineIcon]}>✕</Text>
          <Text style={styles.btnLabel}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={accept} testID="accept-btn">
          <Text style={[styles.btnIcon, styles.acceptIcon]}>✓</Text>
          <Text style={styles.btnLabel}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'space-between', paddingVertical: 80, alignItems: 'center' },
  callerInfo: { alignItems: 'center', gap: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  callType: { color: '#a78bfa', fontSize: 14 },
  callerKey: { color: '#fff', fontSize: 18, fontWeight: '600' },
  groupLabel: { color: '#6b7280', fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 64 },
  declineBtn: { alignItems: 'center', gap: 8 },
  acceptBtn: { alignItems: 'center', gap: 8 },
  btnIcon: { width: 64, height: 64, borderRadius: 32, textAlign: 'center', lineHeight: 64, fontSize: 28, color: '#fff', overflow: 'hidden' },
  declineIcon: { backgroundColor: '#ef4444' },
  acceptIcon: { backgroundColor: '#22c55e' },
  btnLabel: { color: '#fff', fontSize: 13 },
});
