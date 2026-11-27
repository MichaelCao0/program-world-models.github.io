#!/usr/bin/env python3
"""Opaque-box, 4-tier static + Playwright E2E verification suite for program-world-models.github.io."""
from __future__ import annotations

import argparse
import colorsys
from dataclasses import asdict, dataclass
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Sequence, TextIO, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None  # type: ignore

try:
    from playwright.sync_api import Download, Error as PlaywrightError, Page, sync_playwright
except ImportError:  # pragma: no cover
    Download = Any  # type: ignore
    PlaywrightError = Exception  # type: ignore
    Page = Any  # type: ignore
    sync_playwright = None  # type: ignore


DEFAULT_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
EXCLUDED_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}

BANNED_PINK_LITERALS = (
    "#ee3e9e",
    "#fdf2f8",
    "#dd0674",
    "#f472b6",
    "221, 6, 116",
    "221,6,116",
    "238, 62, 158",
    "238,62,158",
    "244, 114, 182",
    "244,114,182",
    "253, 242, 248",
    "253,242,248",
)
BANNED_PINK_RGBS = {
    (221, 6, 116),
    (238, 62, 158),
    (244, 114, 182),
    (253, 242, 248),
}

ROUTE_REQUIRED_FILES: Dict[str, List[str]] = {
    "": ["index.html", "styles.css", "script.js", "shared/shell.css", "shared/shell.js"],
    "survey/": ["survey/index.html", "survey/styles.css", "survey/app.js", "survey/data.js", "survey/extra_refs.js"],
    "arena/": ["arena/index.html", "arena/arena.js"],
    "method/": ["method/index.html", "method/method.js"],
}

ROUTE_PAGE_IDS: Dict[str, Tuple[str, str]] = {
    "": ("overview", "."),
    "survey/": ("survey", ".."),
    "arena/": ("arena", ".."),
    "method/": ("method", ".."),
}

