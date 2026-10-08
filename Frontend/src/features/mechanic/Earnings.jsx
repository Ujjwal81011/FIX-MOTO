import { CircleDollarSign, Info } from "lucide-react";

export default function Earnings(){
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black">Earnings</h1>
    <p className="mt-2 text-slate-500">Track your roadside service income.</p>
    <div className="card mt-7 p-10">
      <div className="flex items-start gap-4">
        <CircleDollarSign className="text-red-600"/>
        <div>
          <p className="font-bold">Mechanic earnings API is not available in the current backend.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The existing backend has customer payment endpoints and payment-by-id, but no
            mechanic payment-list/earnings endpoint. The frontend will not call a nonexistent route.
          </p>
        </div>
      </div>
    </div>
  </div>;
}
