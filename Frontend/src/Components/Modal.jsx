import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-5"><h3 className="font-bold">{title}</h3><button onClick={onClose}><X/></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}