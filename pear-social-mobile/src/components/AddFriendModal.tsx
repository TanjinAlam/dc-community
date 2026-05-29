import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useP2P } from '../contexts/P2PContext';

export default function AddFriendModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [pubkey, setPubkey] = useState('');
  const [scanning, setScanning] = useState(false);
  const p2p = useP2P();

  const handleAdd = async () => {
    if (!pubkey.trim()) return;
    await p2p.addFriend(pubkey.trim());
    setPubkey('');
    onClose();
  };

  const handleBarCode = ({ data }: { data: string }) => {
    const match = data.match(/^pear-social:\/\/add\/([a-f0-9]{64})$/);
    if (match) {
      setPubkey(match[1]);
      setScanning(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Add Friend</Text>
          {scanning ? (
            <>
              <RNCamera
                style={styles.camera}
                onBarCodeRead={handleBarCode}
                barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
                captureAudio={false}
              />
              <TouchableOpacity onPress={() => setScanning(false)} style={styles.cancelScan}>
                <Text style={styles.cancelScanText}>Cancel Scan</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Paste pubkey"
                placeholderTextColor="#999"
                value={pubkey}
                onChangeText={setPubkey}
                testID="pubkey-input"
              />
              <TouchableOpacity style={styles.scanBtn} onPress={() => setScanning(true)}>
                <Text style={styles.scanBtnText}>Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={handleAdd} testID="add-btn">
                <Text style={styles.btnText}>Add</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1e1b4b', padding: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#4c1d95', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12 },
  camera: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
  scanBtn: { borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  scanBtnText: { color: '#a78bfa', fontWeight: '600' },
  cancelScan: { padding: 12, alignItems: 'center' },
  cancelScanText: { color: '#a78bfa' },
  btn: { backgroundColor: '#7c3aed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancel: { color: '#a78bfa', textAlign: 'center', padding: 8 },
});
