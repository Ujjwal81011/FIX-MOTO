import { CircleDollarSign, Info } from "lucide-react";

export default function Payments(){
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black">Payments</h1>
    <p className="mt-2 text-slate-500">Platform payment activity.</p>
    <div className="card mt-7 p-10">
      <div className="flex items-start gap-4">
        <CircleDollarSign className="text-red-600"/>
        <div>
          <p className="font-bold">Admin payment-list API is not present in the current backend.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Customer payment history, payment creation and payment-by-id are supported.
            The frontend does not call the nonexistent <code>/payments/all</code> endpoint.
          </p>
        </div>
      </div>
    </div>
  </div>;
}