HEX_COLOR_RE = re.compile(r"#([0-9a-fA-F]{3,8})\b")
RGB_COLOR_RE = re.compile(
    r"rgba?\(\s*(\d+(?:\.\d+)?%?)\s*(?:,|\s)\s*(\d+(?:\.\d+)?%?)\s*(?:,|\s)\s*(\d+(?:\.\d+)?%?)(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
HSL_COLOR_RE = re.compile(
    r"hsla?\(\s*(-?\d*\.?\d+)(deg|rad|grad|turn)?\s*(?:,|\s)\s*(\d+(?:\.\d+)?)%\s*(?:,|\s)\s*(\d+(?:\.\d+)?)%(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
OKLCH_COLOR_RE = re.compile(
    r"oklch\(\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+|none)(deg|rad|grad|turn)?(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
LCH_COLOR_RE = re.compile(
    r"(?<![a-zA-Z-])lch\(\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+|none)(deg|rad|grad|turn)?(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
OKLAB_COLOR_RE = re.compile(
    r"oklab\(\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
LAB_COLOR_RE = re.compile(
    r"(?<![a-zA-Z-])lab\(\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)\s*[,\s]\s*([+-]?\d*\.?\d+%?)(?:\s*[,/]\s*([0-9]*\.?[0-9]+%?))?\s*\)",
    re.IGNORECASE,
)
CSS_NAMED_PINK_RE = re.compile(
    r":[^;{}]*\b(pink|hotpink|deeppink|lightpink|magenta|fuchsia)\b",
    re.IGNORECASE,
)
_JS_REGEX_PREFIX_KEYWORDS = frozenset({
    "return",
    "throw",
    "case",
    "delete",
    "void",
    "typeof",
    "instanceof",
    "in",
    "of",
    "new",
    "yield",
    "await",
    "else",
    "do",
    "export",
    "default",
})
_CSS_COMMENT_RE = re.compile(r"/\*[\s\S]*?\*/")
_HTML_COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
_HTML_STYLE_TAG_RE = re.compile(r"<style\b[^>]*>([\s\S]*?)</style>", re.IGNORECASE)
_HTML_STYLE_ATTR_RE = re.compile(r"""\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')""", re.IGNORECASE | re.DOTALL)


@dataclass
class CheckResult:
    tier: str
    id: str
    status: str  # PASS | FAIL | SKIP | WARN
    detail: str
    duration_ms: int


class SuiteRunner:
    def __init__(self, stream: Optional[TextIO] = None) -> None:
        self.results: List[CheckResult] = []
        self.warnings: List[CheckResult] = []
        self.stream: TextIO = stream if stream is not None else sys.stdout

    def warn(self, tier: str, check_id: str, detail: str) -> None:
        item = CheckResult(tier=tier, id=check_id, status="WARN", detail=detail, duration_ms=0)
        self.warnings.append(item)
        print(f"[WARN] {check_id} | {detail}", file=self.stream)

    def record(self, tier: str, check_id: str, fn: Callable[[], str]) -> bool:
        t0 = time.monotonic()
        try:
            detail = fn()
            elapsed = int((time.monotonic() - t0) * 1000)
            res = CheckResult(tier=tier, id=check_id, status="PASS", detail=detail, duration_ms=elapsed)
            self.results.append(res)
            print(f"[PASS] {check_id} | {detail} ({elapsed}ms)", file=self.stream)
            return True
        except SkipCheck as exc:
            elapsed = int((time.monotonic() - t0) * 1000)
            res = CheckResult(tier=tier, id=check_id, status="SKIP", detail=str(exc), duration_ms=elapsed)
            self.results.append(res)
            print(f"[SKIP] {check_id} | {exc} ({elapsed}ms)", file=self.stream)
            return True
        except Exception as exc:
            elapsed = int((time.monotonic() - t0) * 1000)
            msg = str(exc).strip().replace("\n", " | ")
            res = CheckResult(tier=tier, id=check_id, status="FAIL", detail=msg, duration_ms=elapsed)
            self.results.append(res)
            print(f"[FAIL] {check_id} | {msg} ({elapsed}ms)", file=self.stream)
            return False

    @property
    def fail_count(self) -> int:
        return sum(1 for r in self.results if r.status == "FAIL")

    @property
    def pass_count(self) -> int:
        return sum(1 for r in self.results if r.status == "PASS")

    @property
    def skip_count(self) -> int:
        return sum(1 for r in self.results if r.status == "SKIP")


class SkipCheck(Exception):
    pass


class QuietHTTPHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        pass


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class StaticServer:
    def __init__(self, root: Path, port: int = 0) -> None:
        self.root = root.resolve()
        self.port = port
        self._server: Optional[ReusableThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    @property
    def base_url(self) -> str:
        assert self._server is not None
        actual_port = self._server.server_address[1]
        return f"http://127.0.0.1:{actual_port}"

    def __enter__(self) -> "StaticServer":
        handler = partial(QuietHTTPHandler, directory=str(self.root))
        self._server = ReusableThreadingHTTPServer(("127.0.0.1", self.port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=2.0)


def _make_subpath_handler(directory: str, prefix: str) -> Any:
    norm_prefix = "/" + prefix.strip("/")

    class SubpathHTTPHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=directory, **kwargs)

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
            pass

        def translate_path(self, path: str) -> str:
            parsed_path = urlparse(path).path
            if parsed_path == norm_prefix:
                mapped = "/"
            elif parsed_path.startswith(norm_prefix + "/"):
                mapped = parsed_path[len(norm_prefix):] or "/"
            else:
                return os.path.join(directory, "__pwm_nonexistent_subpath_outside_prefix__")
            return super().translate_path(mapped)

        def send_head(self) -> Any:
            parsed_path = urlparse(self.path).path
            if parsed_path == norm_prefix:
                self.send_response(301)
                self.send_header("Location", norm_prefix + "/")
                self.end_headers()
                return None
            if not parsed_path.startswith(norm_prefix + "/"):
                self.send_error(404, "Outside subpath prefix")
                return None
            return super().send_head()

    return SubpathHTTPHandler


class SubpathStaticServer:
    def __init__(self, root: Path, prefix: str = "/program-world-models.github.io", port: int = 0) -> None:
        self.root = root.resolve()
        self.prefix = "/" + prefix.strip("/")
        self.port = port
        self._server: Optional[ReusableThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    @property
    def base_url(self) -> str:
        assert self._server is not None
        actual_port = self._server.server_address[1]
        return f"http://127.0.0.1:{actual_port}{self.prefix}"

    def __enter__(self) -> "SubpathStaticServer":
        handler = _make_subpath_handler(str(self.root), self.prefix)
        self._server = ReusableThreadingHTTPServer(("127.0.0.1", self.port), handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=2.0)


class PageMonitor:
    def __init__(self, page: Page, base_url: str) -> None:
        self.page = page
        parsed = urlparse(base_url)
        self.base_origin = f"{parsed.scheme}://{parsed.netloc}"
        self.page_errors: List[str] = []
        self.console_errors: List[str] = []
        self.same_origin_failures: List[str] = []
        self.external_failures: List[str] = []

        page.on("pageerror", self._on_pageerror)
        page.on("console", self._on_console)
        page.on("requestfailed", self._on_requestfailed)
        page.on("response", self._on_response)

    def _is_same_origin(self, url: str) -> bool:
        return url.startswith(self.base_origin)

    def _on_pageerror(self, err: Any) -> None:
        self.page_errors.append(str(err))

    def _on_console(self, msg: Any) -> None:
        if msg.type == "error":
            text = msg.text
            loc = msg.location.get("url", "") if isinstance(msg.location, dict) else ""
            if loc and not self._is_same_origin(loc) and loc.startswith("http"):
                self.external_failures.append(f"console.error ({loc}): {text}")
            else:
                self.console_errors.append(text)

    def _on_requestfailed(self, req: Any) -> None:
        url = req.url
        reason = req.failure or "failed"
        if self._is_same_origin(url):
            self.same_origin_failures.append(f"requestfailed {url}: {reason}")
        else:
            self.external_failures.append(f"external requestfailed {url}: {reason}")

    def _on_response(self, resp: Any) -> None:
        url = resp.url
        if resp.status >= 400:
            if self._is_same_origin(url):
                self.same_origin_failures.append(f"HTTP {resp.status} {url}")
            else:
                self.external_failures.append(f"external HTTP {resp.status} {url}")

    def reset(self) -> None:
        self.page_errors.clear()
        self.console_errors.clear()
        self.same_origin_failures.clear()
        self.external_failures.clear()

    def errors(self) -> List[str]:
        return (
            [f"pageerror: {e}" for e in self.page_errors]
            + [f"console.error: {e}" for e in self.console_errors]
            + list(self.same_origin_failures)
        )

    def assert_clean(self, context_label: str = "") -> None:
        errs = self.errors()
        if errs:
            prefix = f"{context_label}: " if context_label else ""
            raise AssertionError(f"{prefix}{'; '.join(errs[:5])}")


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.refs: List[Tuple[int, str, str]] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        line = self.getpos()[0]
        for attr, val in attrs:
            if attr in ("href", "src") and val is not None:
                self.refs.append((line, attr, val.strip()))


def parse_alpha(alpha_str: Optional[str]) -> float:
    if alpha_str is None:
        return 1.0
    s = alpha_str.strip()
    if s.endswith("%"):
        return float(s[:-1]) / 100.0
    return float(s)


def parse_rgb_channel(tok: str) -> Optional[int]:
    s = tok.strip()
    if s.endswith("%"):
        pct = float(s[:-1])
        if pct < 0.0 or pct > 100.0:
            return None
        return max(0, min(255, int(round(pct * 2.55))))
    val = float(s)
    if val < 0.0 or val > 255.0:
        return None
    return max(0, min(255, int(round(val))))


def parse_css_angle(val_str: str, unit: Optional[str]) -> Optional[float]:
    if val_str.strip().lower() == "none":
        return None
    val = float(val_str)
    u = (unit or "deg").lower()
    if u == "rad":
        deg = math.degrees(val)
    elif u == "grad":
        deg = val * 0.9
    elif u == "turn":
        deg = val * 360.0
    else:
        deg = val
    return deg % 360.0


def _linear_srgb_to_u8(c: float) -> int:
    c = max(0.0, min(1.0, c))
    s = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1.0 / 2.4)) - 0.055
    return max(0, min(255, int(round(s * 255.0))))


def oklab_to_rgb(l_val: float, a_val: float, b_val: float) -> Tuple[int, int, int]:
    l_ = l_val + 0.3963377774 * a_val + 0.2158037573 * b_val
    m_ = l_val - 0.1055613458 * a_val - 0.0638541728 * b_val
    s_ = l_val - 0.0894841775 * a_val - 1.2914855480 * b_val
    l3, m3, s3 = l_ ** 3, m_ ** 3, s_ ** 3
    r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
    g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
    b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
    return _linear_srgb_to_u8(r_lin), _linear_srgb_to_u8(g_lin), _linear_srgb_to_u8(b_lin)


def oklch_to_rgb(l_val: float, c_val: float, h_deg: float) -> Tuple[int, int, int]:
    hr = math.radians(h_deg)
    return oklab_to_rgb(l_val, c_val * math.cos(hr), c_val * math.sin(hr))


def lab_to_rgb(l_val: float, a_val: float, b_val: float) -> Tuple[int, int, int]:
    fy = (l_val + 16.0) / 116.0
    fx = a_val / 500.0 + fy
    fz = fy - b_val / 200.0
    eps = 216.0 / 24389.0
    kappa = 24389.0 / 27.0
    xr = fx ** 3 if (fx ** 3) > eps else (116.0 * fx - 16.0) / kappa
    yr = ((l_val + 16.0) / 116.0) ** 3 if l_val > kappa * eps else l_val / kappa
    zr = fz ** 3 if (fz ** 3) > eps else (116.0 * fz - 16.0) / kappa
    x50 = xr * 0.9642956764295677
    y50 = yr * 1.0
    z50 = zr * 0.8251046025104602
    x65 = +0.9554734527042182 * x50 - 0.0230985368742614 * y50 + 0.0632593086610217 * z50
    y65 = -0.0283697069632081 * x50 + 1.0099954580058226 * y50 + 0.0210413989669430 * z50
    z65 = +0.0123140016883199 * x50 - 0.0205076964334779 * y50 + 1.3303659366080753 * z50
    r_lin = +3.2409699419045213 * x65 - 1.5373831775700935 * y65 - 0.4986107602930033 * z65
    g_lin = -0.9692436362808798 * x65 + 1.8759675015077206 * y65 + 0.0415550574071756 * z65
    b_lin = +0.0556300796969936 * x65 - 0.2039769588889766 * y65 + 1.0569715142428786 * z65
    return _linear_srgb_to_u8(r_lin), _linear_srgb_to_u8(g_lin), _linear_srgb_to_u8(b_lin)


def lch_to_rgb(l_val: float, c_val: float, h_deg: float) -> Tuple[int, int, int]:
    hr = math.radians(h_deg)
    return lab_to_rgb(l_val, c_val * math.cos(hr), c_val * math.sin(hr))


def is_pink_hsl(h_deg: float, s: float, l: float) -> bool:
    h = h_deg % 360.0
    return 295.0 <= h <= 355.0 and s >= 0.35 and l >= 0.20


def is_pink_rgb(r: int, g: int, b: int) -> Tuple[bool, str]:
    if (r, g, b) in BANNED_PINK_RGBS:
        return True, f"banned rgb({r},{g},{b})"
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    h_deg = h * 360.0
    if is_pink_hsl(h_deg, s, l):
        return True, f"pink HSL(h={h_deg:.1f}, s={s:.2f}, l={l:.2f}) from rgb({r},{g},{b})"
    return False, ""


def hex_to_rgba(hex_digits: str) -> Optional[Tuple[int, int, int, float]]:
    n = len(hex_digits)
    if n == 3:
        r, g, b = (int(c * 2, 16) for c in hex_digits)
        return r, g, b, 1.0
    if n == 4:
        r, g, b, a = (int(c * 2, 16) for c in hex_digits)
        return r, g, b, a / 255.0
    if n == 6:
        r = int(hex_digits[0:2], 16)
        g = int(hex_digits[2:4], 16)
        b = int(hex_digits[4:6], 16)
        return r, g, b, 1.0
    if n == 8:
        r = int(hex_digits[0:2], 16)
        g = int(hex_digits[2:4], 16)
        b = int(hex_digits[4:6], 16)
        a = int(hex_digits[6:8], 16) / 255.0
        return r, g, b, a
    return None


def _blank_preserving_newlines(s: str) -> str:
    return re.sub(r"[^\n]", " ", s)


def _strip_js_comments_preserving_lines(text: str) -> str:
    """Lex JS tokens (strings, templates with ${...}, regex literals, comments) and strip comments."""
    out: List[str] = []
    n = len(text)
    i = 0
    regex_allowed = True
    brace_depth = 0
    template_brace_stack: List[int] = []
    in_template = False

    while i < n:
        if in_template:
            ch = text[i]
            if ch == "\\" and i + 1 < n:
                out.append(text[i : i + 2])
                i += 2
                continue
            if ch == "$" and i + 1 < n and text[i + 1] == "{":
                out.append("${")
                template_brace_stack.append(brace_depth)
                brace_depth += 1
                in_template = False
                regex_allowed = True
                i += 2
                continue
            if ch == "`":
                out.append("`")
                in_template = False
                regex_allowed = False
                i += 1
                continue
            out.append(ch)
            i += 1
            continue

        ch = text[i]

        if ch.isspace():
            j = i + 1
            while j < n and text[j].isspace():
                j += 1
            out.append(text[i:j])
            i = j
            continue

        if ch in ('"', "'"):
            quote = ch
            j = i + 1
            while j < n:
                if text[j] == "\\" and j + 1 < n:
                    j += 2
                    continue
                if text[j] == quote:
                    j += 1
                    break
                j += 1
            out.append(text[i:j])
            i = j
            regex_allowed = False
            continue

        if ch == "`":
            out.append("`")
            in_template = True
            i += 1
            continue

        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            end = text.find("*/", i + 2)
            j = n if end == -1 else end + 2
            out.append(_blank_preserving_newlines(text[i:j]))
            i = j
            continue

        if ch == "/" and i + 1 < n and text[i + 1] == "/":
            end = text.find("\n", i + 2)
            j = n if end == -1 else end
            i = j
            continue

        if ch == "/":
            if regex_allowed:
                j = i + 1
                in_class = False
                closed = False
                while j < n:
                    c = text[j]
                    if c in ("\n", "\r"):
                        break
                    if c == "\\":
                        if j + 1 >= n or text[j + 1] in ("\n", "\r"):
                            break
                        j += 2
                        continue
                    if c == "[":
                        in_class = True
                        j += 1
                        continue
                    if c == "]":
                        in_class = False
                        j += 1
                        continue
                    if c == "/" and not in_class:
                        j += 1
                        while j < n and text[j].isalpha():
                            j += 1
                        closed = True
                        break
                    j += 1
                if closed:
                    out.append(text[i:j])
                    i = j
                    regex_allowed = False
                    continue
            out.append("/")
            i += 1
            regex_allowed = True
            continue

        if ch.isalpha() or ch in ("_", "$"):
            j = i + 1
            while j < n and (text[j].isalnum() or text[j] in ("_", "$")):
                j += 1
            ident = text[i:j]
            out.append(ident)
            regex_allowed = ident in _JS_REGEX_PREFIX_KEYWORDS
            i = j
            continue

        if ch.isdigit() or (ch == "." and i + 1 < n and text[i + 1].isdigit()):
            j = i + 1
            while j < n and (text[j].isalnum() or text[j] in (".", "_")):
                j += 1
            out.append(text[i:j])
            regex_allowed = False
            i = j
            continue

        if (ch == "+" and i + 1 < n and text[i + 1] == "+") or (ch == "-" and i + 1 < n and text[i + 1] == "-"):
            out.append(text[i : i + 2])
            regex_allowed = False
            i += 2
            continue

        if ch == "{":
            brace_depth += 1
            out.append(ch)
            regex_allowed = True
            i += 1
            continue

        if ch == "}":
            brace_depth = max(0, brace_depth - 1)
            out.append(ch)
            if template_brace_stack and brace_depth == template_brace_stack[-1]:
                template_brace_stack.pop()
                in_template = True
            else:
                regex_allowed = True
            i += 1
            continue

        if ch in (")", "]"):
            out.append(ch)
            regex_allowed = False
            i += 1
            continue

        out.append(ch)
        regex_allowed = True
        i += 1

    return "".join(out)


def strip_comments_preserving_lines(text: str, rel_path: str) -> str:
    if rel_path.endswith(".js"):
        return _strip_js_comments_preserving_lines(text)
    cleaned = _CSS_COMMENT_RE.sub(lambda m: _blank_preserving_newlines(m.group(0)), text)
    if rel_path.endswith(".html"):
        cleaned = _HTML_COMMENT_RE.sub(lambda m: _blank_preserving_newlines(m.group(0)), cleaned)
    return cleaned


def scan_text_for_pink(text: str, rel_path: str, is_data_js: bool = False) -> Tuple[List[str], List[str]]:
    """Return (hard_violations, warnings)."""
    violations: List[str] = []
    warnings: List[str] = []

    for lineno, line in enumerate(text.splitlines(), start=1):
        lower = line.lower()
        for lit in BANNED_PINK_LITERALS:
            if lit in lower:
                violations.append(f"{rel_path}:{lineno} banned literal {lit!r}")

        if "--aui-pink" in lower:
            warnings.append(f"{rel_path}:{lineno} uses '--aui-pink' token identifier")

    if is_data_js:
        return violations, warnings

    cleaned = strip_comments_preserving_lines(text, rel_path)

    def line_of(pos: int) -> int:
        return cleaned.count("\n", 0, pos) + 1

    for m in HEX_COLOR_RE.finditer(cleaned):
        rgba = hex_to_rgba(m.group(1))
        if rgba is None:
            continue
        r, g, b, a = rgba
        if a <= 0.0:
            continue
        pink, reason = is_pink_rgb(r, g, b)
        if pink:
            violations.append(f"{rel_path}:{line_of(m.start())} #{m.group(1)} ({reason})")

    for m in RGB_COLOR_RE.finditer(cleaned):
        r = parse_rgb_channel(m.group(1))
        g = parse_rgb_channel(m.group(2))
        b = parse_rgb_channel(m.group(3))
        if r is None or g is None or b is None:
            continue
        a = parse_alpha(m.group(4))
        if a <= 0.0:
            continue
        pink, reason = is_pink_rgb(r, g, b)
        if pink:
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} ({reason})")

    for m in HSL_COLOR_RE.finditer(cleaned):
        h_deg = parse_css_angle(m.group(1), m.group(2))
        if h_deg is None:
            continue
        s = float(m.group(3)) / 100.0
        l = float(m.group(4)) / 100.0
        a = parse_alpha(m.group(5))
        if a <= 0.0:
            continue
        if is_pink_hsl(h_deg, s, l):
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} (pink HSL)")

    for m in OKLCH_COLOR_RE.finditer(cleaned):
        a = parse_alpha(m.group(5))
        if a <= 0.0:
            continue
        l_tok, c_tok = m.group(1), m.group(2)
        l_val = float(l_tok[:-1]) / 100.0 if l_tok.endswith("%") else float(l_tok)
        c_val = float(c_tok[:-1]) / 100.0 * 0.4 if c_tok.endswith("%") else float(c_tok)
        h_deg = parse_css_angle(m.group(3), m.group(4))
        if h_deg is None:
            continue
        r, g, b = oklch_to_rgb(l_val, c_val, h_deg)
        pink, reason = is_pink_rgb(r, g, b)
        if pink or (c_val >= 0.08 and l_val >= 0.25 and 310.0 <= h_deg <= 360.0):
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} ({reason or 'pink OKLCH'})")

    for m in LCH_COLOR_RE.finditer(cleaned):
        a = parse_alpha(m.group(5))
        if a <= 0.0:
            continue
        l_tok, c_tok = m.group(1), m.group(2)
        l_val = float(l_tok[:-1]) if l_tok.endswith("%") else float(l_tok)
        c_val = float(c_tok[:-1]) * 1.5 if c_tok.endswith("%") else float(c_tok)
        h_deg = parse_css_angle(m.group(3), m.group(4))
        if h_deg is None:
            continue
        r, g, b = lch_to_rgb(l_val, c_val, h_deg)
        pink, reason = is_pink_rgb(r, g, b)
        if pink or (c_val >= 25.0 and l_val >= 25.0 and 315.0 <= h_deg <= 360.0):
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} ({reason or 'pink LCH'})")

    for m in OKLAB_COLOR_RE.finditer(cleaned):
        a_alpha = parse_alpha(m.group(4))
        if a_alpha <= 0.0:
            continue
        l_tok, a_tok, b_tok = m.group(1), m.group(2), m.group(3)
        l_val = float(l_tok[:-1]) / 100.0 if l_tok.endswith("%") else float(l_tok)
        a_val = float(a_tok[:-1]) / 100.0 * 0.4 if a_tok.endswith("%") else float(a_tok)
        b_val = float(b_tok[:-1]) / 100.0 * 0.4 if b_tok.endswith("%") else float(b_tok)
        r, g, b = oklab_to_rgb(l_val, a_val, b_val)
        pink, reason = is_pink_rgb(r, g, b)
        if pink:
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} ({reason})")

    for m in LAB_COLOR_RE.finditer(cleaned):
        a_alpha = parse_alpha(m.group(4))
        if a_alpha <= 0.0:
            continue
        l_tok, a_tok, b_tok = m.group(1), m.group(2), m.group(3)
        l_val = float(l_tok[:-1]) if l_tok.endswith("%") else float(l_tok)
        a_val = float(a_tok[:-1]) * 1.25 if a_tok.endswith("%") else float(a_tok)
        b_val = float(b_tok[:-1]) * 1.25 if b_tok.endswith("%") else float(b_tok)
        r, g, b = lab_to_rgb(l_val, a_val, b_val)
        pink, reason = is_pink_rgb(r, g, b)
        if pink:
            violations.append(f"{rel_path}:{line_of(m.start())} {m.group(0)} ({reason})")

    if rel_path.endswith(".css"):
        for m_named in CSS_NAMED_PINK_RE.finditer(cleaned):
            violations.append(f"{rel_path}:{line_of(m_named.start())} named pink CSS color {m_named.group(1)!r}")
    elif rel_path.endswith(".html"):
        for style_m in _HTML_STYLE_TAG_RE.finditer(cleaned):
            block = style_m.group(1)
            base_offset = style_m.start(1)
            for m_named in CSS_NAMED_PINK_RE.finditer(block):
                violations.append(
                    f"{rel_path}:{line_of(base_offset + m_named.start())} named pink CSS color {m_named.group(1)!r}"
                )
        for attr_m in _HTML_STYLE_ATTR_RE.finditer(cleaned):
            grp_idx = 1 if attr_m.group(1) is not None else 2
            val_str = attr_m.group(grp_idx) or ""
            base_offset = attr_m.start(grp_idx)
            for m_named in CSS_NAMED_PINK_RE.finditer(":" + val_str):
                violations.append(
                    f"{rel_path}:{line_of(base_offset + max(0, m_named.start() - 1))} named pink CSS color {m_named.group(1)!r}"
                )
    else:
        for m_named in CSS_NAMED_PINK_RE.finditer(cleaned):
            ctx_start = max(0, cleaned.rfind("\n", 0, max(0, m_named.start() - 240)))
            ctx = cleaned[ctx_start:m_named.end()].lower()
            if "style" in ctx:
                violations.append(f"{rel_path}:{line_of(m_named.start())} named pink CSS color {m_named.group(1)!r}")

    return violations, warnings


