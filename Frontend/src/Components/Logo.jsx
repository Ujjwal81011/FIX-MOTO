import { Wrench, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-200">
        <Wrench size={20} />
        <Zap size={11} className="absolute bottom-1 right-1 fill-white" />
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
        FIX<span className="text-red-600"> MOTO </span>
      </span>
    </Link>
  );
}