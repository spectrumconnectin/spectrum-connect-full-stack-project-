"""
Portfolio Smart Assist
======================
Deterministic writing suggestions for the Portfolio Builder ("AI-ish" one-click
improvements). No LLM call — proven copywriting formulas parameterized by the
creator's own context.

Each function keeps the signature (current_text, **context) -> List[str] and
returns 1–3 suggestions, so a real LLM call can later replace any body without
changing the router or the frontend contract.
"""
from __future__ import annotations

import re
from typing import List, Optional

# ── Static lookup tables ──────────────────────────────────────────────────────

ROLE_OUTCOME = {
    "video editor": "tell compelling stories",
    "videographer": "capture moments that move people",
    "cinematographer": "give every frame cinematic weight",
    "motion designer": "bring brands to life with motion",
    "graphic designer": "bring brands to life",
    "designer": "turn ideas into striking visuals",
    "photographer": "capture images that sell the story",
    "web developer": "build fast, reliable products",
    "developer": "ship dependable software",
    "writer": "find the words that win clients over",
    "copywriter": "turn attention into action",
    "illustrator": "draw worlds people want to look at",
    "animator": "make characters and ideas move",
    "sound designer": "make every scene sound as good as it looks",
    "music composer": "score the emotion under the picture",
    "colorist": "shape mood through color",
}
DEFAULT_OUTCOME = "deliver high-quality creative work"

CATEGORY_CHALLENGE = {
    "video editing": "shaping hours of raw footage into a tight, watchable story",
    "graphic design": "translating the brand into visuals that stand out",
    "web development": "building a fast, reliable experience end-to-end",
    "photography": "capturing the right moments in the right light",
    "writing/copy": "finding the message that actually lands",
    "motion graphics": "making the message move without losing clarity",
    "illustration": "creating original artwork that fits the brief",
    "audio/music": "getting the sound to carry the emotion",
}
DEFAULT_CHALLENGE = "delivering a polished result against a real-world brief"

CATEGORY_VERB = {
    "video editing": "Editing",
    "graphic design": "Designing",
    "web development": "Building",
    "photography": "Shooting",
    "writing/copy": "Writing",
    "motion graphics": "Animating",
    "illustration": "Illustrating",
    "audio/music": "Scoring",
}
DEFAULT_VERB = "Creating"

ACTION_VERBS = ("Delivered", "Designed", "Produced", "Crafted")
FILLER_WORDS = {"a", "an", "the", "my", "our", "some"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _first_sentence(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text)
    return parts[0].strip() if parts else text


def _rest_after_first_sentence(text: str) -> str:
    text = (text or "").strip()
    parts = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)
    return parts[1].strip() if len(parts) > 1 else ""


def _skills_list(skills: Optional[List[str]], n: int) -> List[str]:
    return [s.strip() for s in (skills or []) if s and s.strip()][:n]


# ── Bio ───────────────────────────────────────────────────────────────────────

def improve_bio(current_text: str = "", *, role: Optional[str] = None,
                years_experience: Optional[int] = None,
                skills: Optional[List[str]] = None) -> List[str]:
    role = (role or "").strip() or "Creative professional"
    sk = _skills_list(skills, 3)
    years = years_experience if years_experience and years_experience > 0 else None
    outcome = ROLE_OUTCOME.get(role.lower(), DEFAULT_OUTCOME)
    out: List[str] = []

    # 1 — credibility-first
    if sk:
        years_part = f" with {years}+ years of experience" if years else ""
        rest = _rest_after_first_sentence(current_text)
        tail = f" {rest}" if rest else " Available for freelance projects worldwide."
        pair = f"{sk[0]} and {sk[1]}" if len(sk) >= 2 else sk[0]
        out.append(f"{role}{years_part} specializing in {pair}.{tail}")

    # 2 — outcome-first
    skills_part = ", ".join(sk[:2]) + (f", and {sk[2]}" if len(sk) >= 3 else "") if sk else "craft and attention to detail"
    years_tail = f" {years}+ years turning ideas into finished work." if years else " Every project gets the same care as my best work."
    out.append(f"I help clients {outcome} through {skills_part}.{years_tail}")

    # 3 — concise/punchy
    if sk:
        bits = [role] + sk[:2] + ([f"{years}+ yrs"] if years else [])
        first = _first_sentence(current_text) or "Let’s make something worth showing off."
        out.append(f"{' · '.join(bits)}. {first}")

    return out[:3] or [f"{role} focused on quality, communication, and on-time delivery."]


