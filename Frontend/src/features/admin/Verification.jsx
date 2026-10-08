import { ShieldCheck, Info } from "lucide-react";

export default function Verification(){
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black">Mechanic Verification</h1>
    <p className="mt-2 text-slate-500">Verification status can be viewed from the Mechanics section.</p>
    <div className="card mt-7 p-10">
      <div className="flex items-start gap-4">
        <ShieldCheck className="text-green-600"/>
        <div>
          <p className="font-bold">Approval/revoke API is not present in the current backend.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The original backend exposes mechanic profiles and the admin mechanic list, but it does not
            expose verification-list or verification-update endpoints. This screen intentionally avoids
            sending unsupported requests.
          </p>
        </div>
      </div>
    </div>
  </div>;
}
