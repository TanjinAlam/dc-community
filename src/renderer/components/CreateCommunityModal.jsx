import React, { useState, useEffect } from 'react'

export default function CreateCommunityModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    const result = await window.pear.createCommunity({ name: name.trim(), description: description.trim(), rules: rules.trim() })
    await window.pear.announceCommunity({ name: name.trim(), description: description.trim(), communityKey: result.communityKey })
    onCreated({ communityKey: result.communityKey, name: name.trim(), role: 'owner' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-96">
        <h2 className="text-white text-xl font-bold mb-4">Create Community</h2>
        <input className="w-full bg-gray-800 text-white rounded p-2 mb-3 text-sm" placeholder="Community name" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full bg-gray-800 text-white rounded p-2 mb-3 text-sm" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <textarea className="w-full bg-gray-800 text-white rounded p-2 mb-4 text-sm resize-none" rows={3} placeholder="Rules" value={rules} onChange={e => setRules(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={handleCreate} className="flex-1 bg-purple-600 text-white py-2 rounded font-medium">Create</button>
          <button onClick={onClose} className="flex-1 border border-gray-600 text-gray-400 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  )
}
