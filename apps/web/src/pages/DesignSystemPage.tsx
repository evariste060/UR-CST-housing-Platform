import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AvailabilityBadge, Badge, ReviewBadge } from '../components/Badge';
import { Button, buttonClass } from '../components/Button';
import { ChoiceField } from '../components/ChoiceCards';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { OnThisPage, type OnThisPageItem } from '../components/OnThisPage';
import { PasswordField } from '../components/PasswordField';
import { PickGroup, ToggleChip } from '../components/PickGroup';
import { PropertyCard, type PropertyCardData } from '../components/PropertyCard';
import { EmptyState, ErrorState, SkeletonCards, SuccessState } from '../components/StateBlocks';
import { ToggleTile } from '../components/ToggleTile';
import { useToast } from '../components/Toast';
import { useDisplay } from '../display/DisplayProvider';

const SECTIONS: OnThisPageItem[] = [
  { id: 'ds-colour', label: 'Colour', icon: 'palette' },
  { id: 'ds-type', label: 'Typography', icon: 'text' },
  { id: 'ds-space', label: 'Spacing', icon: 'spacing' },
  { id: 'ds-buttons', label: 'Buttons', icon: 'target' },
  { id: 'ds-inputs', label: 'Inputs', icon: 'edit' },
  { id: 'ds-choices', label: 'Choices', icon: 'hand' },
  { id: 'ds-way', label: 'Wayfinding', icon: 'map' },
  { id: 'ds-status', label: 'Status', icon: 'shieldcheck' },
  { id: 'ds-cards', label: 'Cards', icon: 'grid' },
  { id: 'ds-nav', label: 'Navigation', icon: 'menu' },
  { id: 'ds-feedback', label: 'Feedback', icon: 'message' },
  { id: 'ds-states', label: 'States', icon: 'info' },
];

const SWATCHES = [
  ['Primary blue', '#1D4ED8', 'Actions, links, focus', '6.7:1 on white'],
  ['Dark text', '#0F172A', 'Text, headings', '17.9:1 on white'],
  ['Light surface', '#F8FAFC', 'Page background', ''],
  [
    'Success green',
    '#16A34A',
    'Success icons and fills; text uses #15803D',
    '#15803D: 5.0:1 on white',
  ],
  ['Muted text', '#475569', 'Supporting text', '7.6:1 on white'],
  ['Warning', '#92400E', 'Pending review text on #FEF6E0', ''],
  ['Error', '#B91C1C', 'Errors and destructive actions', '6.5:1 on white'],
  ['Border', '#E2E8F0', 'Card and table lines', ''],
] as const;

const SPACING = [8, 16, 24, 32, 40, 48, 64];

function demoPhoto(top: string, bottom: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="${top}"/><rect y="130" width="320" height="70" fill="${bottom}"/><path d="M110 130V85l50-35 50 35v45z" fill="#fff"/><rect x="148" y="98" width="24" height="32" fill="${bottom}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SAMPLE_PROPERTIES: PropertyCardData[] = [
  {
    id: 'sample-1',
    title: 'Bright single room near campus',
    rent: 85000,
    distanceKm: 0.8,
    availability: 'AVAILABLE',
    typeLabel: 'Single room',
    layoutLabel: 'Self-contained',
    area: 'Kiyovu',
    photo: demoPhoto('#BFD3FB', '#7FA3EC'),
    facilities: [
      { label: 'Private bathroom', icon: 'bath' },
      { label: 'Water + electricity', icon: 'bolt' },
      { label: 'Security', icon: 'shield' },
    ],
    spokenSummary:
      'Bright single room near campus. 85,000 RWF per month. 0.8 km from UR-CST. Available now. Single room, self-contained. Private bathroom. Water included. Electricity included. Security included.',
  },
  {
    id: 'sample-2',
    title: 'Shared room with study desk',
    rent: 45000,
    distanceKm: 1.6,
    availability: 'OCCUPIED',
    typeLabel: 'Shared room',
    layoutLabel: 'Shared facilities',
    area: 'Nyamirambo',
    photo: demoPhoto('#C9E7D3', '#86C79D'),
    facilities: [
      { label: 'Shared bathroom', icon: 'bath' },
      { label: 'Water only', icon: 'water' },
    ],
    spokenSummary:
      'Shared room with study desk. 45,000 RWF per month. 1.6 km from UR-CST. Currently occupied. Shared room, shared facilities. Shared bathroom. Water included. Electricity not included.',
  },
];

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} data-sec={title} className="ds-section">
      <h2 className="t-section">{title}</h2>
      {intro && <p className="muted">{intro}</p>}
      {children}
    </section>
  );
}

