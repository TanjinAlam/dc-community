import { BareKit } from 'react-native-bare-kit';
import { v4 as uuidv4 } from 'uuid';

const worker = new BareKit();
const pending = new Map<string, (data: any) => void>();
const listeners: Record<string, ((data: any) => void)[]> = {};
let started = false;

function sendAndWait(type: string, data?: any): Promise<any> {
  return new Promise((resolve) => {
    const id = uuidv4();
    pending.set(id, resolve);
    worker.postMessage({ type, data, id });
  });
}

function setupListeners() {
  worker.onmessage = (event: any) => {
    const msg = event.data ?? event;
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id)!;
      pending.delete(msg.id);
      resolve(msg.data);
    } else if (msg.type && listeners[msg.type]) {
      listeners[msg.type].forEach((cb) => cb(msg.data));
    }
  };
}

export async function init(dataPath: string): Promise<void> {
  if (started) return;
  started = true;
  // In RN, require() worker file as a module asset
  await worker.start(require('./worker.js'));
  setupListeners();
  await sendAndWait('init', { dataPath });
}

export async function getMyKey(): Promise<string> {
  return sendAndWait('get-key');
}

export async function getMyProfile(): Promise<{ name: string; driveKey?: string } | null> {
  return sendAndWait('get-profile');
}

export async function setMyProfile(name: string): Promise<void> {
  return sendAndWait('set-profile', { name });
}

export async function createPost(text: string, photoKey?: string | null): Promise<void> {
  return sendAndWait('create-post', { text, photoKey });
}

export async function getFeed(): Promise<any[]> {
  const result = await sendAndWait('get-feed');
  return result || [];
}

export async function addFriend(pubkey: string): Promise<void> {
  return sendAndWait('add-friend', { pubkey });
}

export async function getFriends(): Promise<string[]> {
  const result = await sendAndWait('get-friends');
  return result || [];
}

export async function setAvatar(buffer: ArrayBuffer, mimeType: string): Promise<{ driveKey: string }> {
  return sendAndWait('set-avatar', { arrayBuffer: buffer, mimeType });
}

export async function getAvatar(driveKeyHex: string): Promise<{ base64: string; mimeType: string } | null> {
  return sendAndWait('get-avatar', { driveKeyHex });
}

export async function attachPhoto(buffer: ArrayBuffer): Promise<{ driveKey: string; photoId: string }> {
  return sendAndWait('attach-photo', { imageBuffer: buffer });
}

export async function getPhoto(driveKey: string, photoId: string): Promise<string | null> {
  return sendAndWait('get-photo', { driveKey, photoId });
}

export function onFeedUpdate(cb: (post: any) => void): void {
  if (!listeners['feed-update']) listeners['feed-update'] = [];
  listeners['feed-update'].push(cb);
}

// Community methods
export async function createCommunity(params: { name: string; description?: string }): Promise<{ communityKey: string }> {
  return sendAndWait('create-community', params);
}

export async function joinCommunity(communityKey: string): Promise<void> {
  return sendAndWait('join-community', { communityKey });
}

export async function getCommunities(): Promise<any[]> {
  const result = await sendAndWait('get-communities');
  return result || [];
}

export async function getCommunityFeed(communityKey: string): Promise<any[]> {
  const result = await sendAndWait('get-community-feed', { communityKey });
  return result || [];
}

export async function submitPost(params: { text: string; communityKeyHex: string }): Promise<void> {
  return sendAndWait('submit-post', params);
}

export async function removePost(params: { postId: string; communityKey: string }): Promise<void> {
  return sendAndWait('remove-post', params);
}

export async function castVote(params: { targetId: string; value: number }): Promise<void> {
  return sendAndWait('cast-vote', params);
}

export async function getVoteCounts(targetId: string): Promise<{ up: number; down: number; score: number }> {
  const result = await sendAndWait('get-vote-counts', { targetId });
  return result || { up: 0, down: 0, score: 0 };
}

export async function getMyVote(targetId: string): Promise<number> {
  const result = await sendAndWait('get-my-vote', { targetId });
  return result ?? 0;
}

export async function postComment(params: { parentId: string; communityKey: string; text: string }): Promise<void> {
  return sendAndWait('post-comment', params);
}

export async function getCommentTree(params: { communityKey: string; postId: string }): Promise<any[]> {
  const result = await sendAndWait('get-comment-tree', params);
  return result || [];
}

export async function announceCommunity(communityKey: string): Promise<void> {
  return sendAndWait('announce-community', { communityKey });
}

export async function searchCommunities(query: string): Promise<any[]> {
  const result = await sendAndWait('search-communities', { query });
  return result || [];
}

export async function listCommunities(): Promise<any[]> {
  const result = await sendAndWait('list-communities');
  return result || [];
}

export async function search(query: string): Promise<any[]> {
  const result = await sendAndWait('search', { query });
  return result || [];
}

export async function sendMessage(friendPubkeyHex: string, text: string): Promise<any> {
  return sendAndWait('send-message', { friendPubkeyHex, text })
}

export async function getMessages(friendPubkeyHex: string, limit?: number): Promise<any[]> {
  const result = await sendAndWait('get-messages', { friendPubkeyHex, limit: limit || 50 })
  return result || []
}

export async function getConversations(): Promise<any[]> {
  const result = await sendAndWait('get-conversations')
  return result || []
}

export function onNewMessage(cb: (msg: any) => void): void {
  if (!listeners['new-message']) listeners['new-message'] = []
  listeners['new-message'].push(cb)
}

export async function startCall(participantKeys: string[], isVideo: boolean): Promise<{ callId: string }> {
  const result = await sendAndWait('start-call', { participantKeys, isVideo })
  return result || { callId: '' }
}

export async function acceptCall(params: { callId: string; callerKey: string; isVideo: boolean }): Promise<void> {
  return sendAndWait('accept-call', params)
}

export async function rejectCall(params: { callId: string; callerKey: string }): Promise<void> {
  return sendAndWait('reject-call', params)
}

export async function endCall(params: { callId: string }): Promise<void> {
  return sendAndWait('end-call', params)
}

export async function toggleMute(params: { callId: string; audio?: boolean; video?: boolean }): Promise<void> {
  return sendAndWait('toggle-mute', params)
}

export async function startScreenShare(callId: string): Promise<void> {
  return sendAndWait('start-screen-share', { callId })
}

export async function stopScreenShare(callId: string): Promise<void> {
  return sendAndWait('stop-screen-share', { callId })
}

export async function getCallHistory(): Promise<any[]> {
  const result = await sendAndWait('get-call-history')
  return result || []
}

export function onIncomingCall(cb: (call: any) => void): void {
  if (!listeners['incoming-call']) listeners['incoming-call'] = []
  listeners['incoming-call'].push(cb)
}

export function onCallEnded(cb: (data: any) => void): void {
  if (!listeners['call-ended']) listeners['call-ended'] = []
  listeners['call-ended'].push(cb)
}
