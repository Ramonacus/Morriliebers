# Global City Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand bot from 13 Spanish venues to 60 global venues across 30 cities (1M+ population) with continent metadata.

**Architecture:** Non-breaking data expansion. Add `continent` field to Venue interface, update validation, replace venues.json with global data, update test fixtures.

**Tech Stack:** TypeScript, Vitest

---

## File Structure

**Files to modify:**
- `src/types.ts` - Add continent field to Venue interface
- `src/venues.ts` - Add continent validation
- `config/venues.json` - Replace with 60 global venues
- `src/__tests__/fixtures.ts` - Update mock venue data
- `src/__tests__/venues.test.ts` - Add continent validation tests
- `src/__tests__/concertGenerator.test.ts` - Update venue fixtures
- `src/__tests__/scheduler.test.ts` - Update venue fixtures
- `src/__tests__/blueskyClient.test.ts` - Update venue fixtures
- `src/__tests__/storage.test.ts` - Update venue fixtures
- `src/__tests__/scripts/announce.test.ts` - Update venue fixtures
- `src/__tests__/scripts/cancel-next.test.ts` - Update venue fixtures
- `README.md` - Update venue descriptions
- `docs/superpowers/specs/2026-03-12-morriliebers-bluesky-bot-design.md` - Update venue section

**Files not modified:**
- `src/concertGenerator.ts` - Uses venues via import, no logic changes
- `src/scheduler.ts` - No venue-related logic
- `src/blueskyClient.ts` - No venue-related logic
- `src/storage.ts` - No venue-related logic
- `src/index.ts` - No venue-related logic

---

## Task 1: Update Venue Type Definition

**Files:**
- Modify: `src/types.ts:4-8`

- [ ] **Step 1: Add continent field to Venue interface**

```typescript
/**
 * Venue information for concerts
 */
export interface Venue {
  name: string;
  city: string;
  continent: string;  // "North America", "South America", "Europe", "Asia"
  capacity?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: SUCCESS (no type errors)

- [ ] **Step 3: Commit type change**

```bash
git add src/types.ts
git commit -m "feat: add continent field to Venue interface

Add continent field to support geographic metadata for global venue expansion.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add Continent Validation

**Files:**
- Modify: `src/venues.ts:23-32`
- Test: `src/__tests__/venues.test.ts`

- [ ] **Step 1: Write failing test for missing continent**

Add to `src/__tests__/venues.test.ts` after existing validation tests:

```typescript
describe('continent validation', () => {
  it('should throw error if continent is missing', () => {
    const invalidVenues = [{ name: 'Test Venue', city: 'Test City' }];
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidVenues));

    expect(() => {
      vi.resetModules();
      return import('../venues.js');
    }).rejects.toThrow("Venue at index 0 missing or invalid 'continent' property");
  });

  it('should throw error if continent is not a string', () => {
    const invalidVenues = [{ name: 'Test Venue', city: 'Test City', continent: 123 }];
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(invalidVenues));

    expect(() => {
      vi.resetModules();
      return import('../venues.js');
    }).rejects.toThrow("Venue at index 0 missing or invalid 'continent' property");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/__tests__/venues.test.ts`
Expected: FAIL - tests expect validation that doesn't exist yet

- [ ] **Step 3: Add continent validation to loadVenues**

In `src/venues.ts`, add validation after city check (around line 32):

```typescript
    // Validate each venue has required properties
    for (let i = 0; i < parsed.length; i++) {
      const venue = parsed[i];
      if (!venue.name || typeof venue.name !== 'string') {
        throw new Error(`Venue at index ${i} missing or invalid 'name' property`);
      }
      if (!venue.city || typeof venue.city !== 'string') {
        throw new Error(`Venue at index ${i} missing or invalid 'city' property`);
      }
      if (!venue.continent || typeof venue.continent !== 'string') {
        throw new Error(`Venue at index ${i} missing or invalid 'continent' property`);
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/__tests__/venues.test.ts`
Expected: PASS - continent validation tests pass

