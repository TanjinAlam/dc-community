import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useP2P } from '../contexts/P2PContext';

export default function MyQrModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [pubkey, setPubkey] = useState('');
  const p2p = useP2P();

  useEffect(() => {
    if (visible) {
      p2p.getMyKey().then((key) => setPubkey(key || ''));
    }
  }, [visible, p2p]);

  const qrValue = pubkey ? `pear-social://add/${pubkey}` : 'loading';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>My QR Code</Text>
          {pubkey ? (
            <>
              <QRCode value={qrValue} size={200} color="#fff" backgroundColor="#1e1b4b" />
              <ScrollView horizontal style={styles.keyScroll}>
                <Text style={styles.pubkey} selectable>{pubkey}</Text>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.pubkey}>Loading...</Text>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#1e1b4b', padding: 24, borderRadius: 16, alignItems: 'center', width: '85%' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  keyScroll: { marginTop: 16, maxWidth: '100%' },
  pubkey: { color: '#a78bfa', fontSize: 11, fontFamily: 'monospace' },
  closeBtn: { marginTop: 20, backgroundColor: '#7c3aed', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  closeText: { color: '#fff', fontWeight: '600' },
});
