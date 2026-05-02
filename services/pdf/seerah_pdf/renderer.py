"""Playwright-driven export renderer.

We launch one persistent Chromium per process and reuse it across requests.
Each export opens a fresh browser context so cookies / storage from one
render never leak into the next.

The Next.js render route at `/render/[id]` accepts a Bearer token in the
`Authorization` header — we set it once via `extra_http_headers` on the
context. The headless browser then navigates to the route, waits for fonts
and the network to settle, and captures either a PDF (single or multi-page)
or a PNG screenshot of the resume `<article>`.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode, urljoin

from playwright.async_api import Browser, BrowserContext, async_playwright

from .config import get_settings

_logger = logging.getLogger(__name__)

ExportFormat = Literal["pdf_single", "pdf_multi", "png"]

# A4 dimensions in inches; Playwright's print API works in inches/millimeters.
A4_WIDTH_IN = 8.27
A4_HEIGHT_IN = 11.69


@dataclass
class RenderRequest:
    resume_id: str
    language: Literal["ar", "en"]
    format: ExportFormat
    template_id: str | None
    primary_color: str | None
    mode: Literal["light", "dark"] | None


@dataclass
class RenderResult:
    content: bytes
    content_type: str
    extension: str


class PlaywrightRenderer:
    """Singleton wrapper that owns the persistent browser instance."""

    def __init__(self) -> None:
        self._browser: Browser | None = None
        self._playwright = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._browser is not None:
            return
        async with self._lock:
            if self._browser is not None:
                return
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--font-render-hinting=none",
                ],
            )

    async def stop(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None

    async def _new_context(self) -> BrowserContext:
        if self._browser is None:
            await self.start()
        assert self._browser is not None
        settings = get_settings()
        headers: dict[str, str] = {}
        if settings.render_internal_token:
            headers["Authorization"] = f"Bearer {settings.render_internal_token}"
        context = await self._browser.new_context(
            viewport={
                "width": settings.render_viewport_width,
                "height": settings.render_viewport_height,
            },
            device_scale_factor=2,
            extra_http_headers=headers,
            locale="ar-SA",
        )
        # Cap navigation + action timeouts so a stuck render doesn't stall a
        # worker forever. The route is local to the cluster, so 20s is plenty.
        context.set_default_timeout(settings.render_timeout_ms)
        return context

    async def render(self, req: RenderRequest) -> RenderResult:
        await self.start()
        context = await self._new_context()
        try:
            page = await context.new_page()
            url = self._build_url(req)
            _logger.info("rendering url=%s format=%s", url, req.format)
            await page.goto(url, wait_until="networkidle")
            # Block until @font-face declarations have resolved and the
            # template article is in the DOM.
            await page.evaluate("document.fonts ? document.fonts.ready : null")
            await page.wait_for_selector("article", state="attached")

            if req.format == "png":
                # Screenshot the article element so the PNG is exactly the
                # template card — no surrounding shell, no scroll bars.
                element = await page.query_selector("article")
                if element is None:
                    # Fallback: full page screenshot.
                    content = await page.screenshot(full_page=True, type="png")
                else:
                    content = await element.screenshot(type="png")
                return RenderResult(content, "image/png", "png")

            if req.format == "pdf_single":
                # Force single-page output by computing the natural article
                # height and printing onto a custom page that fits it.
                height_px = await page.evaluate(
                    "() => { const a = document.querySelector('article');"
                    " return a ? a.getBoundingClientRect().height : 0; }"
                )
                # Convert px (96dpi) to inches; clamp to a sane max.
                height_in = max(A4_HEIGHT_IN, min(80.0, float(height_px) / 96.0 + 0.2))
                pdf_bytes = await page.pdf(
                    width=f"{A4_WIDTH_IN}in",
                    height=f"{height_in}in",
                    print_background=True,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                    prefer_css_page_size=False,
                )
                return RenderResult(pdf_bytes, "application/pdf", "pdf")

            # pdf_multi (default).
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                prefer_css_page_size=False,
            )
            return RenderResult(pdf_bytes, "application/pdf", "pdf")
        finally:
            await context.close()

    def _build_url(self, req: RenderRequest) -> str:
        settings = get_settings()
        params: dict[str, str] = {
            "lang": req.language,
            "export": "true",
        }
        if req.template_id:
            params["template"] = req.template_id
        if req.primary_color:
            params["primary"] = req.primary_color
        if req.mode:
            params["mode"] = req.mode
        return urljoin(
            settings.web_app_url.rstrip("/") + "/",
            f"render/{req.resume_id}?{urlencode(params)}",
        )


_renderer: PlaywrightRenderer | None = None


def get_renderer() -> PlaywrightRenderer:
    global _renderer
    if _renderer is None:
        _renderer = PlaywrightRenderer()
    return _renderer