def iter_repo_files(root: Path, extensions: Tuple[str, ...]) -> List[Path]:
    files: List[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in EXCLUDED_DIRS)
        for fname in sorted(filenames):
            if fname.endswith(extensions):
                files.append(Path(dirpath) / fname)
    return files


def route_present(root: Path, route: str) -> bool:
    if route == "":
        return (root / "index.html").is_file()
    return (root / route.rstrip("/") / "index.html").is_file()


def navigate_route(page: Page, monitor: PageMonitor, url: str) -> int:
    monitor.reset()
    resp = page.goto(url, wait_until="domcontentloaded")
    status = resp.status if resp is not None else 0
    page.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
    page.wait_for_timeout(180)
    return status


def check_computed_styles_no_pink(page: Page, route_label: str) -> None:
    hits = page.evaluate(
        """() => {
            const props = [
                'color', 'backgroundColor',
                'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
                'outlineColor', 'backgroundImage', 'boxShadow', 'fill', 'stroke'
            ];
            const banned = [[221,6,116], [238,62,158], [244,114,182], [253,242,248]];
            const rgbRe = /^rgba?\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})(?:\\s*,\\s*([0-9.]+))?\\s*\\)$/i;
            const fnStartRe = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\\(/gi;

            const probeCv = document.createElement('canvas');
            probeCv.width = 1;
            probeCv.height = 1;
            const probeCtx = probeCv.getContext('2d', { willReadFrequently: true });

            function rgbToHsl(r, g, b) {
                r /= 255; g /= 255; b /= 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0;
                const l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h *= 60;
                }
                return [h, s, l];
            }

            function isPink(r, g, b) {
                for (const [br, bg, bb] of banned) {
                    if (r === br && g === bg && b === bb) return true;
                }
                const [h, s, l] = rgbToHsl(r, g, b);
                return h >= 295 && h <= 355 && s >= 0.35 && l >= 0.20;
            }

            function extractColorTokens(val) {
                const out = [];
                fnStartRe.lastIndex = 0;
                let m;
                while ((m = fnStartRe.exec(val)) !== null) {
                    const start = m.index;
                    let depth = 0;
                    let end = -1;
                    for (let i = start; i < val.length; i++) {
                        if (val[i] === '(') depth++;
                        else if (val[i] === ')') {
                            depth--;
                            if (depth === 0) { end = i + 1; break; }
                        }
                    }
                    if (end > start) out.push(val.slice(start, end));
                }
                return out;
            }

            function resolveTokenToRgb(token) {
                const fast = rgbRe.exec(token.trim());
                if (fast) {
                    const a = fast[4] === undefined ? 1 : Number(fast[4]);
                    if (a === 0) return null;
                    return [Number(fast[1]), Number(fast[2]), Number(fast[3])];
                }
                probeCtx.clearRect(0, 0, 1, 1);
                probeCtx.fillStyle = 'rgba(0, 0, 0, 0)';
                probeCtx.fillStyle = token;
                probeCtx.fillRect(0, 0, 1, 1);
                const px = probeCtx.getImageData(0, 0, 1, 1).data;
                if (px[3] === 0) return null;
                if (px[3] < 255) {
                    const stripped = token.replace(/\\s*\\/\\s*[^)]+\\)$/, ')');
                    if (stripped !== token) {
                        probeCtx.clearRect(0, 0, 1, 1);
                        probeCtx.fillStyle = 'rgba(0, 0, 0, 0)';
                        probeCtx.fillStyle = stripped;
                        probeCtx.fillRect(0, 0, 1, 1);
                        const pxOpaque = probeCtx.getImageData(0, 0, 1, 1).data;
                        if (pxOpaque[3] > 0) return [pxOpaque[0], pxOpaque[1], pxOpaque[2]];
                    }
                    return [
                        Math.min(255, Math.round((px[0] * 255) / px[3])),
                        Math.min(255, Math.round((px[1] * 255) / px[3])),
                        Math.min(255, Math.round((px[2] * 255) / px[3])),
                    ];
                }
                return [px[0], px[1], px[2]];
            }

            function valueHasPink(v) {
                const tokens = extractColorTokens(v);
                if (tokens.length === 0) {
                    const rgb = resolveTokenToRgb(v);
                    return Boolean(rgb && isPink(rgb[0], rgb[1], rgb[2]));
                }
                for (const tok of tokens) {
                    const rgb = resolveTokenToRgb(tok);
                    if (rgb && isPink(rgb[0], rgb[1], rgb[2])) return true;
                }
                return false;
            }

            const found = [];
            const pseudos = [null, '::before', '::after'];
            for (const el of document.querySelectorAll('*')) {
                for (const pseudo of pseudos) {
                    const cs = pseudo ? getComputedStyle(el, pseudo) : getComputedStyle(el);
                    if (pseudo && cs.content === 'none') continue;
                    for (const p of props) {
                        const v = cs[p];
                        if (!v || v === 'none' || v === 'transparent') continue;
                        if (valueHasPink(v)) {
                            found.push({
                                tag: el.tagName + (pseudo || ''),
                                id: el.id || '',
                                cls: typeof el.className === 'string' ? el.className : '',
                                prop: p,
                                val: v
                            });
                            if (found.length >= 10) return found;
                        }
                    }
                }
            }
            return found;
        }"""
    )
    if hits:
        sample = "; ".join(f"{h['tag']}#{h['id']}.{h['cls']}[{h['prop']}]={h['val']}" for h in hits[:3])
        raise AssertionError(f"Computed pink styles on {route_label}: {sample}")


# ---------------------------------------------------------------------------
# Static & Repository Checks (ST-01 .. ST-07)
# ---------------------------------------------------------------------------

