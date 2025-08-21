// src/layouts/ThreePaneLayout.tsx
import React from "react";

/**
 * ThreePaneLayout — common shell for Future Human app screens.
 *
 * Structure:
 *  ┌─ sidebar (scrollable, fixed width) ─┬─ center (fills remaining) ─┬ right (scrollable, fixed width) ┐
 *  │                                     │                            │                                 │
 *  │  <sidebar/>                         │ <center/>                  │ <right/>                        │
 *  └─────────────────────────────────────┴────────────────────────────┴─────────────────────────────────┘
 *
 * • Full height (h-screen), black background, independent vertical scrolling per pane.
 * • Pass `rightWidth={420}` (px or CSS string). Pass `0` to hide the right pane.
 * • Pass `sidebarWidth` if you want a wider/narrower sidebar. Defaults to 220px.
 * • On mobile (< md) the layout stacks: sidebar → center → right (if any).
 */

export type ThreePaneLayoutProps = {
  /** Left column. Typical: logo + nav + agent list */
  sidebar: React.ReactNode;
  /** Middle column content */
  center: React.ReactNode;
  /** Right column content (forms, etc). Hidden if rightWidth is 0 */
  right?: React.ReactNode;
  /** Fixed width for the right column. Number (px) or CSS size string. Pass 0 to disable. */
  rightWidth?: number | string;
  /** Fixed width for the sidebar. Number (px) or CSS size string. */
  sidebarWidth?: number | string;
  /** Optional className on the outermost wrapper */
  className?: string;
  /** Padding for each pane (Tailwind classes). Defaults tuned to mock. */
  padSidebarClass?: string;
  padCenterClass?: string;
  padRightClass?: string;
  /** Optional max width for the center content */
  centerMaxWidth?: number | string;
};

function toCssSize(v: number | string | undefined, fallback: string) {
  if (v === 0) return "0px"; // explicit hide
  if (v == null) return fallback;
  return typeof v === "number" ? `${v}px` : v;
}

const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({
  sidebar,
  center,
  right,
  rightWidth = 420,
  sidebarWidth = 220,
  className = "",
  padSidebarClass = "p-4 md:p-6",
  padCenterClass = "p-4 md:p-6",
  padRightClass = "p-4 md:p-6",
  centerMaxWidth,
}) => {
  const rightCss = toCssSize(rightWidth, "420px");
  const sidebarCss = toCssSize(sidebarWidth, "220px");
  const hasRight = rightWidth !== 0 && !!right;

  const gridColsClass = hasRight
    ? "md:grid-cols-[var(--sidebar)_1fr_var(--right)]"
    : "md:grid-cols-[var(--sidebar)_1fr]";

  return (
    <div className={`h-screen w-full bg-black text-white overflow-hidden ${className}`}
      style={{ ['--right' as any]: rightCss, ['--sidebar' as any]: sidebarCss }}>
      <div className={`grid h-full grid-cols-1 ${gridColsClass} gap-4 md:gap-6`}>
        {/* Sidebar */}
        <aside className={`overflow-y-auto border-r border-[#1f1f1f] ${padSidebarClass}`}>
          {sidebar}
        </aside>

        {/* Center */}
        <main className={`min-h-0 overflow-hidden ${padRightClass}`}>
          <div
            className="h-full overflow-y-auto no-scrollbar pr-3"
            style={centerMaxWidth ? { maxWidth: typeof centerMaxWidth === 'number' ? `${centerMaxWidth}px` : centerMaxWidth } : undefined}
          >
            {center}
          </div>
        </main>

        {/* Right (optional) */}
        {hasRight && (
          <section className={`overflow-y-auto no-scrollbar border-l border-[#1f1f1f] ${padRightClass}`}>
            {right}
          </section>
        )}
      </div>
    </div>
  );
};

export default ThreePaneLayout;

/**
 * ---------------------------------------------------------------------------
 * Example usage (Account Information screen)
 *
 * import ThreePaneLayout from "../layouts/ThreePaneLayout";
 *
 * export default function AccountInformationPage() {
 *   return (
 *     <ThreePaneLayout
 *       sidebar={<SidebarNav />}
 *       center={
 *         <HeroCard>
 *           <img src="/assets/face-hero.jpg" className="w-full h-[70vh] object-cover rounded-3xl" />
 *         </HeroCard>
 *       }
 *       rightWidth={480}
 *       right={<AccountForm />}
 *     />
 *   );
 * }
 *
 * // To disable the right column entirely:
 * // <ThreePaneLayout sidebar={<SidebarNav />} center={<Something />} rightWidth={0} />
 *
 * // For the Agent Creation screen (agent-creation-layout.png) just swap `center` and `right` contents.
 */
