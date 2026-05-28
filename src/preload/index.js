import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pear', {
  // identity
  getMyProfile: () => ipcRenderer.invoke('get-my-profile'),
  setMyProfile: (name) => ipcRenderer.invoke('set-my-profile', name),
  getMyKey: () => ipcRenderer.invoke('get-my-key'),

  // friends
  addFriend: (pubkey) => ipcRenderer.invoke('add-friend', pubkey),
  getFriends: () => ipcRenderer.invoke('get-friends'),

  // posts
  createPost: (text) => ipcRenderer.invoke('create-post', text),
  getFeed: () => ipcRenderer.invoke('get-feed'),

  // events from main → renderer
  onFeedUpdate: (cb) => ipcRenderer.on('feed-update', (_, data) => cb(data))
})