def run_static_checks(
    runner: SuiteRunner,
    root: Path,
    base_url: Optional[str],
    skip_missing_routes: bool,
) -> None:
    # ST-01: node --check on every .js file
    def st_01() -> str:
        js_files = iter_repo_files(root, (".js",))
        if not js_files:
            raise AssertionError(f"No .js files found under {root}")
        failures: List[str] = []
        for js in js_files:
            proc = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
            if proc.returncode != 0:
                rel = js.relative_to(root)
                failures.append(f"{rel}: {(proc.stderr or proc.stdout).strip()}")
        if failures:
            raise AssertionError("; ".join(failures[:5]))
        return f"node --check passed on {len(js_files)} JS files"

    runner.record("Static", "ST-01", st_01)

    # ST-02: Zero-pink source scan across .html, .css, .js
    def st_02() -> str:
        files = iter_repo_files(root, (".html", ".css", ".js"))
        all_violations: List[str] = []
        all_warnings: List[str] = []
        for f in files:
            rel = str(f.relative_to(root))
            is_data = rel in ("survey/data.js", "survey/extra_refs.js")
            v, w = scan_text_for_pink(f.read_text(encoding="utf-8", errors="replace"), rel, is_data_js=is_data)
            all_violations.extend(v)
            all_warnings.extend(w)
        if all_warnings:
            runner.warn("Static", "ST-02-WARN", f"{len(all_warnings)} '--aui-pink' CSS token name(s), e.g. {all_warnings[0]}")
        if all_violations:
            raise AssertionError(f"{len(all_violations)} pink color violation(s): {'; '.join(all_violations[:5])}")
        return f"0 pink color literals across {len(files)} source files"

    runner.record("Static", "ST-02", st_02)

    # ST-03: Relative intra-site links & local resolution (disk + HTTP 200)
    def st_03() -> str:
        html_targets = ["index.html", "survey/index.html", "arena/index.html", "method/index.html"]
        checked_refs = 0
        errors: List[str] = []
        shell_js = root / "shared/shell.js"
        if shell_js.is_file():
            shell_txt = shell_js.read_text(encoding="utf-8")
            if re.search(r"href\s*:\s*['\"`]/", shell_txt) or re.search(r"href\s*=\s*['\"`]/", shell_txt):
                errors.append("shared/shell.js uses root-absolute route href instead of ${basePrefix}/...")
            if "${basePrefix}/" not in shell_txt:
                errors.append("shared/shell.js missing ${basePrefix}/ relative route prefix")

        for rel_html in html_targets:
            html_path = root / rel_html
            if not html_path.is_file():
                continue
            parser = LinkParser()
            parser.feed(html_path.read_text(encoding="utf-8", errors="replace"))
            route_dir = "" if rel_html == "index.html" else rel_html.rsplit("/", 1)[0] + "/"
            for lineno, attr, val in parser.refs:
                if not val or val.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
                    continue
                if val.startswith(("http://", "https://")):
                    if "michaelcao0.github.io/program-world-models.github.io" in val:
                        errors.append(f"{rel_html}:{lineno} {attr}={val!r} hardcodes GitHub Pages URL for intra-site link")
                    parsed = urlparse(val)
                    if not parsed.scheme or not parsed.netloc:
                        errors.append(f"{rel_html}:{lineno} malformed external URL {val!r}")
                    checked_refs += 1
                    continue
                if val.startswith("//"):
                    errors.append(f"{rel_html}:{lineno} protocol-relative URL {val!r}")
                    continue
                if val.startswith("/"):
                    errors.append(f"{rel_html}:{lineno} root-absolute intra-site {attr}={val!r}")
                    continue

                clean_ref = val.split("#", 1)[0].split("?", 1)[0]
                if not clean_ref:
                    continue
                root_abs = os.path.abspath(str(root))
                target_abs = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(str(html_path))), clean_ref))
                try:
                    rel_str = os.path.relpath(target_abs, root_abs)
                except ValueError:
                    errors.append(f"{rel_html}:{lineno} escapes root: {val!r}")
                    continue
                if rel_str == ".." or rel_str.startswith(".." + os.sep) or os.path.isabs(rel_str):
                    errors.append(f"{rel_html}:{lineno} escapes root: {val!r}")
                    continue
                rel_to_root = Path(rel_str)
                target_disk = Path(target_abs)

                is_subpage_route = clean_ref.rstrip("/").endswith(("survey", "arena", "method")) or clean_ref in ("./survey/", "../survey/", "./arena/", "../arena/", "./method/", "../method/")
                target_exists = target_disk.is_file() or (target_disk.is_dir() and (target_disk / "index.html").is_file())
                if not target_exists:
                    if skip_missing_routes and is_subpage_route:
                        continue
                    errors.append(f"{rel_html}:{lineno} missing local target {val!r} (resolved {rel_to_root})")
                    continue

                if base_url is not None:
                    url_rel = str(rel_to_root).replace(os.sep, "/")
                    if target_disk.is_dir() and not url_rel.endswith("/"):
                        url_rel += "/"
                    if url_rel == ".":
                        url_rel = ""
                    req_url = f"{base_url.rstrip('/')}/{url_rel}"
                    try:
                        with urlopen(Request(req_url, method="GET"), timeout=5) as resp:
                            if resp.status != 200:
                                errors.append(f"{rel_html}:{lineno} HTTP {resp.status} for {req_url}")
                    except Exception as exc:
                        errors.append(f"{rel_html}:{lineno} HTTP fetch failed for {req_url}: {exc}")
                checked_refs += 1

        if errors:
            raise AssertionError("; ".join(errors[:5]))
        return f"verified {checked_refs} relative/external refs + shared/shell.js routes"

    runner.record("Static", "ST-03", st_03)

    # ST-04: Upstream Awesome-Code-World-Model repo clean status
    def st_04() -> str:
        candidates = [
            Path("/Users/michaelcao/Documents/cwm/Awesome-Code-World-Model"),
            root.parent / "Awesome-Code-World-Model",
        ]
        upstream = next((p for p in candidates if (p / ".git").exists()), None)
        if upstream is None:
            raise SkipCheck("Awesome-Code-World-Model checkout not found beside workspace")
        proc = subprocess.run(["git", "-C", str(upstream), "status", "--short"], capture_output=True, text=True)
        if proc.returncode != 0:
            raise AssertionError(f"git status failed: {proc.stderr.strip()}")
        if proc.stdout.strip():
            raise AssertionError(f"Upstream repo dirty: {proc.stdout.strip()}")
        return f"{upstream} git working tree clean"

    runner.record("Static", "ST-04", st_04)

    # ST-05: .github/workflows/pages.yml YAML + triggers + sync_survey_data.py --remote ordering
    def st_05() -> str:
        wf = root / ".github/workflows/pages.yml"
        if not wf.is_file():
            raise AssertionError("Missing .github/workflows/pages.yml")
        if yaml is None:
            raise AssertionError("PyYAML not installed; cannot parse pages.yml")
        data = yaml.safe_load(wf.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise AssertionError("pages.yml did not parse into a YAML mapping")
        triggers = data.get("on") if "on" in data else data.get(True)
        if not isinstance(triggers, dict):
            raise AssertionError("pages.yml missing 'on:' triggers mapping")
        if "workflow_dispatch" not in triggers:
            raise AssertionError("pages.yml missing 'workflow_dispatch' trigger")
        sched = triggers.get("schedule")
        if not isinstance(sched, list) or not any(isinstance(item, dict) and item.get("cron") for item in sched):
            raise AssertionError("pages.yml missing 'schedule' cron trigger")

        jobs = data.get("jobs") or {}
        build_job = jobs.get("build") or {}
        steps = build_job.get("steps") or []
        setup_py_idx = -1
        sync_idx = -1
        upload_idx = -1
        for idx, step in enumerate(steps):
            if not isinstance(step, dict):
                continue
            uses = str(step.get("uses", ""))
            run_cmd = str(step.get("run", ""))
            active_lines: List[str] = []
            for raw_line in run_cmd.splitlines():
                cleaned_line = re.sub(r"(?:^|\s)#.*$", "", raw_line).strip()
                if cleaned_line:
                    active_lines.append(cleaned_line)
            active_cmd = "\n".join(active_lines)
            if "actions/setup-python" in uses:
                setup_py_idx = idx
            if "sync_survey_data.py" in active_cmd and "--remote" in active_cmd:
                sync_idx = idx
            if "actions/upload-pages-artifact" in uses:
                upload_idx = idx

        if setup_py_idx < 0:
            raise AssertionError("pages.yml build job missing actions/setup-python")
        if sync_idx < 0:
            raise AssertionError("pages.yml build job missing 'sync_survey_data.py --remote'")
        if upload_idx < 0:
            raise AssertionError("pages.yml build job missing actions/upload-pages-artifact")
        if not (setup_py_idx < sync_idx < upload_idx):
            raise AssertionError(
                f"pages.yml step ordering invalid: setup-python={setup_py_idx}, sync={sync_idx}, upload={upload_idx}"
            )
        return "pages.yml valid YAML with schedule, workflow_dispatch, setup-python -> sync --remote -> upload"

    runner.record("Static", "ST-05", st_05)

    # ST-06: README.md documents main site and all 3 subpages
    def st_06() -> str:
        readme = root / "README.md"
        if not readme.is_file():
            raise AssertionError("Missing README.md")
        txt = readme.read_text(encoding="utf-8", errors="replace")
        required = [
            ("root `/`", bool(re.search(r"(\/`|index\.html|Overview)", txt, re.I))),
            ("`/survey/`", bool(re.search(r"/?survey/", txt, re.I))),
            ("`/arena/`", bool(re.search(r"/?arena/", txt, re.I))),
            ("`/method/`", bool(re.search(r"/?method/", txt, re.I))),
        ]
        missing = [label for label, ok in required if not ok]
        if missing:
            raise AssertionError(f"README.md missing documentation for: {', '.join(missing)}")
        return "README.md documents root `/`, `/survey/`, `/arena/`, and `/method/`"

    runner.record("Static", "ST-06", st_06)

    # ST-07: Required route files exist
    def st_07() -> str:
        missing_required: List[str] = []
        skipped_routes: List[str] = []
        for route, files in ROUTE_REQUIRED_FILES.items():
            route_missing = [f for f in files if not (root / f).is_file()]
            if route_missing:
                if skip_missing_routes and route != "":
                    skipped_routes.append(f"{route} ({', '.join(route_missing)})")
                else:
                    missing_required.extend(route_missing)
        if missing_required:
            raise AssertionError(f"Missing required files: {', '.join(missing_required)}")
        if skipped_routes:
            raise SkipCheck(f"Root files present; skipped unbuilt subpages: {'; '.join(skipped_routes)}")
        total_files = sum(len(v) for v in ROUTE_REQUIRED_FILES.values())
        return f"all {total_files} required route & shared files exist"

    runner.record("Static", "ST-07", st_07)


# ---------------------------------------------------------------------------
# Helpers for Resilient Opaque-Box Checks
# ---------------------------------------------------------------------------

def require_route_available(root: Optional[Path], route: str, skip_missing_routes: bool) -> None:
    if root is not None and not route_present(root, route):
        msg = f"Route '/{route}' does not exist under {root}"
        if skip_missing_routes and route != "":
            raise SkipCheck(msg)
        raise AssertionError(msg)


def first_matching_locator(page: Page, selectors: Sequence[str], require_visible: bool = True) -> Optional[Any]:
    for sel in selectors:
        loc = page.locator(sel)
        count = loc.count()
        for idx in range(count):
            item = loc.nth(idx)
            if not require_visible or item.is_visible():
                return item
    return None


def find_visible_text_control(
    page: Page,
    pattern: str,
    roles: Sequence[str] = ("tab", "button", "link", "radio"),
) -> Optional[Any]:
    rx = re.compile(pattern, re.IGNORECASE)
    for role in roles:
        loc = page.get_by_role(role, name=rx)
        for idx in range(loc.count()):
            cand = loc.nth(idx)
            if cand.is_visible():
                return cand
    fallback_parts: List[str] = []
    if "button" in roles:
        fallback_parts.extend(["button", "[role='button']", "[data-archetype]", "[data-scenario]", "[data-mode]"])
    if "tab" in roles:
        fallback_parts.append("[role='tab']")
    if "link" in roles:
        fallback_parts.append("a[href]")
    if "radio" in roles:
        fallback_parts.extend(["[role='radio']", "input[type='radio']"])
    if not fallback_parts:
        return None
    loc = page.locator(", ".join(fallback_parts)).filter(has_text=rx)
    for idx in range(loc.count()):
        cand = loc.nth(idx)
        if cand.is_visible():
            return cand
    return None


def find_json_state_locator(page: Page) -> Optional[Any]:
    loc = first_matching_locator(
        page,
        [
            "#method-json-state",
            "#sim-json-state",
            "pre[aria-label*='JSON' i]",
            "pre.json-box",
            "[id*='json' i]",
            "[class*='json' i]",
        ],
    )
    if loc is not None:
        return loc
    pres = page.locator("pre, code")
    for idx in range(pres.count()):
        cand = pres.nth(idx)
        if cand.is_visible():
            txt = cand.inner_text().strip()
            if txt.startswith("{") and '"' in txt:
                return cand
    return None


def find_trace_locator(page: Page) -> Optional[Any]:
    return first_matching_locator(
        page,
        [
            "#method-trace-list",
            "#sim-trace-list",
            "[aria-label*='trace' i]",
            "[id*='trace' i]",
            "[class*='trace' i]",
            "[id*='waterfall' i]",
            "[class*='waterfall' i]",
        ],
    )


def body_luminance(page: Page) -> float:
    return float(
        page.evaluate(
            """() => {
                const bg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
                const m = bg.match(/\\d+/g);
                if (!m || m.length < 3) return 1.0;
                const [r, g, b] = m.slice(0, 3).map(Number);
                return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;
            }"""
        )
    )


# ---------------------------------------------------------------------------
# Tier 1: Core Feature Coverage (T1-00 .. T1-09)
# ---------------------------------------------------------------------------

def run_tier1(
    runner: SuiteRunner,
    context: Any,
    base_url: str,
    root: Optional[Path],
    skip_missing_routes: bool,
) -> None:
    page = context.new_page()
    monitor = PageMonitor(page, base_url)
    try:
        # T1-00: Shell mount, route metadata, 0 errors, computed-style zero-pink (Light & Dark) across all 4 routes
        def t1_00() -> str:
            verified_routes: List[str] = []
            skipped_routes: List[str] = []
            for route, (expected_page, expected_base) in ROUTE_PAGE_IDS.items():
                if root is not None and not route_present(root, route):
                    if skip_missing_routes and route != "":
                        skipped_routes.append("/" + route)
                        continue
                    raise AssertionError(f"Missing route '/{route}' on disk")

                url = f"{base_url}/{route}"
                status = navigate_route(page, monitor, url)
                if status != 200:
                    raise AssertionError(f"GET /{route} returned HTTP {status}")
                monitor.assert_clean(f"/{route}")

                actual_page = page.locator("body").get_attribute("data-pwm-page")
                actual_base = page.locator("body").get_attribute("data-pwm-base")
                if actual_page != expected_page:
                    raise AssertionError(f"/{route} body[data-pwm-page]={actual_page!r}, expected {expected_page!r}")
                if actual_base != expected_base:
                    raise AssertionError(f"/{route} body[data-pwm-base]={actual_base!r}, expected {expected_base!r}")

                if page.locator("#pwm-shell-header *").count() < 5:
                    raise AssertionError(f"/{route} #pwm-shell-header not mounted")
                if page.locator("#pwm-shell-subnav *").count() < 5:
                    raise AssertionError(f"/{route} #pwm-shell-subnav not mounted")
                if page.locator(".pwm-route-link[data-route-id]").count() != 4:
                    raise AssertionError(f"/{route} expected 4 .pwm-route-link items")
                if page.locator(".pwm-subnav-card").count() != 4:
                    raise AssertionError(f"/{route} expected 4 .pwm-subnav-card items")
                active_route = page.locator(".pwm-route-link.is-active").get_attribute("data-route-id")
                if active_route != expected_page:
                    raise AssertionError(f"/{route} active nav route={active_route!r}, expected {expected_page!r}")

                shell_ok = page.evaluate(
                    """() => Boolean(
                        window.PWM_SHELL &&
                        typeof window.PWM_SHELL.lang === 'string' &&
                        typeof window.PWM_SHELL.theme === 'string' &&
                        typeof window.PWM_SHELL.setLang === 'function' &&
                        typeof window.PWM_SHELL.setTheme === 'function' &&
                        typeof window.PWM_SHELL.onChange === 'function'
                    )"""
                )
                if not shell_ok:
                    raise AssertionError(f"/{route} window.PWM_SHELL API incomplete")

                bad_dom_refs = page.evaluate(
                    """() => {
                        const bad = [];
                        for (const el of document.querySelectorAll('a[href], link[href], script[src]')) {
                            const attr = el.tagName === 'SCRIPT' ? 'src' : 'href';
                            const raw = (el.getAttribute(attr) || '').trim();
                            if (raw.startsWith('/') || raw.startsWith('//')) {
                                bad.push(`${el.tagName}[${attr}=${raw}]`);
                            }
                        }
                        return bad;
                    }"""
                )
                if bad_dom_refs:
                    raise AssertionError(
                        f"/{route} rendered root-absolute/protocol-relative DOM refs: {', '.join(bad_dom_refs[:5])}"
                    )

                # Computed-style zero-pink scan in Light & Dark modes
                page.locator("#pwmThemeLight").click()
                page.wait_for_timeout(120)
                check_computed_styles_no_pink(page, f"/{route} [light]")

                page.locator("#pwmThemeDark").click()
                page.wait_for_timeout(120)
                check_computed_styles_no_pink(page, f"/{route} [dark]")

                page.locator("#pwmThemeLight").click()
                page.wait_for_timeout(80)
                monitor.assert_clean(f"/{route} after theme toggle")
                verified_routes.append("/" + route)

            if skipped_routes and not verified_routes:
                raise SkipCheck(f"No routes available ({', '.join(skipped_routes)})")
            note = f"verified {', '.join(verified_routes)}"
            if skipped_routes:
                note += f" (skipped missing: {', '.join(skipped_routes)})"
            return note

        runner.record("Tier 1", "T1-00", t1_00)

        # T1-01: Root / Overview interactive behavior
        def t1_01() -> str:
            require_route_available(root, "", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/")
            assert page.locator("h1").first.is_visible(), "Hero h1 not visible"
            for href in ("./survey/", "./arena/", "./method/"):
                assert page.locator(f'.work-card a[href="{href}"]').count() >= 1, f"Missing work card link {href}"

            # Filter tabs in #work
            page.locator('.lp-tab[data-filter="benchmark"]').click()
            visible_cards = page.locator(".work-card:not([hidden])").count()
            assert visible_cards == 1, f"Expected 1 visible work card under benchmark filter, got {visible_cards}"
            page.locator('.lp-tab[data-filter="all"]').click()
            assert page.locator(".work-card:not([hidden])").count() == 3, "Filter reset did not restore 3 work cards"

            # L0-L4 spectrum #frame + WAI-ARIA tablist keyboard navigation
            page.locator('.spec-card[data-level="L0"]').focus()
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(80)
            focused_lvl = page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-level')")
            assert focused_lvl == "L1", f"ArrowRight on L0 did not move focus to L1 (got {focused_lvl!r})"
            assert page.locator('.spec-card[data-level="L1"]').get_attribute("aria-selected") == "true", "ArrowRight did not select L1"
            page.locator('.spec-card[data-level="L3"]').click()
            spec_title = page.locator("#spec-detail-title").inner_text()
            assert "Hybrid" in spec_title or "混合" in spec_title, f"Unexpected L3 spec title: {spec_title!r}"
            atlas_href = page.locator("#spec-atlas-link").get_attribute("href")
            assert atlas_href == "./survey/?layer=L3#paradigms", f"Unexpected #spec-atlas-link href: {atlas_href!r}"

            # #inspector loop + arena mode
            page.locator('.screen-tab[data-screen="arena"]').click()
            page.locator('.arena-mode-btn[data-arena-mode="edited"]').click()
            branch_status = page.locator("#arena-branch-status").inner_text()
            assert "Branch A" in branch_status or "Edit" in branch_status or "修改" in branch_status, (
                f"Arena branch status did not update: {branch_status!r}"
            )
            page.locator('.screen-tab[data-screen="loop"]').click()
            page.locator('.sim-action-btn[data-sim-action="take_key"]').click()
            page.locator('.sim-action-btn[data-sim-action="unlock_door"]').click()
            tick_txt = page.locator("#sim-tick").inner_text()
            json_txt = page.locator("#sim-json-state").inner_text()
            assert "02" in tick_txt, f"Expected tick 02, got {tick_txt!r}"
            assert '"has_key": true' in json_txt and '"door_open": true' in json_txt, (
                f"Unexpected #sim-json-state: {json_txt!r}"
            )
            assert page.locator("#sim-trace-list .trace-entry").count() >= 2, "Expected trace entries"

            # Before/after split slider #ba-range
            page.locator("#ba-range").fill("75")
            page.locator("#ba-range").dispatch_event("input")
            split_val = page.locator("#ba-stage").evaluate("el => el.style.getPropertyValue('--split')")
            assert split_val.strip() == "75%", f"Expected --split 75%, got {split_val!r}"
            monitor.assert_clean("T1-01")
            return "hero, work filter, L3 spectrum link, tablist keyboard, world.step loop, arena mode, and slider verified"

        runner.record("Tier 1", "T1-01", t1_01)

        # T1-02: /survey/ shell integration, #pwmExtraNavSlot, duplicate nav removal, 170 papers
        def t1_02() -> str:
            require_route_available(root, "survey/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/survey/")
            assert page.locator("#pwmExtraNavSlot #openCmdBtn").is_visible(), "#openCmdBtn not visible in #pwmExtraNavSlot"
            assert page.locator("#pwmExtraNavSlot #styleToggleBtn").is_visible(), "#styleToggleBtn not visible in #pwmExtraNavSlot"
            assert page.locator("header.navbar").count() == 0, "Duplicate upstream header.navbar still present"
            assert page.locator("#promoBar").count() == 0, "Duplicate upstream #promoBar still present"
            cwm_meta = page.evaluate("() => window.CWM_DATA ? { n: (window.CWM_DATA.papers || []).length, total: window.CWM_DATA.total_sources } : null")
            assert cwm_meta and cwm_meta["n"] == cwm_meta["total"] and cwm_meta["total"] >= 170, f"Unexpected window.CWM_DATA count: {cwm_meta}"
            total_papers = cwm_meta["total"]
            stat_total = page.locator("#statTotal").inner_text().strip()
            assert str(total_papers) in stat_total, f"Expected #statTotal to show {total_papers}, got {stat_total!r}"
            monitor.assert_clean("T1-02")
            return f"#pwmExtraNavSlot (#openCmdBtn + #styleToggleBtn), single header, and {total_papers} papers verified"

        runner.record("Tier 1", "T1-02", t1_02)

        # T1-03: /survey/ #atlasField canvas pixel variance & interactive controls
        def t1_03() -> str:
            require_route_available(root, "survey/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/survey/")
            canvas = page.locator("#atlasField")
            box = canvas.bounding_box()
            assert box is not None and box["width"] > 200 and box["height"] > 150, f"Invalid #atlasField box: {box}"

            def atlas_sig() -> Dict[str, Any]:
                return page.evaluate(
                    """() => {
                        const cv = document.getElementById('atlasField');
                        const yearEl = document.getElementById('atlasYearWatermark');
                        const year = yearEl ? yearEl.textContent.trim() : '';
                        if (!cv || !cv.width || !cv.height) return {w:0, h:0, nonZero:0, colors:0, hash:'0', year};
                        const ctx = cv.getContext('2d', { willReadFrequently: true });
                        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
                        const seen = new Set();
                        let nonZero = 0;
                        let h1 = 2166136261 >>> 0;
                        for (let i = 0; i < data.length; i += 8) {
                            const a = data[i + 3];
                            if (a > 12) {
                                nonZero++;
                                if (seen.size < 64) {
                                    seen.add((data[i] >> 3) + ',' + (data[i+1] >> 3) + ',' + (data[i+2] >> 3));
                                }
                            }
                            h1 = Math.imul(h1 ^ data[i] ^ (data[i+1] << 1) ^ (data[i+2] << 2) ^ (a << 3), 16777619) >>> 0;
                        }
                        return {w: cv.width, h: cv.height, nonZero, colors: seen.size, hash: h1.toString(16), year};
                    }"""
                )

            def is_btn_active(sel: str) -> bool:
                return bool(
                    page.evaluate(
                        """(s) => {
                            const el = document.querySelector(s);
                            if (!el) return false;
                            return el.classList.contains('active') || el.classList.contains('is-active') ||
                                el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true';
                        }""",
                        sel,
                    )
                )

            stats: Dict[str, Any] = {}
            deadline = time.monotonic() + 6.0
            while time.monotonic() < deadline:
                stats = atlas_sig()
                if stats.get("nonZero", 0) > 100 and stats.get("colors", 0) >= 3 and stats.get("year") == "2026":
                    break
                page.wait_for_timeout(150)

            assert stats.get("nonZero", 0) > 100 and stats.get("colors", 0) >= 3, f"#atlasField looks blank: {stats}"
            assert stats.get("year") == "2026", f"#atlasField sweep did not complete to 2026 (got {stats.get('year')!r})"

            before_sig = atlas_sig()
            page.locator("#atlasModeParadigm").click()
            page.wait_for_timeout(350)
            assert is_btn_active("#atlasModeParadigm") and not is_btn_active("#atlasModeFamily"), (
                "#atlasModeParadigm did not switch active button state"
            )
            paradigm_sig = atlas_sig()
            assert paradigm_sig["hash"] != before_sig["hash"] or paradigm_sig["nonZero"] != before_sig["nonZero"], (
                "Clicking #atlasModeParadigm did not change #atlasField canvas pixels"
            )

            page.locator("#atlasModeFamily").click()
            page.wait_for_timeout(450)
            assert is_btn_active("#atlasModeFamily") and not is_btn_active("#atlasModeParadigm"), (
                "#atlasModeFamily did not restore active button state"
            )
            family_sig = atlas_sig()
            assert family_sig["hash"] != paradigm_sig["hash"] or family_sig["nonZero"] != paradigm_sig["nonZero"], (
                "Clicking #atlasModeFamily did not update #atlasField canvas pixels"
            )

            # Hover a rendered dot to verify #atlasTip.visible, then click dot to open #paperDialog
            dot_candidates = page.evaluate(
                """() => {
                    const cv = document.getElementById('atlasField');
                    const rect = cv.getBoundingClientRect();
                    const ctx = cv.getContext('2d', { willReadFrequently: true });
                    const dpr = cv.width / Math.max(1, rect.width);
                    const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
                    const pts = [];
                    const xStart = Math.floor(rect.width * 0.56);
                    const xEnd = Math.floor(rect.width * 0.94);
                    const yStart = Math.floor(rect.height * 0.22);
                    const yEnd = Math.floor(rect.height * 0.86);
                    for (let py = yStart; py < yEnd; py += 5) {
                        for (let px = xStart; px < xEnd; px += 5) {
                            const ix = Math.min(cv.width - 1, Math.round(px * dpr));
                            const iy = Math.min(cv.height - 1, Math.round(py * dpr));
                            const idx = (iy * cv.width + ix) * 4;
                            const r = img[idx], g = img[idx + 1], b = img[idx + 2], a = img[idx + 3];
                            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                            if (a > 165 && chroma > 24) {
                                if (!pts.some((p) => (p.px - px) ** 2 + (p.py - py) ** 2 < 144)) {
                                    pts.push({ px, py, clientX: rect.left + px, clientY: rect.top + py });
                                    if (pts.length >= 20) return pts;
                                }
                            }
                        }
                    }
                    return pts;
                }"""
            )
            assert dot_candidates, "Could not locate any rendered colored dot pixel candidates on #atlasField"
            hit_pt = None
            for pt in dot_candidates:
                page.mouse.move(pt["clientX"], pt["clientY"])
                page.wait_for_timeout(40)
                if page.locator("#atlasTip.visible").count() > 0:
                    hit_pt = pt
                    break
            assert hit_pt is not None, "Hovering rendered #atlasField dots never revealed #atlasTip.visible"
            assert len(page.locator("#atlasTip").inner_text().strip()) > 5, "#atlasTip.visible had empty content"

            # Click the hovered dot -> opens #paperDialog
            page.mouse.click(hit_pt["clientX"], hit_pt["clientY"])
            page.wait_for_timeout(120)
            dlg = page.locator("#paperDialog")
            assert dlg.evaluate("el => Boolean(el.open)") and dlg.is_visible(), "Clicking #atlasField dot did not open #paperDialog"
            page.locator("#closePaperBtn").click()
            page.wait_for_timeout(80)
            assert not dlg.evaluate("el => Boolean(el.open)"), "#paperDialog did not close"

            # Hover a swimlane header (pointer cursor without #atlasTip.visible) and click to filter #library
            lane_pt = None
            lane_x_start = box["x"] + box["width"] * 0.50
            for x_off in (0, 24, 52):
                cx = lane_x_start + x_off
                for step_y in range(int(box["height"] * 0.16), int(box["height"] * 0.85), 8):
                    cy = box["y"] + step_y
                    page.mouse.move(cx, cy)
                    page.wait_for_timeout(20)
                    is_lane = page.evaluate(
                        """() => {
                            const cv = document.getElementById('atlasField');
                            const tip = document.getElementById('atlasTip');
                            return Boolean(cv && cv.style.cursor === 'pointer' && (!tip || !tip.classList.contains('visible')));
                        }"""
                    )
                    if is_lane:
                        lane_pt = (cx, cy)
                        break
                if lane_pt is not None:
                    break
            assert lane_pt is not None, "Could not locate clickable swimlane header on #atlasField"
            page.mouse.click(lane_pt[0], lane_pt[1])
            page.wait_for_timeout(140)
            lane_cnt = page.locator("#resultsCounter").inner_text()
            lane_nums = [int(x) for x in re.findall(r"\d+", lane_cnt)]
            total_src = page.evaluate("() => window.CWM_DATA ? window.CWM_DATA.total_sources : 170")
            assert lane_nums and 1 <= lane_nums[0] < total_src, f"Clicking #atlasField swimlane header did not filter #library: {lane_cnt!r}"
            page.locator("#resetFiltersTopBtn").click()
            page.wait_for_timeout(80)
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(80)

            # Post-sweep replay check: yr_done == 2026 -> restarted != 2026
            yr_done = atlas_sig()["year"]
            assert yr_done == "2026", f"Expected completed sweep year '2026' before replay, got {yr_done!r}"
            page.locator("#atlasReplayBtn").click()
            page.wait_for_timeout(120)
            post_replay = atlas_sig()
            assert post_replay["year"] != "2026", (
                f"Clicking #atlasReplayBtn did not restart completed sweep (year stayed {post_replay['year']!r})"
            )
            monitor.assert_clean("T1-03")
            return (
                f"#atlasField rendered {stats['w']}x{stats['h']} ({stats['nonZero']} sampled px, {stats['colors']} color buckets) "
                "+ mode, hover tip, dot->modal, swimlane->filter, and post-sweep replay verified"
            )

        runner.record("Tier 1", "T1-03", t1_03)

        # T1-04: /survey/ L0-L4, split slider, 3 families, contracts/eval/outline
        def t1_04() -> str:
            require_route_available(root, "survey/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/survey/")
            # Keyboard navigation (ArrowRight/End/ArrowLeft/Home) on #spectrumRail
            page.locator('#spectrumRail [data-layer="L0"]').focus()
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(80)
            assert page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-layer')") == "L1", (
                "#spectrumRail ArrowRight did not move focus from L0 to L1"
            )
            assert page.locator('#spectrumRail [data-layer="L1"]').get_attribute("aria-selected") == "true", (
                "#spectrumRail ArrowRight did not select L1"
            )
            page.keyboard.press("End")
            page.wait_for_timeout(60)
            assert page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-layer')") == "L4", (
                "#spectrumRail End did not move focus to L4"
            )
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(60)
            assert page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-layer')") == "L0", (
                "#spectrumRail ArrowRight on L4 did not wrap to L0"
            )
            page.keyboard.press("ArrowLeft")
            page.wait_for_timeout(60)
            assert page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-layer')") == "L4", (
                "#spectrumRail ArrowLeft on L0 did not wrap to L4"
            )
            page.keyboard.press("Home")
            page.wait_for_timeout(60)
            assert page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-layer')") == "L0", (
                "#spectrumRail Home did not move focus to L0"
            )

            seen_stages: List[str] = []
            for layer in ("L0", "L1", "L2", "L3", "L4"):
                tab = page.locator(f'#spectrumRail [data-layer="{layer}"]')
                tab.click()
                assert tab.get_attribute("aria-selected") == "true", f"{layer} tab not selected"
                txt = page.locator("#inspectorStage").inner_text().strip()
                assert txt, f"#inspectorStage empty for {layer}"
                seen_stages.append(txt[:80])
            assert len(set(seen_stages)) >= 4, "L0-L4 tabs did not update #inspectorStage content"
            assert page.locator("#pitfallsGrid > *").count() >= 3, "Expected 3 boundary pitfalls"

            # Split slider & case tabs
            page.locator("#splitSlider").fill("74")
            page.locator("#splitSlider").dispatch_event("input")
            split_pos = page.locator("#splitStage").evaluate("el => el.style.getPropertyValue('--split-pos')")
            assert split_pos.strip() == "74%", f"Expected --split-pos 74%, got {split_pos!r}"
            case_btns = page.locator("#caseTabs button")
            assert case_btns.count() >= 2, "Expected >= 2 diagnostic cases"
            before_url = page.locator("#cmpUrl").inner_text()
            case_btns.nth(1).click()
            after_url = page.locator("#cmpUrl").inner_text()
            assert after_url != before_url, "Case tab switch did not update #cmpUrl"

            # 3 code-carrier families
            fam_txt = page.locator("#familyGrid").inner_text()
            for fam in ("WorldCoder", "Code-as-World", "VibeWorlding"):
                assert fam in fam_txt, f"Missing family {fam!r} in #familyGrid"

            # Framework tabs (contracts, eval obligations B1-B4, 9-chapter outline)
            fw_tabs = page.locator("#frameworkTabs button")
            assert fw_tabs.count() >= 3, "Expected 3 framework tabs"
            fw_texts: List[str] = []
            for i in range(3):
                fw_tabs.nth(i).click()
                fw_texts.append(page.locator("#frameworkStage").inner_text())
            joined_fw = "\n".join(fw_texts)
            assert "B1" in joined_fw and "B4" in joined_fw, "Evaluation obligations B1-B4 missing"
            assert (
                ("§01" in joined_fw or "§1" in joined_fw)
                and ("§09" in joined_fw or "§9" in joined_fw)
            ) or "Chapter" in joined_fw, "Survey outline missing"
            monitor.assert_clean("T1-04")
            return "L0-L4 tabs, split slider, 3 families, and contracts/eval/outline tabs verified"

        runner.record("Tier 1", "T1-04", t1_04)

        # T1-05: /survey/ 170-paper explorer & paper modal
        def t1_05() -> str:
            require_route_available(root, "survey/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/survey/")
            total_src = page.evaluate("() => window.CWM_DATA ? window.CWM_DATA.total_sources : 170")
            counter_txt = page.locator("#resultsCounter").inner_text()
            assert str(total_src) in counter_txt, f"Expected {total_src} in #resultsCounter, got {counter_txt!r}"

            page.locator("#viewTableBtn").click()
            assert page.locator("#papersContainer table").count() >= 1, "Table view did not render <table>"
            page.locator("#viewCardsBtn").click()

            open_btn = page.locator("#papersContainer [data-open-paper]").first
            if open_btn.count() == 0:
                open_btn = page.locator("[data-open-paper]").first
            assert open_btn.count() >= 1, "No [data-open-paper] trigger found"
            open_btn.click()

            dialog = page.locator("#paperDialog")
            assert dialog.evaluate("el => Boolean(el.open)") and dialog.is_visible(), "#paperDialog did not open"
            modal_txt = page.locator("#paperDialogBody").inner_text()
            assert len(modal_txt.strip()) > 30 and "@" in modal_txt, "Paper modal missing summary or BibTeX"
            page.locator("#closePaperBtn").click()
            assert not dialog.evaluate("el => Boolean(el.open)"), "#paperDialog did not close"

            # Verify L0-L4 Master System Matrix & L0-L4 Unified Search Pills
            assert page.locator("#matrixTable tbody tr").count() >= 25, "Expected >=25 rows in #matrixTable"
            page.locator('#matrixPills [data-mfilter="L0"]').click()
            assert 1 <= page.locator("#matrixTable tbody tr").count() <= 8, "L0 filter in #matrixPills did not narrow #matrixTable"
            page.locator('#matrixPills [data-mfilter="all"]').click()

            page.locator('#quickParadigmBar [data-qpar="L0"]').click()
            assert "mujoco" in page.locator("#papersContainer").inner_text().lower(), "Quick L0 filter did not surface MuJoCo in #papersContainer"
            page.locator("#resetFiltersTopBtn").click()
            assert str(total_src) in page.locator("#resultsCounter").inner_text(), "Reset after L0 filter did not restore core count"

            monitor.assert_clean("T1-05")
            return f"{total_src}-paper Cards/Table views, #matrixTable L0-L4 filter, unified L0-L4 search, and #paperDialog verified"

        runner.record("Tier 1", "T1-05", t1_05)

        # T1-06: /arena/ In Progress status & zero unreleased detail leaks
        def t1_06() -> str:
            require_route_available(root, "arena/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/arena/")
            main_txt = page.locator("main").inner_text()
            assert re.search(r"In\s*Progress|推进中", main_txt, re.I), "Missing 'In Progress' status on /arena/"
            assert page.locator('a[href*="jz-jimmy"]').count() == 0, "Unreleased jz-jimmy link still present on /arena/"
            for leak in ("PWM-Arena", "Minecraft", "S01", "S24", "923"):
                assert not re.search(rf"\b{re.escape(leak)}\b", main_txt, re.I), (
                    f"Unreleased benchmark detail {leak!r} leaked on /arena/"
                )
            int_link = page.locator('a[href*="survey/?sec=benchmark"]')
            root_link = page.locator('main a[href="../"]')
            assert int_link.count() >= 1 and int_link.first.is_visible(), "Missing relative ../survey/?sec=benchmark#library link"
            assert root_link.count() >= 1 and root_link.first.is_visible(), "Missing relative ../ overview link on /arena/"
            monitor.assert_clean("T1-06")
            return "/arena/ In Progress framing, relative links, and zero unreleased detail leaks verified"

        runner.record("Tier 1", "T1-06", t1_06)

        # T1-07: Overview & /arena/ In Progress consistency + bilingual toggle
        def t1_07() -> str:
            require_route_available(root, "arena/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/")
            work_txt = page.locator("#work").inner_text()
            assert work_txt.lower().count("in progress") >= 2, "Expected both Work 02 and Work 03 marked In Progress on /"
            for leak in ("PWM-Arena", "jz-jimmy", "S01", "S24"):
                assert not re.search(rf"\b{re.escape(leak)}\b", page.locator("body").inner_text(), re.I), (
                    f"Unreleased detail {leak!r} leaked on /"
                )

            navigate_route(page, monitor, f"{base_url}/arena/")
            page.locator("#pwmLangZh").click()
            page.wait_for_timeout(80)
            assert "推进中" in page.locator("main").inner_text(), "/arena/ did not render Chinese In Progress notice"
            page.locator("#pwmLangEn").click()
            page.wait_for_timeout(80)
            assert "In Progress" in page.locator("main").inner_text(), "/arena/ did not revert to English In Progress notice"
            monitor.assert_clean("T1-07")
            return "Overview 02/03 In Progress cards & /arena/ EN <-> 中文 notice verified"

        runner.record("Tier 1", "T1-07", t1_07)

        # T1-08: /method/ In Progress framing & zero unreleased/fabricated claims
        def t1_08() -> str:
            require_route_available(root, "method/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/method/")
            main_txt = page.locator("main").inner_text()
            assert re.search(r"In\s*Progress|推进中", main_txt, re.I), (
                "Missing 'In Progress' status framing on /method/"
            )
            assert not re.search(r"\b\d{2}\.\d+%\s*(?:accuracy|pass|score|rate|SOTA)\b", main_txt, re.I), (
                "Detected fabricated benchmark score claim on /method/"
            )
            assert not re.search(r"\b(?:NeurIPS|ICLR|ICML|CVPR|ACL)\s*202[6-9]\b", main_txt, re.I), (
                "Detected fabricated paper publication venue/date on /method/"
            )
            for leak in ("pwm-state-v1", "double_lock", "single_open", "PWM-Arena"):
                assert not re.search(rf"\b{re.escape(leak)}\b", main_txt, re.I), (
                    f"Unreleased method detail {leak!r} leaked on /method/"
                )
            monitor.assert_clean("T1-08")
            return "/method/ In Progress framing, zero fabricated metrics, and zero unreleased method details verified"

        runner.record("Tier 1", "T1-08", t1_08)

        # T1-09: /method/ relative links & bilingual toggle
        def t1_09() -> str:
            require_route_available(root, "method/", skip_missing_routes)
            navigate_route(page, monitor, f"{base_url}/method/")
            survey_link = page.locator('a[href*="survey/?layer=L2"]')
            arena_link = page.locator('a[href*="arena/"]')
            root_link = page.locator('main a[href="../"]')
            assert survey_link.count() >= 1 and survey_link.first.is_visible(), "Missing link to ../survey/?layer=L2#paradigms"
            assert arena_link.count() >= 1 and arena_link.first.is_visible(), "Missing link to ../arena/"
            assert root_link.count() >= 1 and root_link.first.is_visible(), "Missing link to ../ on /method/"

            page.locator("#pwmLangZh").click()
            page.wait_for_timeout(80)
            assert "推进中" in page.locator("main").inner_text(), "/method/ did not render Chinese In Progress notice"
            page.locator("#pwmLangEn").click()
            page.wait_for_timeout(80)
            assert "In Progress" in page.locator("main").inner_text(), "/method/ did not revert to English In Progress notice"
            monitor.assert_clean("T1-09")
            return "/method/ relative links (L2 survey, /arena/, ../) & EN <-> 中文 toggle verified"

        runner.record("Tier 1", "T1-09", t1_09)
    finally:
        page.close()