- [ ] **Step 5: Commit validation logic**

```bash
git add src/venues.ts src/__tests__/venues.test.ts
git commit -m "feat: add continent field validation to venue loading

Validate that all venues have a continent field when loading from config.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Update Test Fixtures

**Files:**
- Modify: `src/__tests__/fixtures.ts`

- [ ] **Step 1: Add continent field to mock venue factory**

In `src/__tests__/fixtures.ts`, update `createMockVenue` function:

```typescript
export function createMockVenue(overrides?: Partial<Venue>): Venue {
  return {
    name: 'Test Venue',
    city: 'Test City',
    continent: 'Europe',
    ...overrides,
  };
}
```

- [ ] **Step 2: Run all tests to verify fixtures work**

Run: `npm test`
Expected: All tests pass with updated fixtures

- [ ] **Step 3: Commit fixture updates**

```bash
git add src/__tests__/fixtures.ts
git commit -m "test: add continent field to mock venue fixtures

Update test fixtures to include continent field for Venue interface.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Replace Venues Configuration

**Files:**
- Modify: `config/venues.json`

- [ ] **Step 1: Create new venues.json with global venues**

Replace entire contents of `config/venues.json`:

```json
[
  {
    "name": "Madison Square Garden",
    "city": "New York",
    "continent": "North America"
  },
  {
    "name": "Brooklyn Steel",
    "city": "New York",
    "continent": "North America"
  },
  {
    "name": "The Wiltern",
    "city": "Los Angeles",
    "continent": "North America"
  },
  {
    "name": "Hollywood Palladium",
    "city": "Los Angeles",
    "continent": "North America"
  },
  {
    "name": "Metro Chicago",
    "city": "Chicago",
    "continent": "North America"
  },
  {
    "name": "Thalia Hall",
    "city": "Chicago",
    "continent": "North America"
  },
  {
    "name": "House of Blues Houston",
    "city": "Houston",
    "continent": "North America"
  },
  {
    "name": "White Oak Music Hall",
    "city": "Houston",
    "continent": "North America"
  },
  {
    "name": "The Van Buren",
    "city": "Phoenix",
    "continent": "North America"
  },
  {
    "name": "Crescent Ballroom",
    "city": "Phoenix",
    "continent": "North America"
  },
  {
    "name": "Union Transfer",
    "city": "Philadelphia",
    "continent": "North America"
  },
  {
    "name": "The Fillmore Philadelphia",
    "city": "Philadelphia",
    "continent": "North America"
  },
  {
    "name": "Aztec Theatre",
    "city": "San Antonio",
    "continent": "North America"
  },
  {
    "name": "Paper Tiger",
    "city": "San Antonio",
    "continent": "North America"
  },
  {
    "name": "The Observatory North Park",
    "city": "San Diego",
    "continent": "North America"
  },
  {
    "name": "House of Blues San Diego",
    "city": "San Diego",
    "continent": "North America"
  },
  {
    "name": "The Factory",
    "city": "Dallas",
    "continent": "North America"
  },
  {
    "name": "Granada Theater",
    "city": "Dallas",
    "continent": "North America"
  },
  {
    "name": "Danforth Music Hall",
    "city": "Toronto",
    "continent": "North America"
  },
  {
    "name": "The Phoenix Concert Theatre",
    "city": "Toronto",
    "continent": "North America"
  },
  {
    "name": "Metropolis",
    "city": "Montreal",
    "continent": "North America"
  },
  {
    "name": "Corona Theatre",
    "city": "Montreal",
    "continent": "North America"
  },
  {
    "name": "Theatro Municipal",
    "city": "São Paulo",
    "continent": "South America"
  },
  {
    "name": "Carioca Club",
    "city": "São Paulo",
    "continent": "South America"
  },
  {
    "name": "Circo Voador",
    "city": "Rio de Janeiro",
    "continent": "South America"
  },
  {
    "name": "Teatro Odisseia",
    "city": "Rio de Janeiro",
    "continent": "South America"
  },
  {
    "name": "Centro Cultural Banco do Brasil",
    "city": "Brasília",
    "continent": "South America"
  },
  {
    "name": "Toinha Brasil Show",
    "city": "Brasília",
    "continent": "South America"
  },
  {
    "name": "Teatro Colón",
    "city": "Buenos Aires",
    "continent": "South America"
  },
  {
    "name": "Niceto Club",
    "city": "Buenos Aires",
    "continent": "South America"
  },
  {
    "name": "Teatro Caupolican",
    "city": "Santiago",
    "continent": "South America"
  },
  {
    "name": "Club Blondie",
    "city": "Santiago",
    "continent": "South America"
  },
  {
    "name": "Teatro Jorge Eliécer Gaitán",
    "city": "Bogotá",
    "continent": "South America"
  },
  {
    "name": "Armando Records",
    "city": "Bogotá",
    "continent": "South America"
  },
  {
    "name": "Roundhouse",
    "city": "London",
    "continent": "Europe"
  },
  {
    "name": "Electric Ballroom",
    "city": "London",
    "continent": "Europe"
  },
  {
    "name": "Olympia",
    "city": "Paris",
    "continent": "Europe"
  },
  {
    "name": "La Cigale",
    "city": "Paris",
    "continent": "Europe"
  },
  {
    "name": "Huxleys Neue Welt",
    "city": "Berlin",
    "continent": "Europe"
  },
  {
    "name": "SO36",
    "city": "Berlin",
    "continent": "Europe"
  },
  {
    "name": "Atlantico Live",
    "city": "Rome",
    "continent": "Europe"
  },
  {
    "name": "Circolo degli Artisti",
    "city": "Rome",
    "continent": "Europe"
  },
  {
    "name": "WiZink Center",
    "city": "Madrid",
    "continent": "Europe"
  },
  {
    "name": "Sala Riviera",
    "city": "Madrid",
    "continent": "Europe"
  },
  {
    "name": "Sala Apolo",
    "city": "Barcelona",
    "continent": "Europe"
  },
  {
    "name": "Razzmatazz",
    "city": "Barcelona",
    "continent": "Europe"
  },
  {
    "name": "Arena Wien",
    "city": "Vienna",
    "continent": "Europe"
  },
  {
    "name": "Flex",
    "city": "Vienna",
    "continent": "Europe"
  },
  {
    "name": "Paradiso",
    "city": "Amsterdam",
    "continent": "Europe"
  },
  {
    "name": "Melkweg",
    "city": "Amsterdam",
    "continent": "Europe"
  },
  {
    "name": "Ancienne Belgique",
    "city": "Brussels",
    "continent": "Europe"
  },
  {
    "name": "Botanique",
    "city": "Brussels",
    "continent": "Europe"
  },
  {
    "name": "Olympic Hall",
    "city": "Seoul",
    "continent": "Asia"
  },
  {
    "name": "Rolling Hall",
    "city": "Seoul",
    "continent": "Asia"
  },
  {
    "name": "Shibuya WWW",
    "city": "Tokyo",
    "continent": "Asia"
  },
  {
    "name": "Liquidroom",
    "city": "Tokyo",
    "continent": "Asia"
  },
  {
    "name": "Namba Hatch",
    "city": "Osaka",
    "continent": "Asia"
  },
  {
    "name": "Shangri-La",
    "city": "Osaka",
    "continent": "Asia"
  },
  {
    "name": "Diamond Hall",
    "city": "Nagoya",
    "continent": "Asia"
  },
  {
    "name": "APOLLO BASE",
    "city": "Nagoya",
    "continent": "Asia"
  }
]
```

