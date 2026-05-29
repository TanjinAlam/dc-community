import React from 'react';
import renderer from 'react-test-renderer';
import IncomingCallScreen from '../src/screens/IncomingCallScreen';
import CallScreen from '../src/screens/CallScreen';

jest.mock('../src/p2p/index', () => ({
  init: jest.fn().mockResolvedValue(null),
  getMyProfile: jest.fn().mockResolvedValue(null),
  setMyProfile: jest.fn().mockResolvedValue(null),
  getFeed: jest.fn().mockResolvedValue([]),
  createPost: jest.fn().mockResolvedValue(null),
  addFriend: jest.fn().mockResolvedValue(null),
  getFriends: jest.fn().mockResolvedValue([]),
  getMyKey: jest.fn().mockResolvedValue(''),
  getAvatar: jest.fn().mockResolvedValue(null),
  onFeedUpdate: jest.fn(),
  startCall: jest.fn().mockResolvedValue({ callId: 'test-call-id' }),
  acceptCall: jest.fn().mockResolvedValue(null),
  rejectCall: jest.fn().mockResolvedValue(null),
  endCall: jest.fn().mockResolvedValue(null),
  toggleMute: jest.fn().mockResolvedValue(null),
  startScreenShare: jest.fn().mockResolvedValue(null),
  stopScreenShare: jest.fn().mockResolvedValue(null),
  getCallHistory: jest.fn().mockResolvedValue([]),
  onIncomingCall: jest.fn(),
  onCallEnded: jest.fn(),
  sendMessage: jest.fn().mockResolvedValue(null),
  getMessages: jest.fn().mockResolvedValue([]),
  getConversations: jest.fn().mockResolvedValue([]),
  onNewMessage: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  createNavigationContainerRef: () => ({ isReady: () => false, navigate: jest.fn() }),
  useNavigation: () => ({ replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      callId: 'test-call-id',
      callerKey: 'abcdef1234567890',
      isVideo: false,
      participants: ['abcdef1234567890', 'aabbccdd11223344'],
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

test('IncomingCallScreen renders accept and decline buttons', () => {
  const tree = renderer.create(<IncomingCallScreen />).toJSON();
  expect(tree).toBeTruthy();
  const json = JSON.stringify(tree);
  expect(json).toContain('decline-btn');
  expect(json).toContain('accept-btn');
});

test('CallScreen renders mute and end-call buttons', () => {
  const tree = renderer.create(<CallScreen />).toJSON();
  expect(tree).toBeTruthy();
  const json = JSON.stringify(tree);
  expect(json).toContain('mute-btn');
  expect(json).toContain('end-call-btn');
});

test('CallScreen renders call-screen testID', () => {
  const tree = renderer.create(<CallScreen />).toJSON();
  const json = JSON.stringify(tree);
  expect(json).toContain('call-screen');
});
