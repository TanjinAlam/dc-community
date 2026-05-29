import Hyperdrive from 'hyperdrive'

export async function initDrive(store) {
  const drive = new Hyperdrive(store)
  await drive.ready()
  return drive
}

export async function setAvatar(drive, imageBuffer, mimeType) {
  await drive.put('/avatar', imageBuffer)
  await drive.put('/avatar.mime', Buffer.from(mimeType))
  return drive.key.toString('hex')
}

export async function getAvatar(drive, friendDriveKeyHex) {
  const friendDrive = new Hyperdrive(drive.corestore, Buffer.from(friendDriveKeyHex, 'hex'))
  await friendDrive.ready()
  try {
    const buffer = await friendDrive.get('/avatar')
    const mimeTypeBuf = await friendDrive.get('/avatar.mime')
    if (!buffer || !mimeTypeBuf) return null
    return { buffer, mimeType: mimeTypeBuf.toString() }
  } catch {
    return null
  }
}
