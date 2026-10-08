export default function StatCard({ icon: Icon, label, value, note }) {
  return <div className="card p-5">
    <div className="flex items-start justify-between">
      <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p>{note && <p className="mt-1 text-xs text-slate-400">{note}</p>}</div>
      <div className="rounded-xl bg-red-50 p-3 text-red-600"><Icon size={21}/></div>
    </div>
  </div>;
}