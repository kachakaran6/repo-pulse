import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
  Combobox,
  Checkbox,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SimpleTooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  Toaster,
  toast,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
  SkeletonRow,
  SkeletonCard,
  Progress,
  SegmentedControl,
  CommandPalette,
  CommandItem,
  EmptyState,
} from './v4/ui/index.js';
import {
  ArrowLeft,
  Search,
  Check,
  Flame,
  GitCommit,
  Clock,
  Archive,
  Terminal,
  Settings,
  Sliders,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Command,
  HelpCircle,
  FolderArchive,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface ComponentsCatalogPageProps {
  onBack: () => void;
}

export const ComponentsCatalogPage: React.FC<ComponentsCatalogPageProps> = ({ onBack }) => {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Category filter state
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Interactive component states
  const [selectValue, setSelectValue] = useState('active');
  const [comboboxValue, setComboboxValue] = useState('repopulse/client');
  const [checkboxChecked, setCheckboxChecked] = useState<boolean | 'indeterminate'>(true);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [segmentedValue, setSegmentedValue] = useState<'system' | 'light' | 'dark'>('system');
  const [progressValue, setProgressValue] = useState(65);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [dropdownCheck, setDropdownCheck] = useState(true);
  const [dropdownRadio, setDropdownRadio] = useState('status');

  const toggleTheme = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  const comboboxOptions = [
    { value: 'repopulse/client', label: 'repopulse/client', description: 'TypeScript · 42 commits' },
    { value: 'repopulse/server', label: 'repopulse/server', description: 'Node.js · 18 commits' },
    { value: 'repopulse/docs', label: 'repopulse/docs', description: 'Markdown · 9 commits' },
    { value: 'acme/analytics-agent', label: 'acme/analytics-agent', description: 'Rust · Cooling' },
    { value: 'acme/legacy-importer', label: 'acme/legacy-importer', description: 'Python · Stale' },
  ];

  const commandItems: CommandItem[] = [
    {
      id: 'cmd-triage',
      title: 'Open Triage Deck',
      category: 'Navigation',
      shortcut: 'G T',
      icon: <Check size={14} />,
      onSelect: () => toast.info('Navigating to Triage deck...'),
    },
    {
      id: 'cmd-sync',
      title: 'Sync GitHub Repositories Now',
      category: 'Actions',
      shortcut: 'S',
      icon: <RefreshCw size={14} />,
      onSelect: () => toast.success('Sync triggered for 32 repositories.'),
    },
    {
      id: 'cmd-theme',
      title: 'Toggle Light / Dark Mode',
      category: 'Appearance',
      shortcut: 'T',
      icon: <Sun size={14} />,
      onSelect: () => toggleTheme(currentTheme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'cmd-export',
      title: 'Export Ledger JSON',
      category: 'Data',
      shortcut: 'Cmd+E',
      icon: <ExternalLink size={14} />,
      onSelect: () => toast.info('Export file initiated.'),
    },
  ];

  const categories = [
    { id: 'all', label: 'All Components (20)' },
    { id: 'inputs-actions', label: 'Buttons & Inputs' },
    { id: 'selection', label: 'Selection & Toggles' },
    { id: 'overlays', label: 'Dialogs, Popovers & Menus' },
    { id: 'navigation-feedback', label: 'Navigation & Feedback' },
  ];

  return (
    <div
      className="min-h-screen bg-neutral-1 text-neutral-11 font-sans pb-24"
      style={{
        backgroundColor: 'var(--neutral-1)',
        color: 'var(--neutral-11)',
      }}
    >
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-sticky border-b border-neutral-6 bg-neutral-1/90 backdrop-blur-sm px-4 md:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 rounded-sm border border-neutral-6 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to App
            </button>
            <div className="h-4 w-px bg-neutral-6" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-neutral-12 leading-none">
                Component Library
              </h1>
              <span className="text-2xs text-neutral-9 uppercase tracking-wider font-mono">
                20 Accessible Radix Primitives · Quiet Ledger Styled
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-neutral-10 bg-neutral-3 border border-neutral-6 rounded-sm hover:border-neutral-8 hover:text-neutral-12"
            >
              <Command size={13} />
              <span>Search actions</span>
              <kbd className="text-2xs border border-neutral-6 px-1 rounded-xs bg-neutral-2">⌘K</kbd>
            </button>

            <div className="inline-flex rounded-sm border border-neutral-6 bg-neutral-3 p-0.5">
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                className={`p-1.5 rounded-xs transition-colors ${
                  currentTheme === 'light'
                    ? 'bg-neutral-12 text-neutral-1'
                    : 'text-neutral-9 hover:text-neutral-12'
                }`}
                title="Light mode"
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                className={`p-1.5 rounded-xs transition-colors ${
                  currentTheme === 'dark'
                    ? 'bg-neutral-12 text-neutral-1'
                    : 'text-neutral-9 hover:text-neutral-12'
                }`}
                title="Dark mode"
              >
                <Moon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto pt-3 mt-1 text-xs border-t border-neutral-6/60">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`pb-2 whitespace-nowrap border-b-2 font-medium transition-colors ${
                activeCategory === c.id
                  ? 'border-neutral-12 text-neutral-12 font-semibold'
                  : 'border-transparent text-neutral-10 hover:text-neutral-12'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-16">
        {/* SECTION 1: BUTTONS & INPUTS */}
        {(activeCategory === 'all' || activeCategory === 'inputs-actions') && (
          <section className="space-y-10">
            {/* 1. BUTTON */}
            <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-6">
              <div className="border-b border-neutral-6 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-neutral-12">1. Button</h2>
                  <p className="text-xs text-neutral-10">
                    Quiet ink primary, hairline secondary, ghost, destructive, verdict variants, and icon sizes.
                  </p>
                </div>
                <span className="text-2xs font-mono px-2 py-0.5 rounded-xs bg-neutral-4 text-neutral-10">
                  @base-ui / Radix Slot
                </span>
              </div>

              {/* Variants */}
              <div className="space-y-2">
                <span className="text-2xs font-mono uppercase text-neutral-9 block">Variants</span>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary">Primary Ink</Button>
                  <Button variant="secondary">Secondary Surface</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="verdict-keep">Keep Going [K]</Button>
                  <Button variant="verdict-pause">Pause [P]</Button>
                  <Button variant="verdict-retire">Retire [R]</Button>
                </div>
              </div>

              {/* States: Default, Hover, Focus, Disabled, Loading */}
              <div className="space-y-2">
                <span className="text-2xs font-mono uppercase text-neutral-9 block">
                  Interactive States (Default · Focus · Loading · Disabled)
                </span>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button variant="primary">Default</Button>
                  <Button variant="primary" isLoading>
                    Saving Changes
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled Action
                  </Button>
                  <Button variant="secondary" isLoading>
                    Syncing
                  </Button>
                  <Button variant="secondary" disabled>
                    Disabled Secondary
                  </Button>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-2">
                <span className="text-2xs font-mono uppercase text-neutral-9 block">Sizes</span>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button size="sm">Small (28px)</Button>
                  <Button size="md">Medium (34px)</Button>
                  <Button size="lg">Large (40px)</Button>
                  <Button size="icon-sm" variant="secondary" title="Small Icon">
                    <Sparkles size={13} />
                  </Button>
                  <Button size="icon" variant="secondary" title="Medium Icon">
                    <Sparkles size={15} />
                  </Button>
                </div>
              </div>
            </div>

            {/* 2. INPUT */}
            <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-6">
              <div className="border-b border-neutral-6 pb-3">
                <h2 className="text-base font-bold text-neutral-12">2. Input</h2>
                <p className="text-xs text-neutral-10">
                  Clean text, monospace figures, icons, loading spinner, and inline error validation states.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="demo-input-default" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    Default Input
                  </label>
                  <Input id="demo-input-default" aria-label="Default repository name" placeholder="Enter repository name..." />
                </div>

                <div>
                  <label htmlFor="demo-input-search" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    With Search Prefix
                  </label>
                  <Input id="demo-input-search" leftIcon={<Search size={14} />} aria-label="Search repositories" placeholder="Search repos... [/]" />
                </div>

                <div>
                  <label htmlFor="demo-input-mono" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    Monospace Tabular Figure
                  </label>
                  <Input id="demo-input-mono" isMono aria-label="Monospace commit statistics" defaultValue="48 commits in 30d" />
                </div>

                <div>
                  <label htmlFor="demo-input-loading" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    Loading State
                  </label>
                  <Input id="demo-input-loading" isLoading aria-label="Credential validation status" defaultValue="Validating credentials..." />
                </div>

                <div>
                  <label htmlFor="demo-input-disabled" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    Disabled State
                  </label>
                  <Input id="demo-input-disabled" disabled aria-label="Locked environment variable" defaultValue="Locked environment variable" />
                </div>

                <div>
                  <label htmlFor="demo-input-error" className="text-xs font-medium text-neutral-11 block mb-1.5">
                    Error Validation State
                  </label>
                  <Input
                    id="demo-input-error"
                    aria-label="Active days count"
                    error="Active days must be strictly less than Cooling days."
                    defaultValue="14"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: SELECTION & TOGGLES */}
        {(activeCategory === 'all' || activeCategory === 'selection') && (
          <section className="space-y-10">
            {/* 3. SELECT & 4. COMBOBOX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">3. Select (Radix Select)</h2>
                  <p className="text-xs text-neutral-10">Accessible dropdown with keyboard scrolling.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-11 block mb-1.5">
                      Activity Filter
                    </label>
                    <Select value={selectValue} onValueChange={setSelectValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Status Groups</SelectLabel>
                          <SelectItem value="active">Active (&le; 7 days)</SelectItem>
                          <SelectItem value="cooling">Cooling (8-14 days)</SelectItem>
                          <SelectItem value="stale">Stale (15-30 days)</SelectItem>
                          <SelectItem value="dead">Dead (&gt; 30 days)</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectItem value="all">All Repositories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-10 block mb-1.5">
                      Disabled Select
                    </label>
                    <Select disabled value="none">
                      <SelectTrigger>
                        <SelectValue placeholder="Disabled options" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Combobox */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">4. Combobox (Searchable Select)</h2>
                  <p className="text-xs text-neutral-10">Typeahead search filter with keyboard arrow navigation.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-11 block mb-1.5">
                      Pick Repository
                    </label>
                    <Combobox
                      options={comboboxOptions}
                      value={comboboxValue}
                      onChange={setComboboxValue}
                      placeholder="Search repository..."
                      searchPlaceholder="Type repo name or tag..."
                    />
                  </div>

                  <div className="p-2.5 rounded-sm bg-neutral-2 border border-neutral-6 text-2xs font-mono text-neutral-10">
                    Selected value: <strong className="text-neutral-12">{comboboxValue}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. CHECKBOX & 6. SWITCH & 18. SEGMENTED CONTROL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Checkbox */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">5. Checkbox (Radix)</h2>
                  <p className="text-xs text-neutral-10">Checked, unchecked, and indeterminate.</p>
                </div>

                <div className="space-y-3 pt-1">
                  <Checkbox
                    checked={checkboxChecked}
                    onCheckedChange={(checked) => setCheckboxChecked(checked)}
                    label="Track private repositories"
                    description="Include private repos on personal dashboard"
                  />
                  <Checkbox
                    checked="indeterminate"
                    label="Multi-selection group"
                    description="Partial selection of 14 repos"
                  />
                  <Checkbox
                    disabled
                    checked={false}
                    label="Disabled unchecked"
                  />
                  <Checkbox
                    disabled
                    checked={true}
                    label="Disabled checked"
                  />
                </div>
              </div>

              {/* Switch */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">6. Switch (Radix)</h2>
                  <p className="text-xs text-neutral-10">Tactile on/off toggles with labels.</p>
                </div>

                <div className="space-y-4 pt-1">
                  <Switch
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                    label="Automatic background sync"
                    description="Hourly webhook polling"
                  />
                  <Switch
                    checked={false}
                    label="Hide zero-commit repos"
                    description="Exclude forks without your commits"
                  />
                  <Switch
                    disabled
                    checked={true}
                    label="Required security audit"
                    description="Enforced on SaaS edition"
                  />
                </div>
              </div>

              {/* Segmented Control */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">18. Segmented Control</h2>
                  <p className="text-xs text-neutral-10">Tactile pill switches for themes & views.</p>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <span className="text-xs font-medium text-neutral-11 block mb-2">
                      Appearance Mode
                    </span>
                    <SegmentedControl
                      options={[
                        { value: 'system', label: 'System', icon: <Monitor size={12} /> },
                        { value: 'light', label: 'Light', icon: <Sun size={12} /> },
                        { value: 'dark', label: 'Dark', icon: <Moon size={12} /> },
                      ]}
                      value={segmentedValue}
                      onChange={(val) => {
                        setSegmentedValue(val);
                        if (val === 'light' || val === 'dark') toggleTheme(val);
                      }}
                    />
                  </div>

                  <div>
                    <span className="text-xs font-medium text-neutral-11 block mb-2">
                      Compact Filter Mode
                    </span>
                    <SegmentedControl
                      size="sm"
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'mine', label: 'Mine' },
                        { value: 'shared', label: 'Shared' },
                      ]}
                      value="all"
                      onChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: OVERLAYS & MODALS */}
        {(activeCategory === 'all' || activeCategory === 'overlays') && (
          <section className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 8. Tooltip */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-3">
                <h3 className="text-base font-bold text-neutral-12">8. Tooltip (Radix)</h3>
                <p className="text-xs text-neutral-10">Subtle dark tooltip with 200ms delay.</p>
                <div className="pt-2">
                  <SimpleTooltip content="Commit SHA: c3f94b1 (2 hours ago)">
                    <Button variant="secondary" size="sm">
                      Hover for Commit Info
                    </Button>
                  </SimpleTooltip>
                </div>
              </div>

              {/* 9. Popover */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-3">
                <h3 className="text-base font-bold text-neutral-12">9. Popover (Radix)</h3>
                <p className="text-xs text-neutral-10">Floating surface with pointer anchor.</p>
                <div className="pt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Filter Parameters
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="space-y-3">
                        <strong className="text-xs font-bold text-neutral-12 block">
                          Filter Criteria
                        </strong>
                        <p className="text-2xs text-neutral-10">
                          Adjust visibility and threshold overrides on the fly.
                        </p>
                        <Input aria-label="Tag filter name" placeholder="Tag name..." />
                        <div className="flex justify-end pt-2">
                          <PopoverClose asChild>
                            <Button size="sm">Apply Filter</Button>
                          </PopoverClose>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* 10. Dropdown Menu */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-3">
                <h3 className="text-base font-bold text-neutral-12">10. Dropdown Menu</h3>
                <p className="text-xs text-neutral-10">Menu items, checkboxes, radios, shortcuts.</p>
                <div className="pt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Actions Menu
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Repository Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => toast.success('Repo pinned')}>
                        Pin to Top
                        <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Opened GitHub')}>
                        Open on GitHub
                        <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={dropdownCheck}
                        onCheckedChange={setDropdownCheck}
                      >
                        Show Activity Strip
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onClick={() => toast.error('Retired repo')}>
                        Retire to Archive
                        <DropdownMenuShortcut>R</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 13. Toast Triggers */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-3">
                <h3 className="text-base font-bold text-neutral-12">13. Toast (Sonner)</h3>
                <p className="text-xs text-neutral-10">Quiet paper-and-ink notification toasts.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success('Kept repo: repopulse/client')}
                  >
                    Success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.undo('Retired metrics-agent', () =>
                        toast.success('Undid decision for metrics-agent')
                      )
                    }
                  >
                    With Undo [Z]
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.error('Sync failed: Network timeout')}
                  >
                    Error
                  </Button>
                </div>
              </div>
            </div>

            {/* 11. DIALOG & 12. SHEET (DRAWER) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dialog Modal */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">11. Dialog (Radix Dialog Modal)</h2>
                  <p className="text-xs text-neutral-10">Accessible focus-trapping modal dialog.</p>
                </div>

                <p className="text-xs text-neutral-10">
                  Used for account deletion confirmation, milestone date setting, and destructive actions.
                </p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Open Sample Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Repository Retirement</DialogTitle>
                      <DialogDescription>
                        Retiring <strong>legacy-importer</strong> will move it out of your daily ledger. You can restore it from the Archive at any time.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                      <Input aria-label="Retirement rationale note" placeholder="Optional retirement note..." />
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          variant="destructive"
                          onClick={() => toast.success('Repository retired to archive')}
                        >
                          Confirm Retire
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Sheet Drawer */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">12. Sheet / Drawer (Slide-Over Panel)</h2>
                  <p className="text-xs text-neutral-10">Right-side slide-over panel for repo details inspection.</p>
                </div>

                <p className="text-xs text-neutral-10">
                  Replaces clumsy popup modals with an editorial slide-over ledger drawer.
                </p>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Inspect Repository Sheet</Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="active" showDot>
                          Active
                        </Badge>
                        <span className="text-2xs font-mono text-neutral-9">TypeScript</span>
                      </div>
                      <SheetTitle className="font-mono text-xl">repopulse/client</SheetTitle>
                      <SheetDescription>
                        Last commit 2 days ago · 48 commits in last 90 days.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 py-4">
                      <div className="space-y-1.5">
                        <label htmlFor="demo-custom-label" className="text-xs font-semibold text-neutral-12">Custom Label</label>
                        <Input id="demo-custom-label" aria-label="Custom repository label" defaultValue="Core Frontend SaaS" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="demo-milestone-goal" className="text-xs font-semibold text-neutral-12">Milestone Goal</label>
                        <Input id="demo-milestone-goal" type="date" aria-label="Milestone goal date" defaultValue="2026-11-30" />
                      </div>

                      <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 space-y-2">
                        <strong className="text-xs text-neutral-12 block">Top Contributors</strong>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              <AvatarFallback>AY</AvatarFallback>
                            </Avatar>
                            <span>aayush (You)</span>
                          </div>
                          <span className="font-mono text-neutral-9 tabular">38 commits</span>
                        </div>
                      </div>
                    </div>

                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="outline">Close</Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button onClick={() => toast.success('Saved repository metadata')}>
                          Save Metadata
                        </Button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: NAVIGATION, BADGES & FEEDBACK */}
        {(activeCategory === 'all' || activeCategory === 'navigation-feedback') && (
          <section className="space-y-10">
            {/* 7. TABS */}
            <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-6">
              <div className="border-b border-neutral-6 pb-2">
                <h2 className="text-base font-bold text-neutral-12">7. Tabs (Radix Tabs)</h2>
                <p className="text-xs text-neutral-10">
                  Quiet editorial underline indicator and secondary pill style.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-2xs font-mono uppercase text-neutral-9 block mb-2">
                    Underline Style (Default Shell Navigation)
                  </span>
                  <Tabs defaultValue="overview">
                    <TabsList variant="underline">
                      <TabsTrigger variant="underline" value="overview">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger variant="underline" value="triage">
                        Triage (7)
                      </TabsTrigger>
                      <TabsTrigger variant="underline" value="archive">
                        Archive
                      </TabsTrigger>
                      <TabsTrigger variant="underline" value="settings" disabled>
                        Disabled Tab
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                      <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 text-xs">
                        Overview ledger tab active.
                      </div>
                    </TabsContent>
                    <TabsContent value="triage">
                      <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 text-xs">
                        Triage queue active.
                      </div>
                    </TabsContent>
                    <TabsContent value="archive">
                      <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 text-xs">
                        Archive records active.
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <span className="text-2xs font-mono uppercase text-neutral-9 block mb-2">
                    Pill Style (Secondary Filter)
                  </span>
                  <Tabs defaultValue="all">
                    <TabsList variant="pill">
                      <TabsTrigger variant="pill" value="all">
                        All Repositories
                      </TabsTrigger>
                      <TabsTrigger variant="pill" value="mine">
                        Mine Only
                      </TabsTrigger>
                      <TabsTrigger variant="pill" value="orgs">
                        Organizations
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                      <p className="text-2xs text-neutral-10 mt-2">Showing all 48 repositories.</p>
                    </TabsContent>
                    <TabsContent value="mine">
                      <p className="text-2xs text-neutral-10 mt-2">Showing personal repositories.</p>
                    </TabsContent>
                    <TabsContent value="orgs">
                      <p className="text-2xs text-neutral-10 mt-2">Showing organization repositories.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* 14. BADGE & 15. AVATAR & 17. PROGRESS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Badges */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">14. Badge</h2>
                  <p className="text-xs text-neutral-10">Activity heat and verdict chips.</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="active" showDot>Active</Badge>
                  <Badge variant="cooling" showDot>Cooling</Badge>
                  <Badge variant="stale" showDot>Stale</Badge>
                  <Badge variant="dead" showDot>Dead</Badge>
                  <Badge variant="keep">Keep</Badge>
                  <Badge variant="pause">Pause</Badge>
                  <Badge variant="retire">Retire</Badge>
                  <Badge variant="neutral">Private</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>

              {/* Avatar */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">15. Avatar (Radix Avatar)</h2>
                  <p className="text-xs text-neutral-10">Image loading with initials fallback.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Avatar size="xs">
                    <AvatarFallback>XS</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar size="md">
                    <AvatarFallback>RP</AvatarFallback>
                  </Avatar>
                  <Avatar size="lg">
                    <AvatarImage src="https://github.com/shadcn.png" alt="Demo" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <Avatar size="xl">
                    <AvatarFallback>XL</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Progress */}
              <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
                <div className="border-b border-neutral-6 pb-2">
                  <h2 className="text-base font-bold text-neutral-12">17. Progress (Radix)</h2>
                  <p className="text-xs text-neutral-10">Sync and triage progress tracker.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-2xs font-mono text-neutral-10 mb-1">
                      <span>Sync progress</span>
                      <span className="tabular">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} />
                  </div>

                  <div>
                    <div className="flex justify-between text-2xs font-mono text-neutral-10 mb-1">
                      <span>Triage complete</span>
                      <span className="tabular">100%</span>
                    </div>
                    <Progress value={100} indicatorClassName="bg-verdict-keep-base" />
                  </div>
                </div>
              </div>
            </div>

            {/* 16. SKELETON */}
            <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
              <div className="border-b border-neutral-6 pb-2">
                <h2 className="text-base font-bold text-neutral-12">16. Skeleton Loading States</h2>
                <p className="text-xs text-neutral-10">
                  Paper-calibrated placeholder pulses. Respects prefers-reduced-motion.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-neutral-6 rounded-sm overflow-hidden">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              </div>
            </div>

            {/* 20. EMPTY STATE */}
            <div className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4">
              <div className="border-b border-neutral-6 pb-2">
                <h2 className="text-base font-bold text-neutral-12">20. Empty State</h2>
                <p className="text-xs text-neutral-10">Editorial bookplate layout for empty queries and completed queues.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EmptyState
                  icon={<Check size={20} className="text-verdict-keep-base" />}
                  title="All Repositories Triaged"
                  description="No cooling or stale repositories require a decision right now. Check back next week."
                  action={<Button variant="secondary" size="sm">Return to Ledger</Button>}
                />

                <EmptyState
                  icon={<Search size={20} />}
                  title="No Matching Repositories"
                  description="We could not find any repository matching your active filter criteria."
                  action={<Button variant="secondary" size="sm">Clear All Filters</Button>}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 19. COMMAND PALETTE MODAL */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        items={commandItems}
      />
    </div>
  );
};
