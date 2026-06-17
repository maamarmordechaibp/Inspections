import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context';

/**
 * Lightweight, dependency-free product tour / onboarding walkthrough.
 *
 * - Runs automatically the first time a user signs in (persisted in localStorage).
 * - Can be replayed anytime by dispatching `window.dispatchEvent(new Event('dousefire:start-tour'))`
 *   (the Header "Help" button does this).
 * - Steps anchor to elements tagged with a `data-tour="..."` attribute. If the target
 *   is missing or hidden (e.g. on mobile), the step is centered on screen instead.
 */

const STORAGE_KEY = 'dousefire_onboarded_v1';
export const START_TOUR_EVENT = 'dousefire:start-tour';

type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center';

interface TourStep {
  target?: string; // value of data-tour attribute
  title: string;
  body: string;
  placement?: Placement;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Find the first VISIBLE element matching the selector (handles duplicated
// mobile/desktop markup where one copy is display:none).
function findVisibleTarget(tourId: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${tourId}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && node.offsetParent !== null) {
      return node;
    }
  }
  return null;
}

export default function OnboardingTour() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const role = user?.role ?? 'technician';

  const steps: TourStep[] = (() => {
    const isField = role === 'technician';
    const list: TourStep[] = [
      {
        placement: 'center',
        title: t('tour.welcome.title', 'Welcome to DouseFire'),
        body: t(
          'tour.welcome.body',
          "Let's take a quick 60-second tour so you know exactly where everything is. You can replay it anytime from the Help button.",
        ),
      },
      {
        target: 'nav',
        placement: 'right',
        title: t('tour.nav.title', 'Your main menu'),
        body: t(
          'tour.nav.body',
          'Everything is grouped here by area — Inspections, Schedule, Customers, Assets and more. What you see depends on your role, so the menu only shows what you need.',
        ),
      },
      {
        target: 'nav-inspections',
        placement: 'right',
        title: t('tour.inspections.title', 'Inspections live here'),
        body: isField
          ? t('tour.inspections.body.tech', 'Open Inspections to see the jobs assigned to you. Tap one to run the NFPA checklist, add photos, capture signatures and log deficiencies — even offline.')
          : t('tour.inspections.body.office', 'Open Inspections to create, assign and track every inspection. Tap one to view its checklist, findings and report.'),
      },
      {
        target: 'header-help',
        placement: 'bottom',
        title: t('tour.help.title', 'Stuck? Get help here'),
        body: t('tour.help.body', 'Click the Help button anytime to replay this tour. Empty pages also include short tips to guide your next step.'),
      },
      {
        target: 'header-notifications',
        placement: 'bottom',
        title: t('tour.notifications.title', 'Stay in the loop'),
        body: t('tour.notifications.body', 'New assignments, reminders and overdue alerts show up here with a red badge.'),
      },
      {
        target: 'header-user',
        placement: 'bottom',
        title: t('tour.account.title', 'Your account & language'),
        body: t('tour.account.body', 'Open your profile to switch between English and Español, manage preferences, or sign out.'),
      },
      {
        placement: 'center',
        title: t('tour.finish.title', "You're all set"),
        body: isField
          ? t('tour.finish.body.tech', 'Tip: head to Inspections to start your first assigned job. Tap the Help button if you ever need this tour again.')
          : t('tour.finish.body.office', 'Tip: start in Schedule or Dispatch to assign jobs, or open Customers to add a new account. The Help button replays this tour anytime.'),
      },
    ];
    return list;
  })();

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore storage errors (private mode) */
    }
  }, []);

  // Auto-start on first login.
  useEffect(() => {
    if (!user) return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }
    if (!seen) {
      const timer = setTimeout(start, 700);
      return () => clearTimeout(timer);
    }
  }, [user, start]);

  // Allow manual replay via global event.
  useEffect(() => {
    const handler = () => start();
    window.addEventListener(START_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_TOUR_EVENT, handler);
  }, [start]);

  const currentStep = steps[stepIndex];

  // Measure the target for the current step.
  useLayoutEffect(() => {
    if (!active || !currentStep) return;

    function measure() {
      if (!currentStep.target) {
        setRect(null);
        return;
      }
      const el = findVisibleTarget(currentStep.target);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, currentStep]);

  // Keyboard navigation.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish, steps.length]);

  if (!active || !currentStep) return null;

  const isLast = stepIndex === steps.length - 1;
  const PAD = 6;

  // Compute tooltip position.
  const tooltipWidth = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipStyle: React.CSSProperties;
  let highlightStyle: React.CSSProperties | null = null;

  if (!rect || currentStep.placement === 'center') {
    tipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(tooltipWidth, vw - 32),
    };
  } else {
    highlightStyle = {
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    };

    // Decide placement automatically when there is not enough room.
    let placement = currentStep.placement ?? 'auto';
    const spaceRight = vw - (rect.left + rect.width);
    const spaceBelow = vh - (rect.top + rect.height);
    if (placement === 'auto') {
      if (spaceRight > tooltipWidth + 24) placement = 'right';
      else if (spaceBelow > 200) placement = 'bottom';
      else placement = 'top';
    }
    if (placement === 'right' && spaceRight < tooltipWidth + 24) placement = 'bottom';

    const width = Math.min(tooltipWidth, vw - 32);
    if (placement === 'right') {
      tipStyle = {
        top: Math.max(12, Math.min(rect.top, vh - 220)),
        left: rect.left + rect.width + 16,
        width,
      };
    } else if (placement === 'left') {
      tipStyle = { top: Math.max(12, rect.top), left: Math.max(12, rect.left - width - 16), width };
    } else if (placement === 'top') {
      tipStyle = {
        top: 'auto',
        bottom: vh - rect.top + 16,
        left: Math.max(12, Math.min(rect.left, vw - width - 12)),
        width,
      };
    } else {
      // bottom
      tipStyle = {
        top: rect.top + rect.height + 16,
        left: Math.max(12, Math.min(rect.left, vw - width - 12)),
        width,
      };
    }
  }

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dimmed backdrop with a cut-out highlight (via huge box-shadow) */}
      {highlightStyle ? (
        <div
          className="fixed rounded-xl transition-all duration-200 pointer-events-none"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
            outline: '2px solid rgba(245, 197, 66, 0.9)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-brand-navy/65" onClick={finish} />
      )}

      {/* Tooltip card */}
      <div
        className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 animate-[slideIn_0.2s_ease-out]"
        style={tipStyle}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-brand-cyan uppercase tracking-wider">
            {t('tour.step', 'Step')} {stepIndex + 1} / {steps.length}
          </span>
        </div>
        <h3 className="text-base font-bold text-brand-navy mb-1.5">{currentStep.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{currentStep.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4 mb-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-5 bg-brand-gold' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={finish}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            {t('tour.skip', 'Skip tour')}
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {t('tour.back', 'Back')}
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIndex((i) => Math.min(i + 1, steps.length - 1)))}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 transition-colors cursor-pointer"
            >
              {isLast ? t('tour.done', 'Get started') : t('tour.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
