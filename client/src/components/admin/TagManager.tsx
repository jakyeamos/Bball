import React, { useState } from 'react';

interface TagManagerProps {
  tags: string[];
  onCreate: (name: string) => Promise<void> | void;
  onDelete: (name: string) => Promise<void> | void;
}

export function TagManager({ tags, onCreate, onDelete }: TagManagerProps) {
  const [tagName, setTagName] = useState('');

  return (
    <div className="rounded-cv border border-cv-court/20 bg-cv-steel p-5">
      <div className="mb-4 flex gap-3">
        <input
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
          placeholder="new-tag"
          className="flex-1 rounded-cv border border-cv-court/20 bg-cv-navy/40 px-4 py-3 text-cv-chalk"
        />
        <button
          type="button"
          onClick={async () => {
            if (!tagName.trim()) return;
            await onCreate(tagName.trim());
            setTagName('');
          }}
          className="rounded-cv bg-cv-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Add tag
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onDelete(tag)}
            className="rounded-full border border-cv-court/20 px-3 py-1 text-xs text-cv-chalk/70 hover:border-red-400/50"
          >
            {tag} ×
          </button>
        ))}
      </div>
    </div>
  );
}
