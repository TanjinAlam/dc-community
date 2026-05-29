import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../src/p2p/index', () => ({
  getCommunities: jest.fn().mockResolvedValue([]),
  createCommunity: jest.fn().mockResolvedValue({ communityKey: 'abc' }),
  getCommunityFeed: jest.fn().mockResolvedValue([]),
  submitPost: jest.fn().mockResolvedValue(null),
  castVote: jest.fn().mockResolvedValue(null),
  getVoteCounts: jest.fn().mockResolvedValue({ up: 0, down: 0, score: 0 }),
  getMyVote: jest.fn().mockResolvedValue(0),
  postComment: jest.fn().mockResolvedValue(null),
  getCommentTree: jest.fn().mockResolvedValue([]),
  listCommunities: jest.fn().mockResolvedValue([]),
  searchCommunities: jest.fn().mockResolvedValue([]),
  joinCommunity: jest.fn().mockResolvedValue(null),
  onFeedUpdate: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { community: { communityKey: 'key1', name: 'Test', role: 'member' }, postId: 'p1', communityKey: 'key1' } }),
}));

import CommunitiesScreen from '../src/screens/CommunitiesScreen';
import CommunityPostCard from '../src/components/CommunityPostCard';
import DiscoverScreen from '../src/screens/DiscoverScreen';
import * as p2p from '../src/p2p/index';
import { P2PProvider } from '../src/contexts/P2PContext';

function wrap(component: React.ReactElement) {
  return render(<P2PProvider>{component}</P2PProvider>);
}

test('CommunitiesScreen renders empty state correctly', async () => {
  const { getByTestId, findByText } = wrap(<CommunitiesScreen />);
  getByTestId('communities-screen');
  await findByText('No communities yet');
});

test('CommunityPostCard renders vote buttons and score', async () => {
  const post = { id: 'p1', text: 'Hello world', author: 'abcdef123456' };
  const { getByTestId, findByText } = wrap(
    <CommunityPostCard post={post} communityKey="key1" isOwner={false} />
  );
  getByTestId('community-post-card');
  getByTestId('upvote-btn');
  getByTestId('downvote-btn');
  await findByText('Hello world');
});

test('DiscoverScreen renders search input', async () => {
  const { getByTestId } = wrap(<DiscoverScreen />);
  getByTestId('discover-screen');
  getByTestId('search-input');
});
