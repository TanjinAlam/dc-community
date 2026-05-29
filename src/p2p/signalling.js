export function createCallState() {
  return {
    callId: null,
    status: 'idle',
    participants: [],
    isVideo: false,
    startedAt: null,
    isMuted: { audio: false, video: false }
  }
}

export function handleSignalMessage(state, msg, myPubkey) {
  const { status } = state
  const { type } = msg

  if (type === 'call-ended') {
    return {
      nextState: { ...state, status: 'ended' },
      actions: [{ type: 'close-peer-connection', payload: msg }]
    }
  }

  if (type === 'call-muted') {
    return {
      nextState: {
        ...state,
        isMuted: {
          audio: msg.audio !== undefined ? msg.audio : state.isMuted.audio,
          video: msg.video !== undefined ? msg.video : state.isMuted.video
        }
      },
      actions: [{ type: 'update-mute-state', payload: msg }]
    }
  }

  if (status === 'idle' && type === 'call-invite') {
    if (msg.callerKey === myPubkey) {
      return {
        nextState: { ...state, status: 'ringing', callId: msg.callId, participants: msg.participants, isVideo: msg.video },
        actions: [{ type: 'wait-for-answer', payload: msg }]
      }
    } else if (Array.isArray(msg.participants) && msg.participants.includes(myPubkey)) {
      return {
        nextState: { ...state, status: 'ringing', callId: msg.callId, participants: msg.participants, isVideo: msg.video },
        actions: [{ type: 'show-incoming-call', payload: msg }]
      }
    }
  }

  if (status === 'ringing' && type === 'call-accepted') {
    return {
      nextState: { ...state, status: 'connecting' },
      actions: [{ type: 'create-peer-connection', payload: msg }]
    }
  }

  if (status === 'ringing' && type === 'call-rejected') {
    return {
      nextState: { ...state, status: 'idle' },
      actions: [{ type: 'show-rejected', payload: msg }]
    }
  }

  if (status === 'ringing' && type === 'call-ended') {
    return {
      nextState: { ...state, status: 'idle' },
      actions: [{ type: 'show-missed-call', payload: msg }]
    }
  }

  if (status === 'connecting' && type === 'call-offer') {
    return {
      nextState: { ...state },
      actions: [{ type: 'set-remote-offer', payload: msg }]
    }
  }

  if (status === 'connecting' && type === 'call-answer') {
    return {
      nextState: { ...state },
      actions: [{ type: 'set-remote-answer', payload: msg }]
    }
  }

  if (status === 'connecting' && type === 'ice-candidate') {
    return {
      nextState: { ...state },
      actions: [{ type: 'add-ice-candidate', payload: msg }]
    }
  }

  return { nextState: state, actions: [] }
}

export function buildInviteMessage(callId, myPubkey, participantKeys, isVideo) {
  return {
    type: 'call-invite',
    callId,
    callerKey: myPubkey,
    participants: participantKeys,
    video: isVideo
  }
}

export function buildEndMessage(callId, myPubkey) {
  return {
    type: 'call-ended',
    callId,
    byKey: myPubkey
  }
}
