import { Plus } from "lucide-react";

export function AcquisitionHero({ onAddProspect }: { onAddProspect: () => void }) {
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-gradient-to-br from-ink via-[#0B3A1B] to-signal-strong px-6 py-8 text-white shadow-sm sm:px-9 sm:py-9 lg:min-h-[260px]">
      <div className="relative z-10 sm:max-w-[55%]">
        <p className="text-2xs font-medium uppercase tracking-[0.14em] text-white/60">Web Summit 2026 · Lisbon</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Customer acquisition desk</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
          Capture what engineering teams tell you, agree on the next step, and move qualified prospects toward a
          design partnership or paid rollout.
        </p>
        <button
          type="button"
          onClick={onAddProspect}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-signal-strong shadow-sm transition-colors hover:bg-signal-soft"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add prospect
        </button>
      </div>
      <HeroArt />
    </section>
  );
}

function HeroArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 500 280"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute -right-3 top-0 hidden h-full w-[53%] [mask-image:linear-gradient(to_right,transparent,black_15%)] sm:block"
    >
      <defs>
        <linearGradient id="acq-glass" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#9BF0B4" stopOpacity=".45" />
          <stop offset="1" stopColor="#0F9E31" stopOpacity=".10" />
        </linearGradient>
        <linearGradient id="acq-edge">
          <stop stopColor="#2FBF5B" />
          <stop offset=".6" stopColor="#C8F7D5" />
          <stop offset="1" stopColor="#3DD06A" />
        </linearGradient>
        <radialGradient id="acq-glow">
          <stop stopColor="#1FB84A" stopOpacity=".55" />
          <stop offset="1" stopColor="#0F9E31" stopOpacity="0" />
        </radialGradient>
        <pattern id="acq-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke="#BDF2CC" strokeOpacity=".13" />
        </pattern>
      </defs>

      <ellipse cx="286" cy="145" rx="202" ry="130" fill="url(#acq-glow)" />
      <path d="M0 0h500v280H0z" fill="url(#acq-grid)" opacity=".65" />

      <g fill="none" stroke="#A6EBB9" strokeOpacity=".4">
        <path d="M8 181h80l42-42h63m-152 85h93l35-35h69M323 91h50l32-32h87m-130 94h43l38-38h56M293 226h98l28-28h80" />
        <ellipse cx="266" cy="202" rx="171" ry="51" transform="rotate(-10 266 202)" strokeDasharray="3 6" />
      </g>

      <g stroke="url(#acq-edge)" strokeWidth="1.4" strokeLinejoin="round">
        <path d="m111 181 130-72 157 52-131 77Z" fill="#0B4A22" />
        <path d="M111 181v12l156 57 131-77v-12l-131 77z" fill="#0D3F1E" />
        <path d="m111 143 130-72 157 52-131 77Z" fill="url(#acq-glass)" />
        <path d="M111 143v10l156 57 131-77v-10l-131 77z" fill="#3DD06A" fillOpacity=".23" />
        <path d="m111 105 130-72 157 52-131 77Z" fill="url(#acq-glass)" />
        <path d="M111 105v9l156 57 131-77v-9l-131 77z" fill="#6BE08F" fillOpacity=".27" />
      </g>

      <path
        d="m165 106 42-23 25 8 30-17 39 13 45-25"
        fill="none"
        stroke="#E3FBE9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g fill="#E8FCEE">
        <circle cx="165" cy="106" r="3" />
        <circle cx="262" cy="74" r="3" />
        <circle cx="346" cy="62" r="4" />
        <circle cx="88" cy="181" r="3" />
        <circle cx="405" cy="59" r="3" />
        <circle cx="419" cy="198" r="3" />
      </g>
    </svg>
  );
}
