// Tabs shown in the BusinessContextBar (subset of all dashboard tabs)
export const CONTEXT_BAR_TABS = [
  { slug: 'overview',  label: 'Overview' },
  { slug: 'demand',    label: 'Demand Intel' },
  { slug: 'menu',      label: 'Menu' },
  { slug: 'specials',  label: 'Specials' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'reviews',   label: 'Reviews' },
  { slug: 'settings',  label: 'Settings' },
];

// Full slug ↔ Dashboard tab label mapping (all 12 tabs)
export const SLUG_TO_TAB = {
  overview:       'Overview',
  demand:         'Demand Intel',
  menu:           'Menu',
  specials:       'Promoted Specials',
  analytics:      'Call Analytics',
  integrations:   'Integrations',
  injectors:      'Injectors',
  'before-after': 'Before & Afters',
  reviews:        'Reviews',
  submissions:    'Submissions',
  disputes:       'Disputes',
  settings:       'Settings',
};

// Sidebar navigation items with lucide icon names.
// Grouped into sections for visual separation in the sidebar.
export const SIDEBAR_ITEMS = [
  { slug: 'overview',       label: 'Overview',          icon: 'LayoutDashboard' },
  { slug: 'demand',         label: 'Demand Intel',      icon: 'TrendingUp' },
  { slug: 'menu',           label: 'Prices & Menu',     icon: 'DollarSign' },
  { slug: 'specials',       label: 'Specials',          icon: 'Sparkles' },
  { slug: 'analytics',      label: 'Analytics',         icon: 'BarChart3' },
  { slug: 'reviews',        label: 'Reviews',           icon: 'Star' },
  { slug: 'injectors',      label: 'Team',              icon: 'Users' },
  { slug: 'before-after',   label: 'Photos',            icon: 'Camera' },
  { slug: 'submissions',    label: 'Submissions',       icon: 'FileText' },
  { slug: 'disputes',       label: 'Disputes',          icon: 'AlertTriangle' },
  { slug: 'integrations',   label: 'Integrations',      icon: 'Plug' },
  { slug: 'settings',       label: 'Settings',          icon: 'Settings' },
];

const TAB_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_TAB).map(([slug, label]) => [label, slug]),
);

export function tabLabelFromSlug(slug) {
  return SLUG_TO_TAB[slug] || 'Overview';
}

export function tabSlugFromLabel(label) {
  return TAB_TO_SLUG[label] || 'overview';
}