# ── Project description ───────────────────────────────────────────────────────

def improve_project_description(current_text: str = "", *, project_title: Optional[str] = None,
                                category: Optional[str] = None,
                                client: Optional[str] = None) -> List[str]:
    cat = (category or "").strip()
    challenge = CATEGORY_CHALLENGE.get(cat.lower(), DEFAULT_CHALLENGE)
    who = client.strip() if client and client.strip() else "this project"
    title = (project_title or "this piece").strip()
    existing = (current_text or "").strip()
    out: List[str] = []

    # 1 — Problem → Solution → Result
    middle = _first_sentence(existing) or "I delivered a polished final result"
    middle = middle.rstrip(".")
    cat_word = cat or "creative"
    out.append(
        f"For {who}, the challenge was {challenge}. {middle}. "
        f"The result: a {cat_word.lower()} project that met the brief — on time and on budget."
    )

    # 2 — process-forward
    body = existing or "planning, execution, and careful refinement"
    out.append(
        f"“{title}” was a {cat_word.lower()} project built around {body if len(body) < 220 else _first_sentence(body).rstrip('.')}."
        f" Key focus areas: quality, client collaboration, and attention to detail."
    )

    # 3 — bullet-style rewrite (only if there's real text to restructure)
    if existing:
        sentences = [s.strip().rstrip(".") for s in re.split(r"(?<=[.!?])\s+", existing) if s.strip()][:3]
        bullets = []
        for i, s in enumerate(sentences):
            if not s.split()[0].capitalize() in ACTION_VERBS:
                s = f"{ACTION_VERBS[i % len(ACTION_VERBS)]} {s[0].lower()}{s[1:]}" if len(s) > 1 else s
            bullets.append(f"• {s}.")
        if bullets:
            out.append("\n".join(bullets))

    return out[:3]


# ── Project title ─────────────────────────────────────────────────────────────

def improve_project_title(current_text: str = "", *, category: Optional[str] = None) -> List[str]:
    cat = (category or "").strip()
    text = (current_text or "").strip()
    verb = CATEGORY_VERB.get(cat.lower(), DEFAULT_VERB)

    if not text:
        # Nothing to transform — offer category-based starters.
        base = cat or "Creative"
        return [
            f"{base} Case Study — [Client or Brand]",
            f"{verb} [Project Name] for [Client]",
            f"[Client]: {base} that delivered results",
        ]

    # 1 — cleaned title-case, filler words stripped
    words = [w for w in text.split() if w.lower() not in FILLER_WORDS]
    cleaned = " ".join(w if w.isupper() else w.capitalize() for w in words) or text
    out = [cleaned]

    # 2 — category suffix
    if cat and cat.lower() not in text.lower():
        out.append(f"{text} — {cat}")

    # 3 — verb-prefixed variant
    if not text.lower().startswith(verb.lower()):
        out.append(f"{verb} {text[0].lower()}{text[1:]}" if len(text) > 1 else f"{verb} {text}")

    return out[:3]


# ── Skills summary ────────────────────────────────────────────────────────────

def improve_skills_summary(*, skills: Optional[List[str]] = None,
                           role: Optional[str] = None,
                           years_experience: Optional[int] = None) -> List[str]:
    sk = _skills_list(skills, 3)
    role = (role or "").strip() or "Creative professional"
    if not sk:
        return [f"{role} — add a few skills to generate a summary."]

    out: List[str] = []
    if len(sk) >= 3:
        out.append(f"{role} skilled in {sk[0]}, {sk[1]}, and {sk[2]}.")
        out.append(f"Specializing in {sk[0]} and {sk[1]}, with hands-on experience in {sk[2]}.")
    elif len(sk) == 2:
        out.append(f"{role} skilled in {sk[0]} and {sk[1]}.")
        out.append(f"Specializing in {sk[0]}, with hands-on experience in {sk[1]}.")
    else:
        out.append(f"{role} specializing in {sk[0]}.")

    years = years_experience or 0
    bucket = "Veteran" if years >= 5 else ("Experienced" if years >= 2 else "Emerging")
    out.append(f"{bucket} {role.lower()} — {', '.join(sk)}.")
    return out[:3]
