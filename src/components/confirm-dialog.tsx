import { useEffect, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

/** Small centred pop-up used for "are you sure?" and "confirm your identity" prompts. */
export function ConfirmDialog({
  open, title, children, confirmLabel = 'Yes', cancelLabel = 'No', onConfirm, onCancel, icon, danger = false, confirmDisabled = false,
}: {
  open: boolean; title: string; children: ReactNode; confirmLabel?: string; cancelLabel?: string | null;
  onConfirm: () => void; onCancel: () => void; icon?: ReactNode; danger?: boolean; confirmDisabled?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-5" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl bg-[#fffdf8] border border-[#e6e2d8] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <span className="w-12 h-12 rounded-2xl bg-[#fdf0e3] text-[#b0661a] grid place-items-center mb-4">{icon ?? <ShieldAlert size={24} />}</span>
        <h3 className="text-xl font-bold text-[#213b34] leading-tight">{title}</h3>
        <div className="mt-2 text-[17px] leading-relaxed text-[#4f6158]">{children}</div>
        <div className={`mt-6 grid gap-3 ${cancelLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {cancelLabel && <button onClick={onCancel} className="h-12 rounded-xl border border-[#d9ded5] bg-white font-semibold text-[17px] text-[#213b34]">{cancelLabel}</button>}
          <button onClick={onConfirm} disabled={confirmDisabled} className={`h-12 rounded-xl text-white font-semibold text-[17px] disabled:opacity-40 ${danger ? 'bg-[#b74b42]' : 'bg-[#285f51]'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