- [ ] **Step 2: Verify venue count**

Run: `node -e "console.log(require('./config/venues.json').length)"`
Expected: 60

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All 75 tests pass

- [ ] **Step 4: Verify build succeeds**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 5: Commit venue data**

```bash
git add config/venues.json
git commit -m "feat: expand venues to 60 global venues across 30 cities

Replace 13 Spanish venues with 60 international venues:
- North America: 22 venues (11 cities)
- South America: 12 venues (6 cities)
- Europe: 18 venues (9 cities, including Madrid/Barcelona)
- Asia: 8 venues (4 cities)

All cities have 1M+ population. Each city has 2 venues.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-12-morriliebers-bluesky-bot-design.md`

- [ ] **Step 1: Update README.md Features section**

Replace lines 6-11 in README.md:

```markdown
## Features

- 📅 Generates 1-3 concerts per week for global venues
- 📢 Posts weekly announcement every Monday (10:00-14:00)
- 📌 Pins announcements to profile
- ❌ Cancels concerts 20-24 hours before showtime
- 🌍 Venues across North America, South America, Europe, and Asia
```

- [ ] **Step 2: Update README.md Venues section**

Replace lines 132-140 in README.md:

```markdown
## Venues

60 venues across 30 cities with 1M+ population:
- **North America** (11 cities) → 22 venues (USA: 9 cities, Canada: 2 cities)
- **South America** (6 cities) → 12 venues (Brazil, Argentina, Chile, Colombia)
- **Europe** (9 cities) → 18 venues (Including Madrid and Barcelona)
- **Asia** (4 cities) → 8 venues (Korea: 1 city, Japan: 3 cities)

Edit `config/venues.json` to modify the venue list.
```

