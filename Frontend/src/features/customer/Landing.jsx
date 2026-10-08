import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Siren, Star, Wrench, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

const services = [
  ["Battery Assistance","Jump-start, battery check and replacement",Zap],
  ["Puncture Repair","Fast roadside tyre and puncture support",Wrench],
  ["Fuel Emergency","Fuel delivery when you run out on the road",Siren],
  ["Engine & Electrical","Get a verified mechanic for major issues",ShieldCheck]
];

export default function Landing() {
  return <div>
    <Navbar/>
    <section className="overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500"/>24/7 roadside assistance</span>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">Your breakdown.<br/><span className="text-red-500">Our response.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">FIX MOTO connects you with nearby verified mechanics when you need help on the road — fast, transparent and reliable.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-6 py-3.5">Get roadside help <ArrowRight size={18}/></Link>
            <Link to="/login" className="btn-secondary border-slate-700 bg-transparent text-white hover:bg-slate-900">Login</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-300"><span className="flex items-center gap-2"><CheckCircle2 className="text-green-400" size={17}/>Verified mechanics</span><span className="flex items-center gap-2"><CheckCircle2 className="text-green-400" size={17}/>Live tracking</span><span className="flex items-center gap-2"><CheckCircle2 className="text-green-400" size={17}/>Transparent pricing</span></div>
        </div>
        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-red-600/10 blur-3xl"/>
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-slate-900 p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">Emergency request</p><h3 className="mt-1 text-xl font-bold">Flat tyre</h3></div><span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">Urgent</span></div>
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/5 p-4"><MapPin className="text-red-400"/><div><p className="text-sm font-semibold">Current location</p><p className="text-xs text-slate-400">Your live location shared securely</p></div></div>
              <div className="mt-4 rounded-xl bg-white/5 p-4"><div className="flex items-center justify-between text-sm"><span className="text-slate-400">Mechanic ETA</span><b>8 min</b></div><div className="mt-3 h-2 rounded-full bg-slate-700"><div className="h-2 w-3/4 rounded-full bg-red-500"/></div></div>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-4"><div className="grid h-11 w-11 place-items-center rounded-full bg-red-500/15 text-red-400"><Wrench/></div><div className="flex-1"><p className="font-semibold">Verified mechanic</p><p className="text-xs text-slate-400">4.9 ★ • 8 min away</p></div><ShieldCheck className="text-green-400"/></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="services" className="mx-auto max-w-7xl px-5 py-20">
      <div className="max-w-2xl"><p className="font-semibold text-red-600">OUR SERVICES</p><h2 className="mt-2 text-3xl font-black md:text-4xl">Help for the moments you didn't plan for.</h2><p className="mt-4 text-slate-500">Tell us what's wrong and FIX MOTO finds the right nearby service provider.</p></div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {services.map(([title,desc,Icon]) => <div key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl"><div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600"><Icon/></div><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p></div>)}
      </div>
    </section>

    <section id="how" className="bg-white py-20"><div className="mx-auto max-w-7xl px-5"><div className="text-center"><p className="font-semibold text-red-600">HOW IT WORKS</p><h2 className="mt-2 text-3xl font-black">From breakdown to back on the road.</h2></div><div className="mt-12 grid gap-6 md:grid-cols-4">{["Raise an emergency","Share your location","Get matched with a mechanic","Track, pay & review"].map((x,i)=><div key={x} className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-600 font-bold text-white">{i+1}</div><h3 className="mt-4 font-bold">{x}</h3><p className="mt-2 text-sm text-slate-500">Simple, secure and designed for stressful roadside moments.</p></div>)}</div></div></section>
    <section id="about" className="bg-slate-950 py-16 text-white"><div className="mx-auto max-w-4xl px-5 text-center"><Star className="mx-auto fill-red-500 text-red-500"/><h2 className="mt-4 text-3xl font-black">Built around trust when you need it most.</h2><p className="mx-auto mt-4 max-w-2xl text-slate-300">Verified providers, live status updates and digital service records give you confidence from request to resolution.</p></div></section>
    <Footer/>
  </div>;
}