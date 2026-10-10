
import { CircleDollarSign, Info } from "lucide-react";

export default function Payments() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-black">Payments</h1>
      <p className="mt-2 text-slate-500">Platform payment activity.</p>

      <div className="card mt-7 p-10">
        <div className="flex items-start gap-4">
          <CircleDollarSign className="text-red-600" />

          <div>
            <p className="font-bold">
              Admin payment history API is not configured yet.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Customer payment history and mechanic confirmation are handled
              separately. To display all platform payments here, a protected
              admin-only backend endpoint must be added first.
            </p>

            <div className="mt-4 flex gap-2 text-sm text-slate-500">
              <Info size={18} />
              <span>No nonexistent API endpoint is called from this page.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