- [ ] **Step 3: Update original design doc venue section**

In `docs/superpowers/specs/2026-03-12-morriliebers-bluesky-bot-design.md`, add after line 120:

```markdown
**Note:** As of 2026-03-17, venues have been expanded to 60 global venues across 30 cities (1M+ population).
See `2026-03-17-global-city-expansion-design.md` for details.
```

- [ ] **Step 4: Commit documentation updates**

```bash
git add README.md docs/superpowers/specs/2026-03-12-morriliebers-bluesky-bot-design.md
git commit -m "docs: update venue descriptions for global expansion

Update README and design docs to reflect 60 global venues across 30 cities.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Final Verification

**Files:**
- All project files

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All 75 tests pass

- [ ] **Step 2: Run type checking**

Run: `npm run build`
Expected: SUCCESS (no TypeScript errors)

- [ ] **Step 3: Verify venue data integrity**

Run: `node -e "const v = require('./config/venues.json'); console.log('Total:', v.length, '\nNA:', v.filter(x => x.continent === 'North America').length, '\nSA:', v.filter(x => x.continent === 'South America').length, '\nEU:', v.filter(x => x.continent === 'Europe').length, '\nAS:', v.filter(x => x.continent === 'Asia').length)"`

Expected output:
```
Total: 60
NA: 22
SA: 12
EU: 18
AS: 8
```

- [ ] **Step 4: Check git status**

Run: `git status`
Expected: Working tree clean, all changes committed

---

## Success Criteria

✅ All 75 existing tests pass
✅ TypeScript compilation succeeds
✅ 60 venues loaded from config/venues.json
✅ Venues include continent field
✅ Geographic distribution: 22 NA, 12 SA, 18 EU, 8 AS
✅ Documentation reflects global expansion
✅ All changes committed to git

## Rollback Plan

If issues arise:
1. `git log --oneline` to see commits
2. `git revert <commit-hash>` for specific commit
3. Or `git reset --hard <previous-commit>` to undo all changes
4. Restart bot: `pm2 restart morriliebers-bot`

## Notes

- No deployment needed for testing - changes are data-driven
- Existing `data/concerts.json` state file remains compatible
- Bot can continue running during development (new venues take effect on next concert generation)
- All venue names are real, well-known music venues