# ---------------------------------------------------------------------------
# Tier 2: Boundary, Deep-Link & Edge Cases (T2-01 .. T2-08)
# ---------------------------------------------------------------------------

def run_tier2(
    runner: SuiteRunner,
    browser: Any,
    base_url: str,
    root: Optional[Path],
    skip_missing_routes: bool,
    timeout_ms: int,
) -> None:
    def new_ctx_page(mobile: bool = False) -> Tuple[Any, Page, PageMonitor]:
        if mobile:
            ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        else:
            ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        return ctx, pg, PageMonitor(pg, base_url)

    # T2-01: ?layer=L3#paradigms and case-insensitive ?layer=l3#paradigms
    def t2_01() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        for q_layer in ("L3", "l3"):
            ctx, pg, mon = new_ctx_page()
            try:
                navigate_route(pg, mon, f"{base_url}/survey/?layer={q_layer}#paradigms")
                assert pg.locator('#spectrumRail [data-layer="L3"]').get_attribute("aria-selected") == "true", (
                    f"?layer={q_layer} did not select L3"
                )
                stage = pg.locator("#inspectorStage").inner_text()
                assert "L3" in stage or "Hybrid" in stage, f"Unexpected L3 stage text for ?layer={q_layer}: {stage[:80]!r}"
                mon.assert_clean(f"T2-01 ?layer={q_layer}")
            finally:
                ctx.close()
        return "?layer=L3 & case-insensitive ?layer=l3 activate L3 tab and details"

    runner.record("Tier 2", "T2-01", t2_01)

    # T2-02: ?sec=benchmark, case-insensitive ?sec=BENCHMARK, and ?par=l2
    def t2_02() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        for sec_val in ("benchmark", "BENCHMARK"):
            ctx, pg, mon = new_ctx_page()
            try:
                navigate_route(pg, mon, f"{base_url}/survey/?sec={sec_val}#library")
                meta_counts = pg.evaluate("() => ({ total: window.CWM_DATA.total_sources, bench: window.CWM_DATA.group_counts.benchmark })")
                cnt_txt = pg.locator("#resultsCounter").inner_text()
                assert str(meta_counts["bench"]) in cnt_txt and str(meta_counts["total"]) in cnt_txt, (
                    f"Expected {meta_counts['bench']} of {meta_counts['total']} for ?sec={sec_val}, got {cnt_txt!r}"
                )
                mon.assert_clean(f"T2-02 ?sec={sec_val}")
            finally:
                ctx.close()

        ctx, pg, mon = new_ctx_page()
        try:
            navigate_route(pg, mon, f"{base_url}/survey/?par=l2#library")
            meta_counts = pg.evaluate("() => ({ total: window.CWM_DATA.total_sources, bench: window.CWM_DATA.group_counts.benchmark })")
            cnt_txt = pg.locator("#resultsCounter").inner_text()
            nums = [int(x) for x in re.findall(r"\d+", cnt_txt)]
            assert nums and 1 <= nums[0] < meta_counts["total"], f"Expected filtered count for ?par=l2, got {cnt_txt!r}"
            assert pg.locator('#paradigmFilterGroup [data-par="L2"].active').count() == 1, (
                "?par=l2 did not activate canonical L2 paradigm filter button"
            )
            mon.assert_clean("T2-02 ?par=l2")
            return f"?sec=benchmark, ?sec=BENCHMARK ({meta_counts['bench']}/{meta_counts['total']}), and ?par=l2 ({nums[0]}/{meta_counts['total']}) verified"
        finally:
            ctx.close()

    runner.record("Tier 2", "T2-02", t2_02)

    # T2-03: ?q=worldcoder & jump-to-library filter reset
    def t2_03() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        ctx, pg, mon = new_ctx_page()
        try:
            navigate_route(pg, mon, f"{base_url}/survey/?q=worldcoder")
            q_val = pg.locator("#searchInput").input_value().lower()
            assert q_val == "worldcoder", f"Expected #searchInput='worldcoder', got {q_val!r}"
            meta_counts = pg.evaluate("() => ({ total: window.CWM_DATA.total_sources, bench: window.CWM_DATA.group_counts.benchmark })")
            cnt_txt = pg.locator("#resultsCounter").inner_text()
            nums = [int(x) for x in re.findall(r"\d+", cnt_txt)]
            assert nums and 1 <= nums[0] < meta_counts["total"], f"Unexpected filtered count for worldcoder: {cnt_txt!r}"
            assert "worldcoder" in pg.locator("#papersContainer").inner_text().lower(), "WorldCoder missing in results"

            # Verify jump-to-library resets active query/section filters cleanly
            navigate_route(pg, mon, f"{base_url}/survey/?q=worldcoder&sec=worldcoder")
            assert "1" in pg.locator("#resultsCounter").inner_text(), "Expected 1 match for q=worldcoder&sec=worldcoder"
            pg.locator('[data-jump-section="benchmark"]').click()
            pg.wait_for_timeout(120)
            assert pg.locator("#searchInput").input_value() == "", "Jump-to-library did not clear #searchInput"
            jump_cnt = pg.locator("#resultsCounter").inner_text()
            assert str(meta_counts["bench"]) in jump_cnt and str(meta_counts["total"]) in jump_cnt, (
                f"Jump-to-library did not reset to {meta_counts['bench']}/{meta_counts['total']}: {jump_cnt!r}"
            )
            mon.assert_clean("T2-03")
            return f"?q=worldcoder ({cnt_txt.strip()}) and jump-to-library reset ({jump_cnt.strip()}) verified"
        finally:
            ctx.close()

    runner.record("Tier 2", "T2-03", t2_03)

    # T2-04: ?lang=zh&theme=dark across all 4 routes (including /)
    def t2_04() -> str:
        checked: List[str] = []
        for route in ("", "survey/", "arena/", "method/"):
            if root is not None and not route_present(root, route):
                if skip_missing_routes and route != "":
                    continue
                raise AssertionError(f"Missing route /{route}")
            ctx, pg, mon = new_ctx_page()
            try:
                navigate_route(pg, mon, f"{base_url}/{route}?lang=zh&theme=dark")
                has_zh = pg.evaluate("() => document.documentElement.classList.contains('zh')")
                theme = pg.locator("html").get_attribute("data-theme")
                assert has_zh, f"/{route}?lang=zh&theme=dark missing html.zh"
                assert theme == "dark", f"/{route}?lang=zh&theme=dark data-theme={theme!r}"
                assert "is-active" in (pg.locator("#pwmLangZh").get_attribute("class") or ""), f"/{route} #pwmLangZh not active"
                assert "is-active" in (pg.locator("#pwmThemeDark").get_attribute("class") or ""), f"/{route} #pwmThemeDark not active"
                assert re.search(r"[\u4e00-\u9fff]{3,}", pg.locator("main").inner_text()), f"/{route} missing Chinese body copy"
                mon.assert_clean(f"T2-04 /{route}")
                checked.append("/" + route)
            finally:
                ctx.close()
        if not checked:
            raise SkipCheck("No routes exist under root")
        return f"?lang=zh&theme=dark honored on {', '.join(checked)}"

    runner.record("Tier 2", "T2-04", t2_04)

    # T2-05: Cmd/Ctrl+K search edge cases (empty, XSS/special chars, no-match, shortcut, ESC)
    def t2_05() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        ctx, pg, mon = new_ctx_page()
        try:
            navigate_route(pg, mon, f"{base_url}/survey/")
            pg.locator("#openCmdBtn").click()
            dlg = pg.locator("#cmdDialog")
            assert dlg.evaluate("el => Boolean(el.open)"), "#cmdDialog did not open via #openCmdBtn"

            inp = pg.locator("#cmdInput")
            inp.fill("")
            pg.wait_for_timeout(80)
            assert pg.locator("#cmdResults").inner_text().strip() != "", "Empty ⌘K search returned blank container"

            for special in ("<script>window.__xss=1</script>", "[L2]+(C++)*?", "zzzz_no_such_paper_999"):
                inp.fill(special)
                pg.wait_for_timeout(80)
                xss = pg.evaluate("() => window.__xss === 1")
                assert not xss, "XSS executed via #cmdInput"

            pg.keyboard.press("Escape")
            pg.wait_for_timeout(80)
            assert not dlg.evaluate("el => Boolean(el.open)"), "#cmdDialog did not close on Escape"

            shortcut = "Meta+k" if sys.platform == "darwin" else "Control+k"
            pg.keyboard.press(shortcut)
            pg.wait_for_timeout(80)
            assert dlg.evaluate("el => Boolean(el.open)"), f"{shortcut} did not open #cmdDialog"
            pg.locator("#closeCmdBtn").click()
            mon.assert_clean("T2-05")
            return "⌘K empty, special-char, no-match, Escape, and keyboard shortcut resilience verified"
        finally:
            ctx.close()

    runner.record("Tier 2", "T2-05", t2_05)

    # T2-06: Library no-match & reset recovery
    def t2_06() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        ctx, pg, mon = new_ctx_page()
        try:
            navigate_route(pg, mon, f"{base_url}/survey/")
            pg.locator("#searchInput").fill("__nonexistent_xyz__")
            pg.wait_for_timeout(100)
            zero_txt = pg.locator("#resultsCounter").inner_text()
            assert re.search(r"\b0\b", zero_txt), f"Expected 0 matches, got {zero_txt!r}"
            pg.locator("#resetFiltersTopBtn").click()
            pg.wait_for_timeout(100)
            total_src = pg.evaluate("() => window.CWM_DATA ? window.CWM_DATA.total_sources : 170")
            restored = pg.locator("#resultsCounter").inner_text()
            assert str(total_src) in restored, f"Reset failed to restore {total_src}, got {restored!r}"
            mon.assert_clean("T2-06")
            return f"0-match query and reset-filters restoration to {total_src} verified"
        finally:
            ctx.close()

    runner.record("Tier 2", "T2-06", t2_06)

    # T2-07: BibTeX export download trigger
    def t2_07() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        ctx, pg, mon = new_ctx_page()
        try:
            navigate_route(pg, mon, f"{base_url}/survey/?sec=benchmark#library")
            with pg.expect_download() as dl_info:
                pg.locator("#exportFilteredBibBtn").click()
            dl: Download = dl_info.value
            assert dl.suggested_filename.endswith(".bib"), f"Expected .bib download, got {dl.suggested_filename!r}"
            dl_path = dl.path()
            assert dl_path is not None and Path(dl_path).is_file(), "Downloaded .bib temp file missing"
            bib_txt = Path(dl_path).read_text(encoding="utf-8", errors="replace")
            assert "@" in bib_txt and "{" in bib_txt, "Downloaded .bib content is not valid BibTeX"
            mon.assert_clean("T2-07")
            return f"BibTeX download '{dl.suggested_filename}' ({len(bib_txt)} bytes) verified"
        finally:
            ctx.close()

    runner.record("Tier 2", "T2-07", t2_07)

    # T2-08: Narrow-desktop (965x800, 980x800) & Mobile (390x844) overflow, interactive states, & sticky header
    def t2_08() -> str:
        overflows: List[str] = []
        sticky_fails: List[str] = []
        checked_routes: List[str] = []
        viewports = [
            ("965x800", 965, 800, False),
            ("980x800", 980, 800, False),
            ("390x844", 390, 844, True),
        ]

        for vp_label, vp_w, vp_h, is_touch in viewports:
            ctx = browser.new_context(viewport={"width": vp_w, "height": vp_h}, has_touch=is_touch)
            pg = ctx.new_page()
            pg.set_default_timeout(timeout_ms)
            mon = PageMonitor(pg, base_url)
            try:
                for route in ROUTE_PAGE_IDS:
                    if root is not None and not route_present(root, route):
                        if skip_missing_routes and route != "":
                            continue
                        raise AssertionError(f"Missing route '/{route}'")
                    navigate_route(pg, mon, f"{base_url}/{route}")

                    def check_vp_fit(state_tag: str) -> None:
                        dims = pg.evaluate(
                            """() => {
                                const navRight = document.querySelector('.pwm-global-nav__right');
                                const rRect = navRight ? navRight.getBoundingClientRect() : null;
                                return {
                                    scrollW: document.documentElement.scrollWidth,
                                    clientW: document.documentElement.clientWidth,
                                    innerW: window.innerWidth,
                                    navRight: rRect ? rRect.right : 0
                                };
                            }"""
                        )
                        if dims["scrollW"] > dims["clientW"] + 2:
                            overflows.append(
                                f"/{route} [{vp_label} {state_tag}]: scrollWidth={dims['scrollW']} > clientWidth={dims['clientW']}"
                            )
                        if dims["navRight"] > dims["innerW"] + 0.5:
                            overflows.append(
                                f"/{route} [{vp_label} {state_tag}]: .pwm-global-nav__right={dims['navRight']:.1f} > innerW={dims['innerW']}"
                            )

                    check_vp_fit("initial")

                    # Check sticky .pwm-global-nav at scrollY=600 once per route on narrow-desktop & mobile
                    if vp_label in ("965x800", "390x844"):
                        pg.evaluate("() => window.scrollTo(0, 600)")
                        pg.wait_for_timeout(60)
                        nav_top = pg.evaluate(
                            """() => {
                                const nav = document.querySelector('.pwm-global-nav');
                                return nav ? nav.getBoundingClientRect().top : 9999;
                            }"""
                        )
                        if nav_top > 1.0:
                            sticky_fails.append(f"/{route} [{vp_label}]: .pwm-global-nav top={nav_top:.1f} > 1 after scroll")
                        pg.evaluate("() => window.scrollTo(0, 0)")

                    # Interactive state overflow check at 390x844 & 965x800
                    if vp_label in ("965x800", "390x844"):
                        if route == "survey/":
                            pg.locator("#viewTableBtn").click()
                            pg.wait_for_timeout(80)
                            check_vp_fit("table-view")
                        elif route == "arena/":
                            r_tab = find_visible_text_control(pg, r"R\s*Track|R\s*轨", roles=("tab", "button"))
                            if r_tab is not None:
                                r_tab.click()
                                pg.wait_for_timeout(80)
                                check_vp_fit("r-track")
                        elif route == "method/":
                            patch_btn = find_visible_text_control(pg, r"double_lock|2\s*pulls|双锁", roles=("button",))
                            if patch_btn is not None:
                                patch_btn.click()
                                pg.wait_for_timeout(80)
                                check_vp_fit("double-lock")

                    mon.assert_clean(f"T2-08 /{route} [{vp_label}]")
                    if "/" + route not in checked_routes:
                        checked_routes.append("/" + route)
            finally:
                ctx.close()

        if overflows:
            raise AssertionError("; ".join(overflows[:5]))
        if sticky_fails:
            raise AssertionError("; ".join(sticky_fails[:5]))
        return f"965x800, 980x800 & 390x844 layout, interactive states, and sticky header clean on {', '.join(checked_routes)}"

    runner.record("Tier 2", "T2-08", t2_08)


