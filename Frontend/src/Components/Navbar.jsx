import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import Logo from "./Logo";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          <NavLink to="/" className="text-sm font-medium text-slate-600 hover:text-red-600">Home</NavLink>
          <a href="#how" className="text-sm font-medium text-slate-600 hover:text-red-600">How it works</a>
          <a href="#services" className="text-sm font-medium text-slate-600 hover:text-red-600">Services</a>
          <a href="#about" className="text-sm font-medium text-slate-600 hover:text-red-600">About</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="btn-secondary">Login</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
        <button className="rounded-xl p-2 md:hidden" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <a href="#how" onClick={() => setOpen(false)}>How it works</a>
            <a href="#services" onClick={() => setOpen(false)}>Services</a>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}