"use client";

// The frame of the sign-in and setup pages: the form on a white column at the left, the home
// page's photograph on the right (hidden on phones), so the way in looks like the shop.

import type { ReactNode } from "react";
import { CdrLockup } from "@/app/(site)/CdrLogo";
import { assetBySlot } from "@/lib/assets";

const plate = assetBySlot("home-hero");

export function AuthFrame({ title, intro, children, foot }: { title: string; intro?: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="adm-auth">
      <main className="adm-auth-form" id="main">
        {/* A full page load on purpose: the shop runs with its motion on, the panel pins it off. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" aria-label="Corporate Domain Registry, the shop" style={{ display: "inline-flex", width: "fit-content" }}>
          <CdrLockup style={{ height: "3.25rem", width: "auto" }} />
        </a>
        <div className="adm-auth-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <h1>{title}</h1>
            {intro ? <p className="muted" style={{ margin: 0 }}>{intro}</p> : null}
          </div>
          {children}
        </div>
        {foot ? <div className="adm-auth-foot">{foot}</div> : null}
      </main>
      <div className="adm-auth-plate" aria-hidden="true">
        {/* The static export serves images as they are; next/image would add nothing here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {plate?.src ? <img src={plate.src} alt="" /> : null}
        <blockquote>
          Every order, every domain and every payment, in one place.
          <cite>Corporate Domain Registry admin</cite>
        </blockquote>
      </div>
    </div>
  );
}