# ---------------------------------------------------------------------------
# Tier 3: Cross-Feature & Cross-Page State Persistence (T3-01 .. T3-04)
# ---------------------------------------------------------------------------

def run_tier3(
    runner: SuiteRunner,
    browser: Any,
    base_url: str,
    root: Optional[Path],
    skip_missing_routes: bool,
    timeout_ms: int,
) -> None:
    def available_routes() -> List[Tuple[str, str]]:
        out: List[Tuple[str, str]] = []
        for route, (page_id, _) in ROUTE_PAGE_IDS.items():
            if root is not None and not route_present(root, route):
                if skip_missing_routes and route != "":
                    continue
                raise AssertionError(f"Missing route '/{route}'")
            out.append((route, page_id))
        return out

    # T3-01: Shell route traversal across all 4 pages (+ subpath /program-world-models.github.io/ verification)
    def t3_01() -> str:
        routes = available_routes()
        if len(routes) < 2:
            raise SkipCheck("Need >= 2 routes to verify cross-route shell traversal")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        mon = PageMonitor(pg, base_url)
        try:
            navigate_route(pg, mon, f"{base_url}/")
            visited: List[str] = ["overview"]
            for route, page_id in routes[1:]:
                pg.locator(f'.pwm-route-link[data-route-id="{page_id}"]').click()
                pg.wait_for_load_state("domcontentloaded")
                pg.wait_for_selector(f'body[data-pwm-page="{page_id}"]')
                pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
                assert pg.url.rstrip("/").endswith(route.rstrip("/")), f"Unexpected URL {pg.url!r} for {page_id}"
                visited.append(page_id)
            # Return to overview via subnav card
            pg.locator('.pwm-subnav-card').first.click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="overview"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            mon.assert_clean("T3-01")
        finally:
            ctx.close()

        subpath_note = ""
        if root is not None:
            with SubpathStaticServer(root, prefix="/program-world-models.github.io") as sub_srv:
                sub_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                sub_pg = sub_ctx.new_page()
                sub_pg.set_default_timeout(timeout_ms)
                sub_mon = PageMonitor(sub_pg, sub_srv.base_url)
                try:
                    navigate_route(sub_pg, sub_mon, f"{sub_srv.base_url}/")
                    for route, page_id in routes[1:]:
                        sub_pg.locator(f'.pwm-route-link[data-route-id="{page_id}"]').click()
                        sub_pg.wait_for_load_state("domcontentloaded")
                        sub_pg.wait_for_selector(f'body[data-pwm-page="{page_id}"]')
                        sub_pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
                        assert "/program-world-models.github.io/" in sub_pg.url, (
                            f"Subpath prefix lost on {page_id}: {sub_pg.url!r}"
                        )
                    sub_mon.assert_clean("T3-01 subpath")
                    subpath_note = " + /program-world-models.github.io/ subpath"
                finally:
                    sub_ctx.close()

        return f"traversed {' -> '.join(visited)} -> overview via shell navigation{subpath_note}"

    runner.record("Tier 3", "T3-01", t3_01)

    # T3-02: EN <-> 中文 persistence across all 4 pages + reload + mid-simulation live toggle
    def t3_02() -> str:
        routes = available_routes()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        mon = PageMonitor(pg, base_url)
        try:
            navigate_route(pg, mon, f"{base_url}/")
            # Mid-simulation EN <-> 中文 check on / (blocked & executed #sim-status-pill, #sim-trace-list, #arena-branch-status)
            pg.locator('.sim-action-btn[data-sim-action="unlock_door"]').click()
            pg.wait_for_timeout(80)
            assert "Blocked" in pg.locator("#sim-status-pill").inner_text(), "Expected EN blocked #sim-status-pill"
            pg.locator("#pwmLangZh").click()
            pg.wait_for_timeout(80)
            assert "拦截" in pg.locator("#sim-status-pill").inner_text(), "Blocked #sim-status-pill did not translate to ZH"
            assert re.search(r"[\u4e00-\u9fff]", pg.locator("#sim-trace-list").inner_text()), "#sim-trace-list did not translate to ZH"
            pg.locator('.sim-action-btn[data-sim-action="take_key"]').click()
            pg.locator('.sim-action-btn[data-sim-action="unlock_door"]').click()
            pg.wait_for_timeout(80)
            assert "已执行" in pg.locator("#sim-status-pill").inner_text(), "Executed #sim-status-pill not in ZH"
            pg.locator('.screen-tab[data-screen="arena"]').click()
            pg.locator('.arena-mode-btn[data-arena-mode="edited"]').click()
            assert "分支" in pg.locator("#arena-branch-status").inner_text(), "#arena-branch-status not in ZH"
            pg.locator("#pwmLangEn").click()
            pg.wait_for_timeout(80)
            assert "Executed" in pg.locator("#sim-status-pill").inner_text(), "Executed #sim-status-pill did not revert to EN"
            assert "Branch" in pg.locator("#arena-branch-status").inner_text(), "#arena-branch-status did not revert to EN"

            pg.locator("#pwmLangZh").click()
            pg.wait_for_timeout(120)
            for route, page_id in routes:
                if route != "":
                    pg.locator(f'.pwm-route-link[data-route-id="{page_id}"]').click()
                    pg.wait_for_load_state("domcontentloaded")
                    pg.wait_for_selector(f'body[data-pwm-page="{page_id}"]')
                    pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
                    pg.wait_for_timeout(120)
                pg.reload(wait_until="domcontentloaded")
                pg.wait_for_selector("#pwmLangZh")
                state = pg.evaluate(
                    """() => ({
                        zhClass: document.documentElement.classList.contains('zh'),
                        pwmLang: localStorage.getItem('pwm-language'),
                        cwmLang: localStorage.getItem('cwm_lang'),
                        btnActive: document.getElementById('pwmLangZh').classList.contains('is-active'),
                        mainText: (document.querySelector('main') || document.body).innerText
                    })"""
                )
                assert state["zhClass"] and state["btnActive"], f"/{route} lost zh state"
                assert state["pwmLang"] == "zh" and state["cwmLang"] == "zh", f"/{route} localStorage mismatch: {state}"
                assert re.search(r"[\u4e00-\u9fff]{3,}", state["mainText"]), f"/{route} missing Chinese text"

                # Live EN <-> 中文 toggle on /arena/ and /method/
                if route in ("arena/", "method/"):
                    assert "推进中" in pg.locator("main").inner_text(), f"/{route} missing Chinese In Progress notice"
                    pg.locator("#pwmLangEn").click()
                    pg.wait_for_timeout(80)
                    assert "In Progress" in pg.locator("main").inner_text(), f"/{route} toggle to EN failed"
                    pg.locator("#pwmLangZh").click()
                    pg.wait_for_timeout(80)

            # Toggle back to EN and confirm on / across reload
            pg.locator("#pwmLangEn").click()
            pg.wait_for_timeout(100)
            pg.locator('.pwm-route-link[data-route-id="overview"]').click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="overview"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            pg.reload(wait_until="domcontentloaded")
            pg.wait_for_selector("#pwmLangEn")
            en_state = pg.evaluate(
                """() => ({
                    zhClass: document.documentElement.classList.contains('zh'),
                    pwmLang: localStorage.getItem('pwm-language'),
                    cwmLang: localStorage.getItem('cwm_lang'),
                    btnActive: document.getElementById('pwmLangEn').classList.contains('is-active')
                })"""
            )
            assert not en_state["zhClass"] and en_state["btnActive"], f"EN switch did not persist across reload: {en_state}"
            assert en_state["pwmLang"] == "en" and en_state["cwmLang"] == "en", f"EN localStorage mismatch: {en_state}"
            mon.assert_clean("T3-02")
            return f"EN <-> 中文 persisted across {len(routes)} routes, reload, and mid-simulation toggles"
        finally:
            ctx.close()

    runner.record("Tier 3", "T3-02", t3_02)

    # T3-03: Light <-> Dark persistence across all 4 pages + reload
    def t3_03() -> str:
        routes = available_routes()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        mon = PageMonitor(pg, base_url)
        try:
            navigate_route(pg, mon, f"{base_url}/")
            pg.locator("#pwmThemeDark").click()
            pg.wait_for_timeout(120)
            for route, page_id in routes:
                if route != "":
                    pg.locator(f'.pwm-route-link[data-route-id="{page_id}"]').click()
                    pg.wait_for_load_state("domcontentloaded")
                    pg.wait_for_selector(f'body[data-pwm-page="{page_id}"]')
                    pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
                    pg.wait_for_timeout(120)
                pg.reload(wait_until="domcontentloaded")
                pg.wait_for_selector("#pwmThemeDark")
                state = pg.evaluate(
                    """() => ({
                        theme: document.documentElement.getAttribute('data-theme'),
                        pwmTheme: localStorage.getItem('pwm-theme'),
                        cwmTheme: localStorage.getItem('cwm_theme'),
                        btnActive: document.getElementById('pwmThemeDark').classList.contains('is-active')
                    })"""
                )
                assert state["theme"] == "dark" and state["btnActive"], f"/{route} lost dark theme"
                assert state["pwmTheme"] == "dark" and state["cwmTheme"] == "dark", f"/{route} theme storage mismatch: {state}"
                lum = body_luminance(pg)
                assert lum < 0.25, f"/{route} dark theme body luminance too bright ({lum:.3f})"
                check_computed_styles_no_pink(pg, f"T3-03 /{route} [dark]")

            pg.locator("#pwmThemeLight").click()
            pg.wait_for_timeout(100)
            pg.locator('.pwm-route-link[data-route-id="overview"]').click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="overview"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            pg.reload(wait_until="domcontentloaded")
            pg.wait_for_selector("#pwmThemeLight")
            light_state = pg.evaluate(
                """() => ({
                    theme: document.documentElement.getAttribute('data-theme'),
                    pwmTheme: localStorage.getItem('pwm-theme'),
                    cwmTheme: localStorage.getItem('cwm_theme'),
                    btnActive: document.getElementById('pwmThemeLight').classList.contains('is-active')
                })"""
            )
            assert light_state["theme"] == "light" and light_state["btnActive"], (
                f"Light switch did not persist across reload: {light_state}"
            )
            assert light_state["pwmTheme"] == "light" and light_state["cwmTheme"] == "light", (
                f"Light localStorage mismatch: {light_state}"
            )
            mon.assert_clean("T3-03")
            return f"Light <-> Dark persisted across {len(routes)} routes & reload"
        finally:
            ctx.close()

    runner.record("Tier 3", "T3-03", t3_03)

    # T3-04: Clean/Classic style persistence across reload on /survey/
    def t3_04() -> str:
        require_route_available(root, "survey/", skip_missing_routes)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        mon = PageMonitor(pg, base_url)
        try:
            navigate_route(pg, mon, f"{base_url}/survey/")
            initial = pg.locator("html").get_attribute("data-style") or "clean"
            pg.locator("#styleToggleBtn").click()
            pg.wait_for_timeout(100)
            toggled = pg.locator("html").get_attribute("data-style")
            assert toggled != initial, f"Style did not toggle from {initial!r}"
            pg.reload(wait_until="domcontentloaded")
            pg.wait_for_selector("#styleToggleBtn")
            after_reload = pg.locator("html").get_attribute("data-style")
            assert after_reload == toggled, f"data-style={after_reload!r} did not persist after reload (expected {toggled!r})"
            btn_label = pg.locator("#styleToggleBtn").inner_text().lower()
            assert toggled in btn_label, f"#styleToggleBtn label {btn_label!r} does not reflect {toggled!r}"
            mon.assert_clean("T3-04")
            return f"Clean/Classic style ({initial} -> {toggled}) persisted across reload"
        finally:
            ctx.close()

    runner.record("Tier 3", "T3-04", t3_04)


