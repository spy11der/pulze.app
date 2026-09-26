# Consumer cleanup backlog

These are known issues that are recorded here and not yet fixed. Each one needs its own approved change.

## From the Recommended R0 validation (2026-09-26)

These were found during the R0 Search validation. All three predate R0 and were deliberately left out of the R0 release.

1. **The welcome-to-city banner covers the Discover header.** `components/CityWelcome.tsx` is absolutely positioned at zIndex 999. It appears about 2 s after Discover loads, once per city, and dismisses itself after 6 s. While it is showing it covers the header, including the Search icon (new in R0) and the bell. Users can close it or wait, but for those seconds the header controls cannot be reached.
2. **Web venue detail: navigation and tab bar.** In web mode `/venue-detail` shows the floating tab bar, even though `HIDDEN_SEGMENTS` in `components/FloatingTabBar.tsx` lists `venue-detail`. It also has no visible back control, so browser back is the only way out. Native behaviour has not been checked against this.
3. **Implausible walking time for distant venues.** Venue detail shows walking minutes whatever the distance. A venue 2,367 km away showed "28180 min Away". This matters now because nationwide Search can open venues in other cities. Above some distance the card should show a distance instead of a walk time, or show nothing.
