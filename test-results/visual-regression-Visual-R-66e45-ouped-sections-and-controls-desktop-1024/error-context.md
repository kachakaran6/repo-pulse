# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression.spec.ts >> Visual Regression Suite (Playwright Screenshots) >> Phase 2: Main Ledger View with grouped sections and controls
- Location: e2e\visual-regression.spec.ts:29:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('article[aria-label^="Repository"]').first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - region "Notifications alt+T"
    - status [ref=e4]
    - complementary [ref=e5]:
      - generic [ref=e6]:
        - link "RepoPulse Demo" [ref=e7] [cursor=pointer]:
          - /url: "#ledger"
          - generic [ref=e8]:
            - generic [ref=e9]: RepoPulse
            - generic [ref=e10]: Demo
        - button "Collapse sidebar" [expanded] [ref=e11]
      - generic [ref=e15]:
        - navigation "Main application sections" [ref=e16]:
          - button "Ledger" [ref=e17]
          - button "Triage 11" [ref=e23]:
            - generic [ref=e27]: Triage
            - generic [ref=e28]: "11"
          - button "Decisions" [ref=e29]
          - button "Digest" [ref=e34]
          - button "Analytics" [ref=e42]
          - button "Settings" [ref=e47]
        - generic [ref=e52]:
          - generic [ref=e53]: Saved Views
          - generic [ref=e54]:
            - button "Active Work" [ref=e55]
            - button "Cooling Down" [ref=e59]
            - button "Team Projects" [ref=e64]
            - button "Dormant" [ref=e71]
        - generic [ref=e75]:
          - generic [ref=e76]: Tag Shortcuts
          - generic [ref=e77]:
            - button "saas" [ref=e78]
            - button "infra" [ref=e83]
            - button "client" [ref=e88]
            - button "backend" [ref=e93]
      - generic [ref=e98]: Quiet Ledger · v4
    - generic [ref=e99]:
      - banner [ref=e100]:
        - generic [ref=e101]:
          - generic [ref=e102]: RepoPulse
          - heading "Ledger" [level=1] [ref=e105]
        - button "Search repos, actions... Ctrl+K" [ref=e107]:
          - generic [ref=e108]: Search repos, actions...
          - generic [ref=e113]: Ctrl+K
        - generic [ref=e114]:
          - status [ref=e115]:
            - generic [ref=e116]: Synced just now
            - button "Refresh repository synchronization" [ref=e117]
          - button "Switch to dark mode" [ref=e124]
          - button "DE - User account menu for demo-developer" [ref=e127] [cursor=pointer]
      - main [ref=e129]:
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]:
              - generic [ref=e135]:
                - strong [ref=e136]:
                  - generic [ref=e137]: "20"
                  - text: repositories need a decision.
                - text: Review projects without a verdict to maintain focus.
              - button "Start triage" [ref=e138]
            - generic [ref=e142]:
              - heading "5 repositories active this week · 6 cooling down · 53 commits across portfolio" [level=1] [ref=e143]
              - paragraph [ref=e144]: Calibrated activity ledger grouped by recent commit cadence and velocity.
            - generic [ref=e146]:
              - textbox "Filter repositories by title, tag, or description" [ref=e148]:
                - /placeholder: Search repositories by name, tag, or description... ( / )
              - generic [ref=e149]:
                - group "Ledger layout switcher" [ref=e150]:
                  - button "Dense List View" [pressed] [ref=e151] [cursor=pointer]:
                    - generic [ref=e153]: List
                  - button "Cards Grid View" [ref=e154] [cursor=pointer]:
                    - generic [ref=e160]: Cards
                  - button "Verdict Kanban Board" [ref=e161] [cursor=pointer]:
                    - generic [ref=e163]: Board
                - button "Filters" [ref=e164]
                - button "Save view" [ref=e167]
            - generic [ref=e172]:
              - generic [ref=e173]:
                - button "This week ( 5 ) · Committed within 7 days" [expanded] [ref=e174] [cursor=pointer]:
                  - generic [ref=e175]:
                    - generic [ref=e179]:
                      - generic [ref=e181]: This week
                      - generic [ref=e182]:
                        - text: (
                        - generic [ref=e183]: "5"
                        - text: )
                    - generic [ref=e184]: · Committed within 7 days
                - generic [ref=e247]:
                  - article "Repository acme/repopulse" [ref=e248] [cursor=pointer]:
                    - generic [ref=e249]:
                      - checkbox "Select acme/repopulse" [ref=e250]
                      - 'progressbar "Activity Velocity Score: 100/100" [ref=e251]':
                        - generic [ref=e255]: "100"
                      - generic [ref=e256]:
                        - generic [ref=e257]:
                          - generic [ref=e258]: acme/repopulse
                          - generic [ref=e259]: Priority
                        - generic [ref=e260]:
                          - generic [ref=e261]: Calibrated GitHub repository ledger and activity tracker
                          - generic [aria-hidden] [ref=e262]: ·
                          - generic [ref=e263]: TypeScript
                          - generic [aria-hidden] [ref=e266]: ·
                          - generic [ref=e267]: today
                    - generic [ref=e268]:
                      - group "Repository triage verdict" [ref=e331]:
                        - button "Mark acme/repopulse as Keep" [ref=e332]:
                          - generic [ref=e335]: Keep
                        - button "Mark acme/repopulse as Pause" [ref=e336]:
                          - generic [ref=e340]: Pause
                        - button "Mark acme/repopulse as Retire" [ref=e341]:
                          - generic [ref=e345]: Retire
                      - generic [ref=e346]:
                        - button "Add or edit tag" [ref=e347]
                        - button "Snooze" [ref=e351]
                        - link "Open on GitHub" [ref=e355]:
                          - /url: https://github.com/acme/repopulse
                  - article "Repository acme/core-api" [ref=e360] [cursor=pointer]:
                    - generic [ref=e361]:
                      - checkbox "Select acme/core-api" [ref=e362]
                      - 'progressbar "Activity Velocity Score: 96/100" [ref=e363]':
                        - generic [ref=e367]: "96"
                      - generic [ref=e368]:
                        - generic [ref=e369]:
                          - generic [ref=e370]: acme/core-api
                          - generic "Private repository" [ref=e371]
                          - generic [ref=e375]: Backend
                        - generic [ref=e376]:
                          - generic [ref=e377]: High-throughput event gateway and tenant metadata store
                          - generic [aria-hidden] [ref=e378]: ·
                          - generic [ref=e379]: Go
                          - generic [aria-hidden] [ref=e382]: ·
                          - generic [ref=e383]: yesterday
                    - generic [ref=e384]:
                      - group "Repository triage verdict" [ref=e447]:
                        - button "Mark acme/core-api as Keep" [ref=e448]:
                          - generic [ref=e451]: Keep
                        - button "Mark acme/core-api as Pause" [ref=e452]:
                          - generic [ref=e456]: Pause
                        - button "Mark acme/core-api as Retire" [ref=e457]:
                          - generic [ref=e461]: Retire
                      - generic [ref=e462]:
                        - button "Add or edit tag" [ref=e463]
                        - button "Snooze" [ref=e467]
                        - link "Open on GitHub" [ref=e471]:
                          - /url: https://github.com/acme/core-api
                  - article "Repository acme/design-system" [ref=e476] [cursor=pointer]:
                    - generic [ref=e477]:
                      - checkbox "Select acme/design-system" [ref=e478]
                      - 'progressbar "Activity Velocity Score: 94/100" [ref=e479]':
                        - generic [ref=e483]: "94"
                      - generic [ref=e484]:
                        - generic [ref=e485]:
                          - generic [ref=e486]: acme/design-system
                          - generic [ref=e487]: Design
                        - generic [ref=e488]:
                          - generic: Radix UI component tokens, Tailwind utilities, and icons
                          - generic [aria-hidden] [ref=e489]: ·
                          - generic [ref=e490]: TypeScript
                          - generic [aria-hidden] [ref=e493]: ·
                          - generic [ref=e494]: 2 days ago
                    - generic [ref=e495]:
                      - group "Repository triage verdict" [ref=e558]:
                        - button "Mark acme/design-system as Keep" [ref=e559]:
                          - generic [ref=e562]: Keep
                        - button "Mark acme/design-system as Pause" [ref=e563]:
                          - generic [ref=e567]: Pause
                        - button "Mark acme/design-system as Retire" [ref=e568]:
                          - generic [ref=e572]: Retire
                      - generic [ref=e573]:
                        - button "Add or edit tag" [ref=e574]
                        - button "Snooze" [ref=e578]
                        - link "Open on GitHub" [ref=e582]:
                          - /url: https://github.com/acme/design-system
                  - article "Repository acme/mobile-client" [ref=e587] [cursor=pointer]:
                    - generic [ref=e588]:
                      - checkbox "Select acme/mobile-client" [ref=e589]
                      - 'progressbar "Activity Velocity Score: 90/100" [ref=e590]':
                        - generic [ref=e594]: "90"
                      - generic [ref=e595]:
                        - generic [ref=e596]:
                          - generic [ref=e597]: acme/mobile-client
                          - generic "Private repository" [ref=e598]
                          - generic [ref=e602]: Mobile
                        - generic [ref=e603]:
                          - generic: Offline-first React Native mobile companion app
                          - generic [aria-hidden] [ref=e604]: ·
                          - generic [ref=e605]: TypeScript
                          - generic [aria-hidden] [ref=e608]: ·
                          - generic [ref=e609]: 4 days ago
                    - generic [ref=e610]:
                      - group "Repository triage verdict" [ref=e673]:
                        - button "Mark acme/mobile-client as Keep" [ref=e674]:
                          - generic [ref=e677]: Keep
                        - button "Mark acme/mobile-client as Pause" [ref=e678]:
                          - generic [ref=e682]: Pause
                        - button "Mark acme/mobile-client as Retire" [ref=e683]:
                          - generic [ref=e687]: Retire
                      - generic [ref=e688]:
                        - button "Add or edit tag" [ref=e689]
                        - button "Snooze" [ref=e693]
                        - link "Open on GitHub" [ref=e697]:
                          - /url: https://github.com/acme/mobile-client
                  - article "Repository acme/edge-worker" [ref=e702] [cursor=pointer]:
                    - generic [ref=e703]:
                      - checkbox "Select acme/edge-worker" [ref=e704]
                      - 'progressbar "Activity Velocity Score: 88/100" [ref=e705]':
                        - generic [ref=e709]: "88"
                      - generic [ref=e710]:
                        - generic [ref=e711]:
                          - generic [ref=e712]: acme/edge-worker
                          - generic [ref=e713]: Infra
                        - generic [ref=e714]:
                          - generic [ref=e715]: Cloudflare Worker for edge caching and rate limiting
                          - generic [aria-hidden] [ref=e716]: ·
                          - generic [ref=e717]: Rust
                          - generic [aria-hidden] [ref=e720]: ·
                          - generic [ref=e721]: 5 days ago
                    - generic [ref=e722]:
                      - group "Repository triage verdict" [ref=e785]:
                        - button "Mark acme/edge-worker as Keep" [ref=e786]:
                          - generic [ref=e789]: Keep
                        - button "Mark acme/edge-worker as Pause" [ref=e790]:
                          - generic [ref=e794]: Pause
                        - button "Mark acme/edge-worker as Retire" [ref=e795]:
                          - generic [ref=e799]: Retire
                      - generic [ref=e800]:
                        - button "Add or edit tag" [ref=e801]
                        - button "Snooze" [ref=e805]
                        - link "Open on GitHub" [ref=e809]:
                          - /url: https://github.com/acme/edge-worker
              - generic [ref=e814]:
                - button "This month ( 6 ) · 8 to 30 days ago" [expanded] [ref=e815] [cursor=pointer]:
                  - generic [ref=e816]:
                    - generic [ref=e820]:
                      - generic [ref=e822]: This month
                      - generic [ref=e823]:
                        - text: (
                        - generic [ref=e824]: "6"
                        - text: )
                    - generic [ref=e825]: · 8 to 30 days ago
                - generic [ref=e888]:
                  - article "Repository acme/billing-service" [ref=e889] [cursor=pointer]:
                    - generic [ref=e890]:
                      - checkbox "Select acme/billing-service" [ref=e891]
                      - 'progressbar "Activity Velocity Score: 71/100" [ref=e892]':
                        - generic [ref=e896]: "71"
                      - generic [ref=e897]:
                        - generic [ref=e898]:
                          - generic [ref=e899]: acme/billing-service
                          - generic "Private repository" [ref=e900]
                          - generic [ref=e904]: Backend
                        - generic [ref=e905]:
                          - generic [ref=e906]: Stripe subscription handling and automated invoice generator
                          - generic [aria-hidden] [ref=e907]: ·
                          - generic [ref=e908]: Go
                          - generic [aria-hidden] [ref=e911]: ·
                          - generic [ref=e912]: 10 days ago
                    - generic [ref=e913]:
                      - group "Repository triage verdict" [ref=e976]:
                        - button "Mark acme/billing-service as Keep" [ref=e977]:
                          - generic [ref=e980]: Keep
                        - button "Mark acme/billing-service as Pause" [ref=e981]:
                          - generic [ref=e985]: Pause
                        - button "Mark acme/billing-service as Retire" [ref=e986]:
                          - generic [ref=e990]: Retire
                      - generic [ref=e991]:
                        - button "Add or edit tag" [ref=e992]
                        - button "Snooze" [ref=e996]
                        - link "Open on GitHub" [ref=e1000]:
                          - /url: https://github.com/acme/billing-service
                  - article "Repository acme/auth-proxy" [ref=e1005] [cursor=pointer]:
                    - generic [ref=e1006]:
                      - checkbox "Select acme/auth-proxy" [ref=e1007]
                      - 'progressbar "Activity Velocity Score: 66/100" [ref=e1008]':
                        - generic [ref=e1012]: "66"
                      - generic [ref=e1013]:
                        - generic [ref=e1014]:
                          - generic [ref=e1015]: acme/auth-proxy
                          - generic "Private repository" [ref=e1016]
                          - generic [ref=e1020]: Security
                        - generic [ref=e1021]:
                          - generic: OAuth2 and GitHub App token minting reverse proxy
                          - generic [aria-hidden] [ref=e1022]: ·
                          - generic [ref=e1023]: TypeScript
                          - generic [aria-hidden] [ref=e1026]: ·
                          - generic [ref=e1027]: 12 days ago
                    - generic [ref=e1028]:
                      - group "Repository triage verdict" [ref=e1091]:
                        - button "Mark acme/auth-proxy as Keep" [ref=e1092]:
                          - generic [ref=e1095]: Keep
                        - button "Mark acme/auth-proxy as Pause" [ref=e1096]:
                          - generic [ref=e1100]: Pause
                        - button "Mark acme/auth-proxy as Retire" [ref=e1101]:
                          - generic [ref=e1105]: Retire
                      - generic [ref=e1106]:
                        - button "Add or edit tag" [ref=e1107]
                        - button "Snooze" [ref=e1111]
                        - link "Open on GitHub" [ref=e1115]:
                          - /url: https://github.com/acme/auth-proxy
                  - article "Repository acme/fastapi-backend" [ref=e1120] [cursor=pointer]:
                    - generic [ref=e1121]:
                      - checkbox "Select acme/fastapi-backend" [ref=e1122]
                      - 'progressbar "Activity Velocity Score: 59/100" [ref=e1123]':
                        - generic [ref=e1127]: "59"
                      - generic [ref=e1128]:
                        - generic [ref=e1129]:
                          - generic [ref=e1130]: acme/fastapi-backend
                          - generic [ref=e1131]: AI/ML
                        - generic [ref=e1132]:
                          - generic [ref=e1133]: Forked async Python API with custom embedding pipelines
                          - generic [aria-hidden] [ref=e1134]: ·
                          - generic [ref=e1135]: Python
                          - generic [aria-hidden] [ref=e1138]: ·
                          - generic [ref=e1139]: 15 days ago
                    - generic [ref=e1140]:
                      - group "Repository triage verdict" [ref=e1203]:
                        - button "Mark acme/fastapi-backend as Keep" [ref=e1204]:
                          - generic [ref=e1207]: Keep
                        - button "Mark acme/fastapi-backend as Pause" [ref=e1208]:
                          - generic [ref=e1212]: Pause
                        - button "Mark acme/fastapi-backend as Retire" [ref=e1213]:
                          - generic [ref=e1217]: Retire
                      - generic [ref=e1218]:
                        - button "Add or edit tag" [ref=e1219]
                        - button "Snooze" [ref=e1223]
                        - link "Open on GitHub" [ref=e1227]:
                          - /url: https://github.com/acme/fastapi-backend
                  - article "Repository acme/docs-site" [ref=e1232] [cursor=pointer]:
                    - generic [ref=e1233]:
                      - checkbox "Select acme/docs-site" [ref=e1234]
                      - 'progressbar "Activity Velocity Score: 56/100" [ref=e1235]':
                        - generic [ref=e1239]: "56"
                      - generic [ref=e1240]:
                        - generic [ref=e1241]:
                          - generic [ref=e1242]: acme/docs-site
                          - generic [ref=e1243]: Docs
                        - generic [ref=e1244]:
                          - generic [ref=e1245]: Developer documentation portal built with Nextra and Tailwind
                          - generic [aria-hidden] [ref=e1246]: ·
                          - generic [ref=e1247]: MDX
                          - generic [aria-hidden] [ref=e1250]: ·
                          - generic [ref=e1251]: 17 days ago
                    - generic [ref=e1252]:
                      - group "Repository triage verdict" [ref=e1315]:
                        - button "Mark acme/docs-site as Keep" [ref=e1316]:
                          - generic [ref=e1319]: Keep
                        - button "Mark acme/docs-site as Pause" [ref=e1320]:
                          - generic [ref=e1324]: Pause
                        - button "Mark acme/docs-site as Retire" [ref=e1325]:
                          - generic [ref=e1329]: Retire
                      - generic [ref=e1330]:
                        - button "Add or edit tag" [ref=e1331]
                        - button "Snooze" [ref=e1335]
                        - link "Open on GitHub" [ref=e1339]:
                          - /url: https://github.com/acme/docs-site
                  - article "Repository acme/cli-runner" [ref=e1344] [cursor=pointer]:
                    - generic [ref=e1345]:
                      - checkbox "Select acme/cli-runner" [ref=e1346]
                      - 'progressbar "Activity Velocity Score: 53/100" [ref=e1347]':
                        - generic [ref=e1351]: "53"
                      - generic [ref=e1352]:
                        - generic [ref=e1353]:
                          - generic [ref=e1354]: acme/cli-runner
                          - generic [ref=e1355]: CLI
                        - generic [ref=e1356]:
                          - generic [ref=e1357]: Command line terminal client for quick repository triage
                          - generic [aria-hidden] [ref=e1358]: ·
                          - generic [ref=e1359]: Rust
                          - generic [aria-hidden] [ref=e1362]: ·
                          - generic [ref=e1363]: 19 days ago
                    - generic [ref=e1364]:
                      - group "Repository triage verdict" [ref=e1427]:
                        - button "Mark acme/cli-runner as Keep" [ref=e1428]:
                          - generic [ref=e1431]: Keep
                        - button "Mark acme/cli-runner as Pause" [ref=e1432]:
                          - generic [ref=e1436]: Pause
                        - button "Mark acme/cli-runner as Retire" [ref=e1437]:
                          - generic [ref=e1441]: Retire
                      - generic [ref=e1442]:
                        - button "Add or edit tag" [ref=e1443]
                        - button "Snooze" [ref=e1447]
                        - link "Open on GitHub" [ref=e1451]:
                          - /url: https://github.com/acme/cli-runner
                  - article "Repository acme/analytics-pipeline" [ref=e1456] [cursor=pointer]:
                    - generic [ref=e1457]:
                      - checkbox "Select acme/analytics-pipeline" [ref=e1458]
                      - 'progressbar "Activity Velocity Score: 50/100" [ref=e1459]':
                        - generic [ref=e1463]: "50"
                      - generic [ref=e1464]:
                        - generic [ref=e1465]:
                          - generic [ref=e1466]: acme/analytics-pipeline
                          - generic "Private repository" [ref=e1467]
                          - generic [ref=e1471]: Data
                        - generic [ref=e1472]:
                          - generic [ref=e1473]: Scheduled batch pipeline aggregating weekly engineering metrics
                          - generic [aria-hidden] [ref=e1474]: ·
                          - generic [ref=e1475]: Python
                          - generic [aria-hidden] [ref=e1478]: ·
                          - generic [ref=e1479]: 21 days ago
                    - generic [ref=e1480]:
                      - group "Repository triage verdict" [ref=e1543]:
                        - button "Mark acme/analytics-pipeline as Keep" [ref=e1544]:
                          - generic [ref=e1547]: Keep
                        - button "Mark acme/analytics-pipeline as Pause" [ref=e1548]:
                          - generic [ref=e1552]: Pause
                        - button "Mark acme/analytics-pipeline as Retire" [ref=e1553]:
                          - generic [ref=e1557]: Retire
                      - generic [ref=e1558]:
                        - button "Add or edit tag" [ref=e1559]
                        - button "Snooze" [ref=e1563]
                        - link "Open on GitHub" [ref=e1567]:
                          - /url: https://github.com/acme/analytics-pipeline
              - generic [ref=e1572]:
                - button "Last 3 months ( 5 ) · 31 to 90 days ago" [expanded] [ref=e1573] [cursor=pointer]:
                  - generic [ref=e1574]:
                    - generic [ref=e1578]:
                      - generic [ref=e1580]: Last 3 months
                      - generic [ref=e1581]:
                        - text: (
                        - generic [ref=e1582]: "5"
                        - text: )
                    - generic [ref=e1583]: · 31 to 90 days ago
                - generic [ref=e1646]:
                  - article "Repository acme/postgres-migrator" [ref=e1647] [cursor=pointer]:
                    - generic [ref=e1648]:
                      - checkbox "Select acme/postgres-migrator" [ref=e1649]
                      - 'progressbar "Activity Velocity Score: 33/100" [ref=e1650]':
                        - generic [ref=e1654]: "33"
                      - generic [ref=e1655]:
                        - generic [ref=e1656]:
                          - generic [ref=e1657]: acme/postgres-migrator
                          - generic [ref=e1658]: Database
                        - generic [ref=e1659]:
                          - generic [ref=e1660]: Zero-downtime database migration runner and schema validator
                          - generic [aria-hidden] [ref=e1661]: ·
                          - generic [ref=e1662]: Go
                          - generic [aria-hidden] [ref=e1665]: ·
                          - generic [ref=e1666]: 1 month ago
                    - generic [ref=e1667]:
                      - group "Repository triage verdict" [ref=e1730]:
                        - button "Mark acme/postgres-migrator as Keep" [ref=e1731]:
                          - generic [ref=e1734]: Keep
                        - button "Mark acme/postgres-migrator as Pause" [ref=e1735]:
                          - generic [ref=e1739]: Pause
                        - button "Mark acme/postgres-migrator as Retire" [ref=e1740]:
                          - generic [ref=e1744]: Retire
                      - generic [ref=e1745]:
                        - button "Add or edit tag" [ref=e1746]
                        - button "Snooze" [ref=e1750]
                        - link "Open on GitHub" [ref=e1754]:
                          - /url: https://github.com/acme/postgres-migrator
                  - article "Repository acme/kafka-consumer" [ref=e1759] [cursor=pointer]:
                    - generic [ref=e1760]:
                      - checkbox "Select acme/kafka-consumer" [ref=e1761]
                      - 'progressbar "Activity Velocity Score: 30/100" [ref=e1762]':
                        - generic [ref=e1766]: "30"
                      - generic [ref=e1767]:
                        - generic [ref=e1768]:
                          - generic [ref=e1769]: acme/kafka-consumer
                          - generic [ref=e1770]: Infra
                        - generic [ref=e1771]:
                          - generic [ref=e1772]: High-throughput Kafka streaming client with batch ack
                          - generic [aria-hidden] [ref=e1773]: ·
                          - generic [ref=e1774]: Java
                          - generic [aria-hidden] [ref=e1777]: ·
                          - generic [ref=e1778]: 1 month ago
                    - generic [ref=e1779]:
                      - group "Repository triage verdict" [ref=e1842]:
                        - button "Mark acme/kafka-consumer as Keep" [ref=e1843]:
                          - generic [ref=e1846]: Keep
                        - button "Mark acme/kafka-consumer as Pause" [ref=e1847]:
                          - generic [ref=e1851]: Pause
                        - button "Mark acme/kafka-consumer as Retire" [ref=e1852]:
                          - generic [ref=e1856]: Retire
                      - generic [ref=e1857]:
                        - button "Add or edit tag" [ref=e1858]
                        - button "Snooze" [ref=e1862]
                        - link "Open on GitHub" [ref=e1866]:
                          - /url: https://github.com/acme/kafka-consumer
                  - article "Repository acme/theme-previewer" [ref=e1871] [cursor=pointer]:
                    - generic [ref=e1872]:
                      - checkbox "Select acme/theme-previewer" [ref=e1873]
                      - 'progressbar "Activity Velocity Score: 27/100" [ref=e1874]':
                        - generic [ref=e1878]: "27"
                      - generic [ref=e1879]:
                        - generic [ref=e1880]:
                          - generic [ref=e1881]: acme/theme-previewer
                          - generic [ref=e1882]: Frontend
                        - generic [ref=e1883]:
                          - generic: Forked color scheme tester and token contrast calculator
                          - generic [aria-hidden] [ref=e1884]: ·
                          - generic [ref=e1885]: TypeScript
                          - generic [aria-hidden] [ref=e1888]: ·
                          - generic [ref=e1889]: 1 month ago
                    - generic [ref=e1890]:
                      - group "Repository triage verdict" [ref=e1953]:
                        - button "Mark acme/theme-previewer as Keep" [ref=e1954]:
                          - generic [ref=e1957]: Keep
                        - button "Mark acme/theme-previewer as Pause" [ref=e1958]:
                          - generic [ref=e1962]: Pause
                        - button "Mark acme/theme-previewer as Retire" [ref=e1963]:
                          - generic [ref=e1967]: Retire
                      - generic [ref=e1968]:
                        - button "Add or edit tag" [ref=e1969]
                        - button "Snooze" [ref=e1973]
                        - link "Open on GitHub" [ref=e1977]:
                          - /url: https://github.com/acme/theme-previewer
                  - article "Repository acme/legacy-oauth-shim" [ref=e1982] [cursor=pointer]:
                    - generic [ref=e1983]:
                      - checkbox "Select acme/legacy-oauth-shim" [ref=e1984]
                      - 'progressbar "Activity Velocity Score: 25/100" [ref=e1985]':
                        - generic [ref=e1989]: "25"
                      - generic [ref=e1990]:
                        - generic [ref=e1991]:
                          - generic [ref=e1992]: acme/legacy-oauth-shim
                          - generic "Private repository" [ref=e1993]
                          - generic [ref=e1997]: Legacy
                        - generic [ref=e1998]:
                          - generic [ref=e1999]: Archived OAuth 1.0a backward-compatibility proxy
                          - generic [aria-hidden] [ref=e2000]: ·
                          - generic [ref=e2001]: Ruby
                          - generic [aria-hidden] [ref=e2004]: ·
                          - generic [ref=e2005]: 1 month ago
                    - generic [ref=e2006]:
                      - group "Repository triage verdict" [ref=e2069]:
                        - button "Mark acme/legacy-oauth-shim as Keep" [ref=e2070]:
                          - generic [ref=e2073]: Keep
                        - button "Mark acme/legacy-oauth-shim as Pause" [ref=e2074]:
                          - generic [ref=e2078]: Pause
                        - button "Mark acme/legacy-oauth-shim as Retire" [ref=e2079]:
                          - generic [ref=e2083]: Retire
                      - generic [ref=e2084]:
                        - button "Add or edit tag" [ref=e2085]
                        - button "Snooze" [ref=e2089]
                        - link "Open on GitHub" [ref=e2093]:
                          - /url: https://github.com/acme/legacy-oauth-shim
                  - article "Repository acme/redis-cache-helper" [ref=e2098] [cursor=pointer]:
                    - generic [ref=e2099]:
                      - checkbox "Select acme/redis-cache-helper" [ref=e2100]
                      - 'progressbar "Activity Velocity Score: 23/100" [ref=e2101]':
                        - generic [ref=e2105]: "23"
                      - generic [ref=e2106]:
                        - generic [ref=e2107]:
                          - generic [ref=e2108]: acme/redis-cache-helper
                          - generic [ref=e2109]: Utility
                        - generic [ref=e2110]:
                          - generic: Resilient Redis caching wrapper with exponential jitter
                          - generic [aria-hidden] [ref=e2111]: ·
                          - generic [ref=e2112]: TypeScript
                          - generic [aria-hidden] [ref=e2115]: ·
                          - generic [ref=e2116]: 2 mos ago
                    - generic [ref=e2117]:
                      - group "Repository triage verdict" [ref=e2180]:
                        - button "Mark acme/redis-cache-helper as Keep" [ref=e2181]:
                          - generic [ref=e2184]: Keep
                        - button "Mark acme/redis-cache-helper as Pause" [ref=e2185]:
                          - generic [ref=e2189]: Pause
                        - button "Mark acme/redis-cache-helper as Retire" [ref=e2190]:
                          - generic [ref=e2194]: Retire
                      - generic [ref=e2195]:
                        - button "Add or edit tag" [ref=e2196]
                        - button "Snooze" [ref=e2200]
                        - link "Open on GitHub" [ref=e2204]:
                          - /url: https://github.com/acme/redis-cache-helper
              - button "Dormant ( 4 ) · No commits in over 90 days" [ref=e2210] [cursor=pointer]:
                - generic [ref=e2211]:
                  - generic [ref=e2215]:
                    - generic [ref=e2217]: Dormant
                    - generic [ref=e2218]:
                      - text: (
                      - generic [ref=e2219]: "4"
                      - text: )
                  - generic [ref=e2220]: · No commits in over 90 days
          - region "Design feedback prompt" [ref=e2283]:
            - generic [ref=e2284]:
              - generic [ref=e2285]:
                - generic [ref=e2286]: How's the new design?
                - button "Dismiss feedback prompt" [ref=e2290] [cursor=pointer]
              - generic [ref=e2294]:
                - button "Loving it" [ref=e2295] [cursor=pointer]
                - button "Needs work" [ref=e2299] [cursor=pointer]
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Visual Regression Suite (Playwright Screenshots)', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Dismiss coachmarks, set consistent light theme, and reset feedback prompt state
  6   |     await page.addInitScript(() => {
  7   |       localStorage.setItem('repopulse_coachmarks_dismissed_v4', 'true');
  8   |       localStorage.setItem('repopulse_theme', 'light');
  9   |       localStorage.removeItem('repopulse_design_feedback_state');
  10  |     });
  11  |   });
  12  | 
  13  |   test('Phase 1: Application Shell layout (Desktop & Mobile)', async ({ page }) => {
  14  |     await page.goto('/?demo=true&welcome=false&ui=v4');
  15  |     await page.waitForLoadState('domcontentloaded');
  16  |     await page.getByRole('banner').waitFor({ state: 'visible' });
  17  |     await page.waitForTimeout(300);
  18  | 
  19  |     // Verify Shell visual snapshot
  20  |     await expect(page).toHaveScreenshot('shell-layout.png', {
  21  |       maxDiffPixelRatio: 0.05,
  22  |       animations: 'disabled',
  23  |       mask: [
  24  |         page.locator('header [role="status"]'), // dynamic sync timer
  25  |       ],
  26  |     });
  27  |   });
  28  | 
  29  |   test('Phase 2: Main Ledger View with grouped sections and controls', async ({ page }) => {
  30  |     await page.goto('/?demo=true&welcome=false&tab=overview&ui=v4');
  31  |     await page.waitForLoadState('domcontentloaded');
> 32  |     await page.locator('article[aria-label^="Repository"]').first().waitFor({ state: 'visible' });
      |                                                                     ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  33  |     await page.waitForTimeout(300);
  34  | 
  35  |     // Verify main ledger view visual snapshot
  36  |     await expect(page.locator('main')).toHaveScreenshot('ledger-view.png', {
  37  |       maxDiffPixelRatio: 0.05,
  38  |       animations: 'disabled',
  39  |       mask: [
  40  |         page.locator('header [role="status"]'),
  41  |       ],
  42  |     });
  43  |   });
  44  | 
  45  |   test('Phase 3: Repo Detail Slide-over Sheet / Drawer', async ({ page }) => {
  46  |     await page.goto('/?demo=true&welcome=false&repo=101&ui=v4');
  47  |     await page.waitForLoadState('domcontentloaded');
  48  |     const drawer = page.locator('[aria-labelledby="repo-drawer-title"]');
  49  |     await expect(drawer).toBeVisible();
  50  |     await page.waitForTimeout(300);
  51  | 
  52  |     // Verify Repo Detail Drawer snapshot
  53  |     await expect(drawer).toHaveScreenshot('repo-detail-drawer.png', {
  54  |       maxDiffPixelRatio: 0.05,
  55  |       animations: 'disabled',
  56  |     });
  57  |   });
  58  | 
  59  |   test('Phase 4: Triage Mode focus card and keyboard shortcuts', async ({ page }) => {
  60  |     await page.goto('/?demo=true&welcome=false&tab=triage&ui=v4');
  61  |     await page.waitForLoadState('domcontentloaded');
  62  |     const progress = page.getByRole('progressbar', { name: 'Triage queue progress' });
  63  |     await expect(progress).toBeVisible();
  64  |     await page.waitForTimeout(300);
  65  | 
  66  |     // Verify Triage mode snapshot
  67  |     await expect(page.locator('main')).toHaveScreenshot('triage-mode.png', {
  68  |       maxDiffPixelRatio: 0.05,
  69  |       animations: 'disabled',
  70  |     });
  71  |   });
  72  | 
  73  |   test('Phase 5: Remaining Views (Decisions, Digest, Analytics, Settings)', async ({ page }) => {
  74  |     // 1. Decisions View
  75  |     await page.goto('/?demo=true&welcome=false&tab=decisions&ui=v4');
  76  |     await page.waitForLoadState('domcontentloaded');
  77  |     await page.locator('main h1:has-text("Decisions")').waitFor({ state: 'visible' });
  78  |     await page.waitForTimeout(300);
  79  |     await expect(page.locator('main')).toHaveScreenshot('decisions-view.png', {
  80  |       maxDiffPixelRatio: 0.05,
  81  |       animations: 'disabled',
  82  |     });
  83  | 
  84  |     // 2. Digest View
  85  |     await page.goto('/?demo=true&welcome=false&tab=digest&ui=v4');
  86  |     await page.waitForLoadState('domcontentloaded');
  87  |     await page.locator('text=Weekly Repository Digest').waitFor({ state: 'visible' });
  88  |     await page.waitForTimeout(300);
  89  |     await expect(page.locator('main')).toHaveScreenshot('digest-view.png', {
  90  |       maxDiffPixelRatio: 0.05,
  91  |       animations: 'disabled',
  92  |     });
  93  | 
  94  |     // 3. Analytics View
  95  |     await page.goto('/?demo=true&welcome=false&tab=analytics&ui=v4');
  96  |     await page.waitForLoadState('domcontentloaded');
  97  |     await page.locator('main h1:has-text("Portfolio Analytics")').waitFor({ state: 'visible' });
  98  |     await page.waitForTimeout(350);
  99  |     await expect(page.locator('main')).toHaveScreenshot('analytics-view.png', {
  100 |       maxDiffPixelRatio: 0.05,
  101 |       animations: 'disabled',
  102 |     });
  103 | 
  104 |     // 4. Settings View
  105 |     await page.goto('/?demo=true&welcome=false&tab=settings&ui=v4');
  106 |     await page.waitForLoadState('domcontentloaded');
  107 |     await page.locator('main h1:has-text("Settings")').waitFor({ state: 'visible' });
  108 |     await page.waitForTimeout(300);
  109 |     await expect(page.locator('main')).toHaveScreenshot('settings-view.png', {
  110 |       maxDiffPixelRatio: 0.05,
  111 |       animations: 'disabled',
  112 |     });
  113 |   });
  114 | 
  115 |   test('Design Feedback Prompt: Renders "How\'s the new design?" floating pill', async ({ page }) => {
  116 |     await page.goto('/?demo=true&welcome=false&ui=v4&prompt=true');
  117 |     await page.waitForLoadState('domcontentloaded');
  118 | 
  119 |     // Wait for the feedback prompt to become visible immediately
  120 |     const prompt = page.locator('aside[aria-label="Design feedback prompt"]');
  121 |     await expect(prompt).toBeVisible({ timeout: 6000 });
  122 |     await page.waitForTimeout(300);
  123 | 
  124 |     await expect(prompt).toHaveScreenshot('feedback-prompt.png', {
  125 |       maxDiffPixelRatio: 0.05,
  126 |       animations: 'disabled',
  127 |     });
  128 |   });
  129 | });
  130 | 
```