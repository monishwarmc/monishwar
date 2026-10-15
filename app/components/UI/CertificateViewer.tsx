"use client";

import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useEffect } from "react";
import { CERTIFICATIONS } from "@/app/constants/portfolio.constants";
import { press } from "../audio/sfx";
import {
  closeCertificate,
  step,
  useCertificateFocus,
} from "../world/certificates";

/**
 * A certificate, full size, over the top of the world.
 *
 * This is where a fallen fruit lands: knock a skill off the tree and the
 * certificate it earned opens here, big enough to actually read, with a way
 * out to the issuer's copy of it.
 *
 * It is a 2D overlay rather than something in the scene because a certificate
 * is a flat document whose whole content is small print. The wall out on the
 * deck is the *showcase*; this is the reading view, and the two share one
 * index so stepping through here turns the wall out there as well.
 *
 * Deliberately not an `Overlay` in `SessionContext`: those close each other,
 * stand the avatar up and reset interactions, and none of that should happen
 * because somebody knocked a fruit out of a tree.
 */
const CertificateViewer = () => {
  const { index, opened } = useCertificateFocus();
  const certificate = CERTIFICATIONS[index];

  // Escape closes, and the arrow keys step — the same keys that drive every
  // other gallery, so nobody has to be told.
  useEffect(() => {
    if (!opened) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCertificate();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened]);

  if (!opened || !certificate) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="ui-panel relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <header className="flex items-start gap-3 border-b border-white/10 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={certificate.logo}
            alt=""
            className="mt-0.5 h-9 w-9 shrink-0 rounded bg-white/90 object-contain p-1"
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-white">
              {certificate.name}
            </h2>
            <p className="text-xs text-slate-400">
              {certificate.issuer} · {certificate.issued} · {index + 1} of{" "}
              {CERTIFICATIONS.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              press();
              closeCertificate();
            }}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon style={{ fontSize: 20 }} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={certificate.img}
            alt={certificate.name}
            className="max-h-[60vh] w-auto max-w-full rounded object-contain"
          />

          {[-1, 1].map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => {
                press();
                step(direction as 1 | -1);
              }}
              aria-label={direction < 0 ? "Previous" : "Next"}
              className={`absolute top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white transition-transform hover:scale-110 ${
                direction < 0 ? "left-4" : "right-4"
              }`}
            >
              {direction < 0 ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
          ))}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 p-3">
          <p className="text-[11px] text-slate-500">
            ← → to step · Esc to close
          </p>

          <a
            href={certificate.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => press()}
            className="flex items-center gap-1.5 rounded-full bg-emerald-300 px-4 py-1.5 text-xs font-semibold text-black transition-transform hover:scale-105"
          >
            Verify <OpenInNewIcon style={{ fontSize: 14 }} />
          </a>
        </footer>
      </div>
    </div>
  );
};

export default CertificateViewer;
