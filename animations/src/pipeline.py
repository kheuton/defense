"""
Predict-then-Optimize pipeline animation.
Renders the five-stage pipeline and highlights the disconnect.

Usage:
    manim -pql pipeline.py PipelineIntro        # low quality, preview
    manim -pqh pipeline.py PipelineIntro        # high quality
    manim -pqh pipeline.py DisconnectHighlight  # second animation
"""

from manim import *

PURPLE = "#7c6af7"
TEAL   = "#50c8a8"
CORAL  = "#ff7c57"
YELLOW = "#ffd166"
BG     = "#11111e"
MUTED  = "#888899"


def pipeline_box(label: str, sublabel: str = "", color: str = WHITE) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.15,
        width=2.2, height=1.1,
        fill_color=color,
        fill_opacity=0.12,
        stroke_color=color,
        stroke_width=1.5,
    )
    text = Text(label, font="Inter", font_size=22, color=WHITE, weight=BOLD)
    if sublabel:
        sub = Text(sublabel, font="Inter", font_size=16, color=MUTED)
        group = VGroup(text, sub).arrange(DOWN, buff=0.08)
    else:
        group = text
    group.move_to(rect.get_center())
    return VGroup(rect, group)


class PipelineIntro(Scene):
    """Animate the predict-then-optimize pipeline left to right."""

    def construct(self):
        self.camera.background_color = BG

        stages = [
            ("Historical\nData",    "",                WHITE),
            ("Prediction\nModel",   "trained on MSE",  TEAL),
            ("Predicted\nCounts",   r"$\hat{y}_\ell$", WHITE),
            ("Select\nTop K",       "optimization",    PURPLE),
            ("Intervention\nDecision", "",             YELLOW),
        ]

        boxes = VGroup(*[pipeline_box(l, s, c) for l, s, c in stages])
        boxes.arrange(RIGHT, buff=0.45)
        boxes.move_to(ORIGIN)

        arrows = VGroup(*[
            Arrow(
                boxes[i].get_right(), boxes[i + 1].get_left(),
                buff=0.1, color=MUTED, stroke_width=2,
                max_tip_length_to_length_ratio=0.2,
            )
            for i in range(len(boxes) - 1)
        ])

        # Animate in sequentially
        for i, (box, arrow) in enumerate(zip(boxes, list(arrows) + [None])):
            self.play(FadeIn(box, shift=UP * 0.2), run_time=0.45)
            if arrow:
                self.play(GrowArrow(arrow), run_time=0.25)

        self.wait(1.5)


class DisconnectHighlight(Scene):
    """Show the training–decision disconnect by highlighting objectives."""

    def construct(self):
        self.camera.background_color = BG

        # ---- Training objective ----
        train_label = Text("Training objective", font="Inter",
                           font_size=24, color=MUTED)
        train_eq = MathTex(
            r"\min_\theta \; \frac{1}{|\mathcal{L}|} \sum_\ell \ell(\hat{y}_\ell, y_\ell)",
            font_size=38, color=TEAL,
        )
        train_note = Text("minimize prediction error", font="Inter",
                          font_size=20, color=TEAL)
        train_group = VGroup(train_label, train_eq, train_note)\
            .arrange(DOWN, buff=0.25)\
            .shift(LEFT * 3.5)

        # ---- Decision objective ----
        dec_label = Text("Decision objective", font="Inter",
                         font_size=24, color=MUTED)
        dec_eq = MathTex(
            r"\max_{|S|=K} \sum_{\ell \in S} y_\ell",
            font_size=38, color=PURPLE,
        )
        dec_note = Text("correctly rank the top K", font="Inter",
                        font_size=20, color=PURPLE)
        dec_group = VGroup(dec_label, dec_eq, dec_note)\
            .arrange(DOWN, buff=0.25)\
            .shift(RIGHT * 3.5)

        # ---- Disconnect arrow ----
        disconnect = Text("≠", font="Inter", font_size=72, color=CORAL)
        disconnect.move_to(ORIGIN)

        self.play(FadeIn(train_group, shift=LEFT * 0.3), run_time=0.7)
        self.play(FadeIn(dec_group, shift=RIGHT * 0.3), run_time=0.7)
        self.wait(0.5)
        self.play(Write(disconnect), run_time=0.6)
        self.wait(2)

        # ---- Thought experiment ----
        thought = Text(
            'Add 1000 to all predictions in top K\n'
            '→  error ↑↑   decision unchanged',
            font="Inter", font_size=22, color=YELLOW,
            line_spacing=1.4,
        )
        thought.to_edge(DOWN, buff=0.6)
        box = SurroundingRectangle(thought, corner_radius=0.1,
                                   color=YELLOW, buff=0.2, fill_opacity=0.06,
                                   fill_color=YELLOW)
        self.play(FadeIn(box), Write(thought), run_time=1)
        self.wait(2.5)
