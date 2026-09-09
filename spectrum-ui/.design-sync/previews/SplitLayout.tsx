import { SplitLayout, Card, SectionHeader, StatusPill, ProgressBar, Stat, Button, Money, Chip } from '@spectrum-connect/ui';

/** A project detail page — content on the left, escrow rail on the right. */
export const ProjectDetail = () => (
  <div className="bg-gray-50 p-6">
    <SplitLayout
      aside={
        <>
          <Card>
            <SectionHeader icon="fa-solid fa-shield-halved" title="Escrow" subtitle="Funds held securely" iconClass="bg-emerald-100 text-emerald-600" />
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Funded</span>
                  <span className="font-semibold text-gray-900"><Money amount={1750} /></span>
                </div>
                <ProgressBar percent={50} />
              </div>
              <Button fullWidth icon="fa-solid fa-check">Release Payment</Button>
            </div>
          </Card>
          <Stat label="Proposals" value={4} icon="fa-solid fa-inbox" />
        </>
      }
    >
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Promotional Video for Coffee Roasters</h2>
            <p className="text-sm text-gray-500 mt-1">Film &amp; Video · Videographer · Posted 3d ago</p>
          </div>
          <StatusPill status="in_progress" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4"><Chip>Video Editing</Chip><Chip>Color Grading</Chip><Chip>Motion Graphics</Chip></div>
        <p className="text-sm text-gray-600 leading-relaxed">
          We need a 60-second brand film for our new single-origin range — warm,
          unhurried, shot on location at the roastery. Deliverables are one master
          cut plus square and vertical crops for social.
        </p>
      </Card>
      <Card>
        <SectionHeader icon="fa-solid fa-list-check" title="Completion Checklist" subtitle="Where this project has got to" />
        <div className="space-y-3 text-sm">
          {[['Creator hired', true], ['Escrow funded', true], ['Delivery submitted', false], ['Payment released', false]].map(([l, done]) => (
            <div key={l as string} className="flex items-center gap-3">
              <i className={done ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-lock text-gray-300'} aria-hidden />
              <span className={done ? 'text-gray-900 font-medium' : 'text-gray-400'}>{l}</span>
            </div>
          ))}
        </div>
      </Card>
    </SplitLayout>
  </div>
);
