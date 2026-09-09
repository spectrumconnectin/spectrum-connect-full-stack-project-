import {
  AppShell, AppHeader, BottomNav, WelcomeBanner, StatGrid, ListSection,
  Stat, Card, StatusPill, Chip, Button, Money,
} from '@spectrum-connect/ui';

const TABS = [
  { label: 'Home', icon: 'fa-solid fa-house', active: true },
  { label: 'Discover', icon: 'fa-solid fa-compass' },
  { label: 'Projects', icon: 'fa-solid fa-briefcase' },
  { label: 'Messages', icon: 'fa-solid fa-comment' },
  { label: 'Profile', icon: 'fa-solid fa-user' },
];

/** A whole creator dashboard — the shape of the signed-in home screen. */
export const CreatorDashboard = () => (
  <AppShell
    header={<AppHeader links={['Dashboard', 'Find Projects', 'Smart Connect', 'My Work']} hasNotifications hasMessages />}
    bottomNav={<BottomNav items={TABS} />}
  >
    <WelcomeBanner
      name="Epun Manula"
      message="You have 3 active projects and 2 proposals awaiting review."
      action={<Button variant="white" size="lg" icon="fa-solid fa-magnifying-glass">Find Projects</Button>}
    />
    <StatGrid>
      <Stat label="Total Applied" value={12} icon="fa-solid fa-paper-plane" />
      <Stat label="Under Review" value={4} icon="fa-solid fa-clock" iconClass="bg-amber-50 text-amber-600" />
      <Stat label="Shortlisted" value={2} icon="fa-solid fa-star" iconClass="bg-purple-50 text-purple-600" />
      <Stat label="Hired" value={3} icon="fa-solid fa-circle-check" iconClass="bg-emerald-50 text-emerald-600" />
    </StatGrid>
    <ListSection title="Active Projects (2)" icon="fa-solid fa-briefcase">
      {[
        { t: 'Promotional Video for Coffee Roasters', s: 'in_progress', b: 1750 },
        { t: 'Brand Identity for Acme Studio', s: 'pending_funding', b: 900 },
      ].map((p) => (
        <Card key={p.t} compact interactive>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{p.t}</p>
              <p className="text-xs text-gray-400 mt-0.5">Film &amp; Video · <Money amount={p.b} /></p>
            </div>
            <StatusPill status={p.s} />
          </div>
        </Card>
      ))}
    </ListSection>
  </AppShell>
);

/** The client side of the same shell — different nav, same skeleton. */
export const ClientProjectList = () => (
  <AppShell
    header={<AppHeader links={['Dashboard', 'My Projects', 'Smart Connect', 'Payments']} hasNotifications />}
    bottomNav={<BottomNav items={[
      { label: 'Home', icon: 'fa-solid fa-house' },
      { label: 'Creators', icon: 'fa-solid fa-users' },
      { label: 'Projects', icon: 'fa-solid fa-briefcase', active: true },
      { label: 'Messages', icon: 'fa-solid fa-comment' },
    ]} />}
  >
    <ListSection title="Active Projects (3)">
      {[
        { t: 'Promotional Video for Coffee Roasters', s: 'open', b: 1750, p: 4 },
        { t: 'Logo Design for Acme Coffee', s: 'in_review', b: 900, p: 7 },
        { t: 'Website Copywriting', s: 'pending_funding', b: 650, p: 2 },
      ].map((p) => (
        <Card key={p.t}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900">{p.t}</h3>
              <p className="text-sm text-gray-500">Film &amp; Video</p>
            </div>
            <StatusPill status={p.s} />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3"><Chip>Video Editing</Chip><Chip>Color Grading</Chip></div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-900"><Money amount={p.b} /></span>
            <span className="text-cobalt font-semibold">{p.p} proposals</span>
          </div>
        </Card>
      ))}
    </ListSection>
  </AppShell>
);
