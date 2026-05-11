import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import type { AmbiguousName } from '@/types';

interface AmbiguousNameModalProps {
  isOpen: boolean;
  ambiguousNames: AmbiguousName[];
  onConfirm: (selections: Record<string, string>) => void;
  onCancel: () => void;
}

export default function AmbiguousNameModal({
  isOpen,
  ambiguousNames,
  onConfirm,
  onCancel,
}: AmbiguousNameModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const allSelected = ambiguousNames.every(a => selections[a.nombre]);

  const handleConfirm = () => {
    if (allSelected) {
      onConfirm(selections);
      setSelections({});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="fp-card w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Nombre ambiguo</h2>
              <p className="text-xs text-muted-foreground">
                Hay varios colaboradores con nombres similares
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-5">
          {ambiguousNames.map((amb, i) => (
            <div key={i}>
              <label className="text-sm font-medium text-foreground mb-2 block">
                ¿A cuál "{amb.nombre}" te refieres?
              </label>
              <select
                value={selections[amb.nombre] || ''}
                onChange={e => setSelections(prev => ({ ...prev, [amb.nombre]: e.target.value }))}
                className="fp-input w-full px-3 py-2.5 text-sm bg-card"
              >
                <option value="">Selecciona el colaborador correcto…</option>
                {amb.matches.map((match, j) => (
                  <option key={j} value={match}>
                    {match}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="fp-btn-secondary flex-1 py-3 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allSelected}
            className="fp-btn-primary flex-[2] py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar con selección →
          </button>
        </div>
      </div>
    </div>
  );
}