# ---------------------------------------------------------------------------
# Tier 4: End-to-End User Journeys (T4-01)
# ---------------------------------------------------------------------------

def run_tier4(
    runner: SuiteRunner,
    browser: Any,
    base_url: str,
    root: Optional[Path],
    skip_missing_routes: bool,
    timeout_ms: int,
) -> None:
    def t4_01() -> str:
        for route in ROUTE_PAGE_IDS:
            require_route_available(root, route, skip_missing_routes)

        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.set_default_timeout(timeout_ms)
        mon = PageMonitor(pg, base_url)
        try:
            # 1. Start on /, switch to Dark theme, select L2, follow #spec-atlas-link
            navigate_route(pg, mon, f"{base_url}/")
            pg.locator("#pwmThemeDark").click()
            pg.wait_for_timeout(100)
            pg.locator('.spec-card[data-level="L2"]').click()
            pg.locator("#spec-atlas-link").click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="survey"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            pg.wait_for_selector('#spectrumRail [data-layer="L2"]')
            pg.wait_for_timeout(180)
            assert pg.locator("html").get_attribute("data-theme") == "dark", "Dark theme dropped on /survey/"
            assert pg.locator('#spectrumRail [data-layer="L2"]').get_attribute("aria-selected") == "true", "L2 not active on /survey/"

            # 2. Search 'worldcoder', open paper modal, inspect BibTeX, close modal
            pg.locator("#searchInput").fill("worldcoder")
            pg.wait_for_timeout(120)
            open_btn = pg.locator("#papersContainer [data-open-paper]").first
            if open_btn.count() == 0:
                open_btn = pg.locator("[data-open-paper]").first
            open_btn.click()
            assert pg.locator("#paperDialog").evaluate("el => Boolean(el.open)"), "#paperDialog failed to open in T4-01"
            assert "@" in pg.locator("#paperDialogBody").inner_text(), "BibTeX missing in T4-01 modal"
            pg.locator("#closePaperBtn").click()

            # 3. Navigate via shell to /arena/, verify Dark theme & In Progress state
            pg.locator('.pwm-route-link[data-route-id="arena"]').click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="arena"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            pg.wait_for_timeout(180)
            assert pg.locator("html").get_attribute("data-theme") == "dark", "Dark theme dropped on /arena/"
            arena_txt = pg.locator("main").inner_text()
            assert re.search(r"In\s*Progress|推进中", arena_txt, re.I), "In Progress status missing on /arena/ in T4-01"
            assert not re.search(r"PWM-Arena|jz-jimmy|S01|S24", arena_txt, re.I), "Unreleased details leaked on /arena/ in T4-01"

            # 4. Navigate via shell to /method/, verify Dark theme & In Progress state
            pg.locator('.pwm-route-link[data-route-id="method"]').click()
            pg.wait_for_load_state("domcontentloaded")
            pg.wait_for_selector('body[data-pwm-page="method"]')
            pg.wait_for_selector("#pwm-shell-header .pwm-global-nav", state="attached")
            pg.wait_for_timeout(180)
            assert pg.locator("html").get_attribute("data-theme") == "dark", "Dark theme dropped on /method/"
            method_txt = pg.locator("main").inner_text()
            assert re.search(r"In\s*Progress|推进中", method_txt, re.I), "In Progress status missing on /method/ in T4-01"
            assert not re.search(r"pwm-state-v1|double_lock|PWM-Arena", method_txt, re.I), "Unreleased details leaked on /method/ in T4-01"

            mon.assert_clean("T4-01 full journey")
            return "full / -> /survey/?layer=L2 -> /arena/ -> /method/ journey completed with 0 errors"
        finally:
            ctx.close()

    runner.record("Tier 4", "T4-01", t4_01)


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify program-world-models.github.io (Static checks + Playwright Tiers 1-4)."
    )
    parser.add_argument("--tier", choices=["1", "2", "3", "4", "all"], default="all")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--base-url", type=str, default=None)
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--chrome-path", type=str, default=DEFAULT_CHROME_PATH)
    parser.add_argument("--skip-missing-routes", action="store_true")
    parser.add_argument("--skip-static", action="store_true")
    parser.add_argument("--json", type=Path, default=None, help="Write JSON report to path (or '-' for stdout)")
    parser.add_argument("--timeout-ms", type=int, default=15000)
    return parser.parse_args(argv)


