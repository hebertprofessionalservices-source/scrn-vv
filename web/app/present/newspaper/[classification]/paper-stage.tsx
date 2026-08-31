"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fits the fixed 1920x1080 recap page to whatever screen it is opened on.
 *
 * The page itself must stay exactly 1920x1080 — that rigidity is what makes a
 * screenshot a ready-to-post 16:9 graphic — so this scales it rather than
 * reflowing it. At a 1920x1080 viewport the scale computes to exactly 1, which
 * keeps the export path pixel-identical to the authored layout.
 *
 * Controls live here, outside .paper, so capturing that element for export
 * never includes them.
 */

const PAGE_W = 1920;
const PAGE_H = 1080;

export function PaperStage({ children }: { children: React.ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const scale = Math.min(
        el.clientWidth / PAGE_W,
        el.clientHeight / PAGE_H,
      );
      el.style.setProperty("--paper-scale", String(scale));
    };
    fit();
    // ResizeObserver catches fullscreen transitions and window drags alike,
    // which a resize listener alone can miss.
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /**
   * Fade the controls out once the pointer settles.
   *
   * They float over the page rather than beside it — at a 1920x1080 viewport
   * the page fills the screen, leaving nowhere else to put them — so a
   * screenshot would otherwise capture them sitting on the masthead. Hiding
   * them when idle means any capture of a page you are not actively driving
   * comes out clean, without needing a special export mode.
   */
  useEffect(() => {
    let timer: number;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  const toggle = useCallback(async () => {
    const el = stage.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // Fullscreen can be refused (permissions policy, or no user gesture on
      // some browsers). The page is still usable scaled, so fail quietly.
    }
  }, []);

  return (
    <div className="paper-stage" ref={stage}>
      <div className={`paper-controls${idle ? " paper-controls--idle" : ""}`}>
        <a href="/present/newspaper" className="paper-btn">
          ← All recaps
        </a>
        <button type="button" onClick={toggle} className="paper-btn">
          {full ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>
      {children}
    </div>
  );
}
