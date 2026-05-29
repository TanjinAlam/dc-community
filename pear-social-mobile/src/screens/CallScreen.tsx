import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useP2P } from '../contexts/P2PContext';

export default function CallScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId, participants, isVideo } = route.params || {};
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const p2p = useP2P();

  useEffect(() => {
    p2p.onCallEnded(() => navigation.goBack());
  }, [p2p, navigation]);

  const toggleMic = async () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    await p2p.toggleMute({ callId, audio: next });
  };

  const toggleCam = async () => {
    const next = !isCamOff;
    setIsCamOff(next);
    await p2p.toggleMute({ callId, video: next });
  };

  const endCall = async () => {
    await p2p.endCall({ callId });
    navigation.goBack();
  };

  return (
    <View style={styles.container} testID="call-screen">
      <View style={styles.videoArea}>
        <Text style={styles.videoPlaceholder}>
          {isVideo ? '📹 Video call in progress' : '🎙️ Voice call in progress'}
        </Text>
        <Text style={styles.participants}>
          {(participants || []).map((k: string) => k.slice(0, 8)).join(', ')}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMicMuted && styles.ctrlBtnActive]}
          onPress={toggleMic}
          testID="mute-btn"
        >
          <Text style={styles.ctrlIcon}>{isMicMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.ctrlLabel}>{isMicMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.ctrlBtn, isCamOff && styles.ctrlBtnActive]}
            onPress={toggleCam}
            testID="cam-btn"
          >
            <Text style={styles.ctrlIcon}>{isCamOff ? '📵' : '📷'}</Text>
            <Text style={styles.ctrlLabel}>{isCamOff ? 'Start cam' : 'Stop cam'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.endBtn} onPress={endCall} testID="end-call-btn">
          <Text style={styles.ctrlIcon}>📵</Text>
          <Text style={styles.ctrlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'space-between' },
  videoArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoPlaceholder: { color: '#fff', fontSize: 18, textAlign: 'center' },
  participants: { color: '#6b7280', fontSize: 13 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, padding: 24, backgroundColor: '#111827' },
  ctrlBtn: { alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#374151', minWidth: 64 },
  ctrlBtnActive: { backgroundColor: '#dc2626' },
  endBtn: { alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#dc2626', minWidth: 64 },
  ctrlIcon: { fontSize: 24 },
  ctrlLabel: { color: '#fff', fontSize: 11 },
});