def emit_json(runner: SuiteRunner, dest: Path) -> None:
    payload = {
        "summary": {
            "total": len(runner.results),
            "pass": runner.pass_count,
            "fail": runner.fail_count,
            "skip": runner.skip_count,
            "warn": len(runner.warnings),
        },
        "results": [asdict(r) for r in runner.results],
        "warnings": [asdict(w) for w in runner.warnings],
    }
    raw = json.dumps(payload, indent=2)
    if str(dest) == "-":
        print(raw)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(raw + "\n", encoding="utf-8")


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    root = Path(os.path.abspath(str(args.root)))
    if not root.is_dir():
        print(f"[FAIL] INIT | Root directory does not exist: {root}", file=sys.stderr)
        return 1

    json_stdout = args.json is not None and str(args.json) == "-"
    log_stream = sys.stderr if json_stdout else sys.stdout
    runner = SuiteRunner(stream=log_stream)
    run_static = (not args.skip_static) and args.tier in ("all", "1")
    need_browser = True

    def execute_with_base(base_url: str) -> int:
        if run_static:
            run_static_checks(runner, root, base_url, args.skip_missing_routes)

        if need_browser:
            if sync_playwright is None:
                runner.record("Init", "PW-INIT", lambda: (_ for _ in ()).throw(RuntimeError("playwright is not installed")))
                return 1
            chrome_path = Path(args.chrome_path)
            if not chrome_path.is_file():
                runner.record("Init", "CHROME-INIT", lambda: (_ for _ in ()).throw(RuntimeError(f"Chrome not found at {chrome_path}")))
                return 1

            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=str(chrome_path), headless=True)
                try:
                    if args.tier in ("all", "1"):
                        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
                        ctx.set_default_timeout(args.timeout_ms)
                        try:
                            run_tier1(runner, ctx, base_url, None if args.base_url else root, args.skip_missing_routes)
                        finally:
                            ctx.close()
                    if args.tier in ("all", "2"):
                        run_tier2(runner, browser, base_url, None if args.base_url else root, args.skip_missing_routes, args.timeout_ms)
                    if args.tier in ("all", "3"):
                        run_tier3(runner, browser, base_url, None if args.base_url else root, args.skip_missing_routes, args.timeout_ms)
                    if args.tier in ("all", "4"):
                        run_tier4(runner, browser, base_url, None if args.base_url else root, args.skip_missing_routes, args.timeout_ms)
                finally:
                    browser.close()
        return 0 if runner.fail_count == 0 else 1

    if args.base_url:
        exit_code = execute_with_base(args.base_url.rstrip("/"))
    else:
        with StaticServer(root, port=args.port) as srv:
            exit_code = execute_with_base(srv.base_url)

    print(
        f"\nSummary: {runner.pass_count} PASS, {runner.fail_count} FAIL, "
        f"{runner.skip_count} SKIP, {len(runner.warnings)} WARN",
        file=log_stream,
    )
    if args.json is not None:
        emit_json(runner, args.json)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