function InputsDemo() {
  const [plain, setPlain] = useState('');
  const [wrong, setWrong] = useState('abc@');
  const [password, setPassword] = useState('demo1234');
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);

  return (
    <div className="panel form-grid panel-top">
      <Field
        id="ds-1"
        label="Default"
        value={plain}
        onChange={setPlain}
        placeholder="e.g. Kiyovu"
        help="Helper text explains the field."
      />
      <Field
        id="ds-2"
        label="With error"
        value={wrong}
        onChange={setWrong}
        error="Enter a valid email address."
      />
      <PasswordField id="ds-4" label="Password" value={password} onChange={setPassword} />
      <div className="field">
        <label htmlFor="ds-3">Select</label>
        <select className="select" id="ds-3" defaultValue="">
          <option value="">Choose a type</option>
          <option value="single">Single room</option>
          <option value="shared">Shared room</option>
          <option value="studio">Studio</option>
          <option value="apartment">Apartment</option>
        </select>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />{' '}
        Checkbox
      </label>
      <label className="switch">
        <span>Switch</span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          onChange={(event) => setOn(event.target.checked)}
        />
      </label>
    </div>
  );
}

function ChoicesDemo() {
  const [roomType, setRoomType] = useState<string | undefined>('single');
  const [speed, setSpeed] = useState<string | undefined>();
  const [plan, setPlan] = useState<string | undefined>('self');
  const [flexible, setFlexible] = useState(true);
  const [water, setWater] = useState(true);
  const [security, setSecurity] = useState(false);

  return (
    <div className="panel stack panel-top">
      <PickGroup
        label="Room type (demo)"
        value={roomType}
        onChange={setRoomType}
        options={[
          { value: 'single', label: 'Single room', icon: 'bed' },
          { value: 'shared', label: 'Shared room', icon: 'users' },
          { value: 'studio', label: 'Studio', icon: 'door' },
        ]}
      />
      <PickGroup
        label="With an error (demo)"
        value={speed}
        onChange={setSpeed}
        none="Nothing yet"
        error="Choose one option to continue."
        options={[
          { value: 'walk', label: 'Walking distance' },
          { value: 'bus', label: 'Short bus ride' },
        ]}
      />
      <div className="row">
        <ToggleChip
          label="Pick more than one"
          pressed={flexible}
          onToggle={() => setFlexible(!flexible)}
        />
        <ToggleChip label="Not selected" pressed={false} icon="plus" onToggle={() => undefined} />
      </div>
      <ChoiceField
        label="Layout (demo)"
        value={plan}
        onChoose={setPlan}
        options={[
          {
            value: 'self',
            icon: 'home',
            title: 'Selected card',
            description: 'Blue border, tint and label',
          },
          {
            value: 'shared',
            icon: 'users',
            title: 'Not selected',
            description: 'Grey border until you choose it',
          },
        ]}
      />
      <div className="tilegrid">
        <ToggleTile label="Water" icon="water" pressed={water} onToggle={() => setWater(!water)} />
        <ToggleTile
          label="Security / guard"
          icon="shield"
          pressed={security}
          onToggle={() => setSecurity(!security)}
        />
      </div>
    </div>
  );
}

function CardsDemo() {
  const toast = useToast();
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  return (
    <div className="grid-cards panel-top ds-cards">
      {SAMPLE_PROPERTIES.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          saved={saved.includes(property.id)}
          inCompare={compare.includes(property.id)}
          onToggleSave={() => {
            if (!saved.includes(property.id)) {
              toast('Saved to your list. This does not reserve the room.');
            }
            setSaved(toggle(saved, property.id));
          }}
          onToggleCompare={() => setCompare(toggle(compare, property.id))}
        />
      ))}
    </div>
  );
}

