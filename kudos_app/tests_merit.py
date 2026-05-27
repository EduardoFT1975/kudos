"""Tests de servicios y API de Mérito + Mi Mundo (P32.05).

Cubre el espejo Python ↔ TypeScript de:
  · add_event / addMeritEvent
  · compute_snapshot / computeMerit
  · tick_streak / tickStreak
  · mark_visited / markVisited
  · Bookmark XOR Capsule/Place

Ejecutar:  python manage.py test kudos_app.tests_merit -v 2
"""
from __future__ import annotations

from datetime import timedelta

from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from kudos_app.models import (
    Bookmark, Capsule, Collection, MeritEvent, Place, Streak, User, Visit,
)
from kudos_app.services import merit as merit_service


def _make_user(alias='testuser', email=None):
    """Crea un User · firma del UserManager custom requiere `uid` + `alias`.

    Para tests usamos `uid = alias` por simplicidad · ambos son `unique=True`
    pero la app permite que coincidan textualmente.
    """
    return User.objects.create_user(
        uid=alias,
        alias=alias,
        email=email or f'{alias}@kudos.app',
        password='pw-test-123',
    )


class MeritEventServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.place = Place.objects.create(slug='rome', name='Roma', country='IT')

    def test_add_event_creates_record(self):
        ev = merit_service.add_event(
            user=self.user, pillar='descubrimiento', points=15, label='Test',
        )
        self.assertEqual(ev.points, 15)
        self.assertEqual(ev.pillar, 'descubrimiento')
        self.assertEqual(MeritEvent.objects.count(), 1)

    def test_add_event_rejects_invalid_pillar(self):
        with self.assertRaises(ValueError):
            merit_service.add_event(
                user=self.user, pillar='invalid_pillar', points=10,
            )

    def test_add_event_with_place_link(self):
        ev = merit_service.add_event(
            user=self.user, pillar='descubrimiento', points=15,
            label='Visit', place=self.place,
        )
        self.assertEqual(ev.place_id, self.place.id)


class ComputeSnapshotTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_snapshot_empty(self):
        snap = merit_service.compute_snapshot(self.user)
        self.assertEqual(snap['total'], 0)
        self.assertEqual(snap['level'], 1)
        self.assertEqual(snap['per_pillar']['descubrimiento'], 0)
        self.assertEqual(len(snap['last_30']), 30)
        self.assertEqual(snap['recent'], [])

    def test_snapshot_sums_per_pillar(self):
        merit_service.add_event(user=self.user, pillar='comunidad', points=25, label='Share')
        merit_service.add_event(user=self.user, pillar='descubrimiento', points=15, label='Visit')
        merit_service.add_event(user=self.user, pillar='comunidad', points=10, label='Share 2')
        snap = merit_service.compute_snapshot(self.user)
        self.assertEqual(snap['total'], 50)
        self.assertEqual(snap['per_pillar']['comunidad'], 35)
        self.assertEqual(snap['per_pillar']['descubrimiento'], 15)
        self.assertEqual(snap['per_pillar']['creacion'], 0)

    def test_level_curve_matches_store_ts(self):
        # store.ts breakpoints: 0, 100, 250, 500, 800, 1200, 1700, 2300, 3000...
        cases = [
            (0, 1), (99, 1), (100, 2), (249, 2), (250, 3),
            (500, 4), (800, 5), (1200, 6), (3000, 9),
        ]
        for total, expected_level in cases:
            user = _make_user(alias=f'lvl_{total}', email=f'lvl_{total}@k.app')
            if total > 0:
                merit_service.add_event(
                    user=user, pillar='creacion', points=total, label='boost',
                )
            snap = merit_service.compute_snapshot(user)
            self.assertEqual(snap['level'], expected_level,
                             f'total={total} expected level={expected_level} got {snap["level"]}')

    def test_recent_limited_to_8(self):
        for i in range(12):
            merit_service.add_event(user=self.user, pillar='creacion', points=1, label=f'e{i}')
        snap = merit_service.compute_snapshot(self.user)
        self.assertEqual(len(snap['recent']), 8)


class StreakServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.today = timezone.now().date()

    def test_tick_first_action_creates_streak(self):
        streak = merit_service.tick_streak(self.user)
        self.assertEqual(streak.days, 1)
        self.assertEqual(streak.best_days, 1)
        self.assertEqual(streak.last_day, self.today)

    def test_tick_same_day_no_advance(self):
        merit_service.tick_streak(self.user)
        streak = merit_service.tick_streak(self.user)
        self.assertEqual(streak.days, 1)

    def test_tick_consecutive_days_advances(self):
        Streak.objects.create(
            user=self.user, days=1, best_days=1,
            last_day=self.today - timedelta(days=1),
        )
        streak = merit_service.tick_streak(self.user)
        self.assertEqual(streak.days, 2)
        self.assertEqual(streak.best_days, 2)

    def test_tick_broken_streak_resets_to_1(self):
        Streak.objects.create(
            user=self.user, days=5, best_days=5,
            last_day=self.today - timedelta(days=3),
        )
        streak = merit_service.tick_streak(self.user)
        self.assertEqual(streak.days, 1)
        self.assertEqual(streak.best_days, 5)  # récord se mantiene

    def test_read_streak_missing_returns_zero(self):
        streak = merit_service.read_streak(self.user)
        self.assertEqual(streak.days, 0)
        self.assertIsNone(streak.last_day)


class MarkVisitedTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.place = Place.objects.create(slug='rome', name='Roma', country='IT')

    def test_first_visit_creates_event(self):
        visit, created = merit_service.mark_visited(user=self.user, place=self.place)
        self.assertTrue(created)
        self.assertEqual(Visit.objects.count(), 1)
        events = MeritEvent.objects.filter(user=self.user)
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().pillar, 'descubrimiento')
        self.assertEqual(events.first().points, 15)

    def test_repeat_visit_is_idempotent(self):
        merit_service.mark_visited(user=self.user, place=self.place)
        visit, created = merit_service.mark_visited(user=self.user, place=self.place)
        self.assertFalse(created)
        self.assertEqual(Visit.objects.count(), 1)
        self.assertEqual(MeritEvent.objects.count(), 1)


class BookmarkConstraintTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.place = Place.objects.create(slug='rome', name='Roma', country='IT')

    def test_bookmark_with_place_only(self):
        bm = Bookmark.objects.create(user=self.user, place=self.place)
        self.assertIsNone(bm.capsule)
        self.assertEqual(bm.place, self.place)

    def test_bookmark_both_null_violates_xor(self):
        with self.assertRaises(IntegrityError):
            Bookmark.objects.create(user=self.user)

    def test_bookmark_user_place_uniqueness(self):
        Bookmark.objects.create(user=self.user, place=self.place)
        with self.assertRaises(IntegrityError):
            Bookmark.objects.create(user=self.user, place=self.place)
