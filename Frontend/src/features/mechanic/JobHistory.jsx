import { History, Info } from "lucide-react";

export default function JobHistory(){
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black">Job History</h1>
    <p className="mt-2 text-slate-500">Completed service requests.</p>
    <div className="card mt-7 p-10">
      <div className="flex items-start gap-4">
        <History className="text-slate-400"/>
        <div>
          <p className="font-bold">History API is not exposed by the current backend.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The original backend provides request details and status updates, but it does not provide a
            mechanic-specific completed-jobs endpoint. This page therefore does not call a fake endpoint.
            Completed jobs can still be opened from an active request before it is cleared.
          </p>
        </div>
      </div>
    </div>
  </div>;
}