function FeedbackDemo() {
  const toast = useToast();
  const { setQuickFindOpen, setPanelOpen } = useDisplay();
  const [dialog, setDialog] = useState<'delete' | 'reason' | null>(null);

  return (
    <div className="panel row panel-top">
      <Button
        variant="secondary"
        onClick={() => toast('Saved to your list. This does not reserve the room.')}
      >
        Show toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('Availability updated successfully.', { undo: () => toast('Change undone.') })
        }
      >
        Toast with Undo
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast('We could not save your change. Check your connection and try again.', {
            type: 'error',
          })
        }
      >
        Error toast
      </Button>
      <Button variant="secondary" onClick={() => toast('Reading stopped.', { type: 'info' })}>
        Info toast
      </Button>
      <Button variant="secondary" onClick={() => setDialog('delete')}>
        Confirmation dialog
      </Button>
      <Button variant="secondary" onClick={() => setDialog('reason')}>
        Dialog with a required note
      </Button>
      <Button variant="secondary" icon="search" onClick={() => setQuickFindOpen(true)}>
        Quick find
      </Button>
      <Button variant="secondary" icon="palette" onClick={() => setPanelOpen(true)}>
        Display settings
      </Button>

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Are you sure you want to delete this listing?"
          body="This is a demonstration of the confirmation pattern. Nothing will be deleted."
          confirm="Delete listing"
          tone="danger"
          icon="trash"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            toast('Demo: listing deleted.', { undo: () => toast('Demo: listing restored.') });
          }}
        />
      )}
      {dialog === 'reason' && (
        <ConfirmDialog
          title="Reject this listing?"
          body="This is a demonstration. The landlord would see your reason."
          confirm="Reject listing"
          tone="danger"
          icon="x"
          field={{
            label: 'Reason for rejection',
            placeholder: 'Explain what is wrong',
            required: 'Please give a reason so the landlord knows what to fix.',
          }}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            toast('Demo: listing rejected.');
          }}
        />
      )}
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <main className="page doc" id="main">
      <div className="page-head">
        <div>
          <span className="badge b-demo">01 · Design system</span>
          <h1 className="t-page ds-title">Design system</h1>
          <p className="muted">Foundations and components every screen is built from.</p>
        </div>
      </div>
      <OnThisPage items={SECTIONS} />

      <Section
        id="ds-colour"
        title="Colour"
        intro="Four foundation colours, plus semantic colours used only where needed. Status is never shown by colour alone: every badge has an icon and a word."
      >
        <div className="ds-grid panel-top">
          {SWATCHES.map(([name, value, use, ratio]) => (
            <div className="swatch" key={name}>
              <div className="chip-col" style={{ background: value }} />
              <div className="info">
                <b>{name}</b>
                <br />
                <code>{value}</code>
                <p className="t-support">{use}</p>
                {ratio && (
                  <p className="t-support">
                    <b>{ratio}</b>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="ds-type"
        title="Typography"
        intro="Inter. Body text is 16px minimum. The Large setting scales everything by 12.5% and Extra large by 25%."
      >
        <div className="panel stack panel-top">
          <div className="t-page">Page heading · 32 / 700</div>
          <div className="t-section">Section heading · 22 / 700</div>
          <div className="t-card">Card title · 17 / 600</div>
          <div className="t-price">Price · 22 / 700 · 85,000 RWF</div>
          <div className="t-body">Body text · 16 / 400. Used for descriptions and paragraphs.</div>
          <div className="t-label">Form label · 15 / 600</div>
          <div className="t-support">Supporting label · 14 / 400</div>
          <div className="t-help">Helper text · 14 / 400, muted</div>
        </div>
      </Section>

      <Section
        id="ds-space"
        title="Spacing & shape"
        intro="8px spacing system. Radius 8 / 12 / 16px by size. Subtle 1px borders; shadows only on raised items (search box, dialogs, hover)."
      >
        <div className="panel stack-sm panel-top">
          {SPACING.map((size) => (
            <div className="spacing-row" key={size}>
              <span className="num spacing-label">{size}px</span>
              <span className="bar" style={{ width: size * 3 }} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="ds-buttons"
        title="Buttons"
        intro="Minimum height 44px for touch. One primary action per area. Labels say what happens."
      >
        <div className="panel row panel-top">
          <Button icon="search">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success" icon="check">
            Approve
          </Button>
          <Button variant="danger-outline" icon="trash">
            Delete
          </Button>
          <Button variant="danger">Confirm delete</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
          <Button size="lg">Large</Button>
        </div>
        <p className="t-help panel-top">
          Press Tab to see the focus ring: a 2px blue outline with a white gap.
        </p>
      </Section>

      <Section id="ds-inputs" title="Inputs">
        <InputsDemo />
      </Section>

      <Section
        id="ds-choices"
        title="Choice chips & cards"
        intro='Used instead of dropdowns and typing. The picked option is solid blue with a tick, and each group repeats the choice as "Selected: ...".'
      >
        <ChoicesDemo />
      </Section>

      <Section id="ds-way" title="Wayfinding & audio">
        <ul>
          <li>
            <b>You are here trail</b> under every header, with the current page highlighted and a
            Back link on deep pages.
          </li>
          <li>
            <b>Quick find</b> (Ctrl + K) searches pages, neighbourhoods and rooms.
          </li>
          <li>
            <b>On this page</b> chips on long pages; the current section is shown in dark.
          </li>
          <li>
            <b>Listen and display</b> are in the header on public pages and in a dock at the bottom
            left of workspace pages; the part being read aloud gets a yellow outline.
          </li>
        </ul>
      </Section>

      <Section
        id="ds-status"
        title="Status indicators"
        intro="Room availability and admin approval are always shown as two separate badges."
      >
        <div className="panel row panel-top">
          <AvailabilityBadge availability="AVAILABLE" />
          <AvailabilityBadge availability="OCCUPIED" />
          <ReviewBadge status="APPROVED" />
          <ReviewBadge status="PENDING" />
          <ReviewBadge status="CHANGES_REQUESTED" />
          <ReviewBadge status="REJECTED" />
          <ReviewBadge status="REMOVED" />
          <span className="badge b-new">
            <span className="dot" aria-hidden="true" />
            New
          </span>
          <Badge tone="demo">Demonstration data</Badge>
        </div>
      </Section>

      <Section id="ds-cards" title="Cards">
        <CardsDemo />
      </Section>

      <Section id="ds-nav" title="Navigation">
        <ul>
          <li>
            <b>Students &amp; guests:</b> top header with Find Housing, Saved, Compare, Recently
            viewed, Dashboard. On mobile it collapses into a menu.
          </li>
          <li>
            <b>Landlords &amp; administrators:</b> left sidebar with counts for items that need
            action. On mobile it becomes a scrollable tab row.
          </li>
          <li>Breadcrumbs and Back links on detail pages.</li>
        </ul>
      </Section>

      <Section id="ds-feedback" title="Feedback">
        <FeedbackDemo />
      </Section>

      <Section
        id="ds-states"
        title="Page states"
        intro="Every data view has loading, empty, error and success states."
      >
        <div className="stack panel-top">
          <SkeletonCards count={2} />
          <EmptyState
            title="No rooms match your filters"
            text="Try a higher budget or a wider distance."
            actions={<Button variant="secondary">Clear all filters</Button>}
          />
          <ErrorState
            title="We could not load this page"
            text="Check your connection and try again."
            actions={<Button icon="refresh">Try again</Button>}
          />
          <SuccessState
            title="Listing submitted"
            text="An administrator will review it. You will get a notification with the result."
            actions={
              <Link className={buttonClass({ variant: 'secondary' })} to="/">
                Go to home <Icon name="chevR" />
              </Link>
            }
          />
        </div>
      </Section>
    </main>
  );
}
