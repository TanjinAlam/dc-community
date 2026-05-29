import React from 'react';
import renderer from 'react-test-renderer';
import SetupScreen from '../src/screens/SetupScreen';
import MainScreen from '../src/screens/MainScreen';
import PostCard from '../src/components/PostCard';

// Mock the p2p context
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
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({ replace: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ component: Component }: any) => <Component />,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

test('SetupScreen renders name input and button', () => {
  const tree = renderer.create(<SetupScreen navigation={{ replace: jest.fn() }} />).toJSON();
  expect(tree).toBeTruthy();
});

test('MainScreen renders empty feed with composer', () => {
  const tree = renderer.create(<MainScreen />).toJSON();
  expect(tree).toBeTruthy();
});

test('PostCard renders author and text correctly', () => {
  const post = { id: '1', text: 'Hello world', ts: Date.now(), author: 'abc123', authorName: 'Alice' };
  const tree = renderer.create(<PostCard post={post} />).toJSON();
  expect(tree).toBeTruthy();
});
