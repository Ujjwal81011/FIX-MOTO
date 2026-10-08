import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-4">
        <div><Logo /><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Fast, verified roadside assistance when your vehicle breaks down.</p></div>
        <div><h4 className="font-bold">Platform</h4><div className="mt-4 space-y-2 text-sm text-slate-500"><p>Emergency Help</p><p>Find Mechanics</p><p>Live Tracking</p></div></div>
        <div><h4 className="font-bold">For Mechanics</h4><div className="mt-4 space-y-2 text-sm text-slate-500"><p>Register as Mechanic</p><p>Manage Jobs</p><p>Track Earnings</p></div></div>
        <div><h4 className="font-bold">Support</h4><div className="mt-4 space-y-2 text-sm text-slate-500"><p>24/7 Emergency Support</p><p>Safety & Verification</p><p>Contact Us</p></div></div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-sm text-slate-400">© 2026 FIX MOTO. Your breakdown. Our response.</div>
    </footer>
  );
}