# Global City Expansion Design

**Date:** 2026-03-17
**Status:** Approved

## Overview

Expand the Morriliebers Bluesky bot from Spanish-focused (5 cities, 500k+ population) to globally distributed across Western hemisphere, Europe, and Asia (30 cities, 1M+ population).

## Goals

- Apply consistent 1M+ population threshold across all cities globally
- Expand from 13 Spanish venues to ~60 international venues
- Add geographic metadata (continent) to enable future region-based features
- Maintain all existing bot behavior and scheduling logic

## Requirements

### Functional Changes

1. **City Selection**: 30 cities with 1M+ population from:
   - North America: USA (9 cities), Canada (2 cities)
   - South America: Brazil (3 cities), Argentina (1), Chile (1), Colombia (1)
   - Europe: 9 major cities including Madrid and Barcelona
   - Asia: Korea (1 city), Japan (3 cities)

2. **Venue Distribution**: 2 venues per city (~60 total)

3. **Data Model Enhancement**: Add `continent` field to Venue interface

4. **Documentation Updates**: Reflect global nature and English messaging

### Non-Functional Requirements

- Backward compatible with existing state files
- All existing tests pass with minimal updates
- No changes to bot scheduling or cancellation logic

## City and Venue List

### North America (11 cities, 22 venues)

**USA (9 cities):**
- **New York** - Madison Square Garden, Brooklyn Steel
- **Los Angeles** - The Wiltern, Hollywood Palladium
- **Chicago** - Metro Chicago, Thalia Hall
- **Houston** - House of Blues Houston, White Oak Music Hall
- **Phoenix** - The Van Buren, Crescent Ballroom
- **Philadelphia** - Union Transfer, The Fillmore Philadelphia
- **San Antonio** - Aztec Theatre, Paper Tiger
- **San Diego** - The Observatory North Park, House of Blues San Diego
- **Dallas** - The Factory, Granada Theater

**Canada (2 cities):**
- **Toronto** - Danforth Music Hall, The Phoenix Concert Theatre
- **Montreal** - Metropolis, Corona Theatre

### South America (6 cities, 12 venues)

- **São Paulo** - Theatro Municipal, Carioca Club
- **Rio de Janeiro** - Circo Voador, Teatro Odisseia
- **Brasília** - Centro Cultural Banco do Brasil, Toinha Brasil Show
- **Buenos Aires** - Teatro Colón, Niceto Club
- **Santiago** - Teatro Caupolican, Club Blondie
- **Bogotá** - Teatro Jorge Eliécer Gaitán, Armando Records

### Europe (9 cities, 18 venues)

- **London** - Roundhouse, Electric Ballroom
- **Paris** - Olympia, La Cigale
- **Berlin** - Huxleys Neue Welt, SO36
- **Rome** - Atlantico Live, Circolo degli Artisti
- **Madrid** - WiZink Center, Sala Riviera
- **Barcelona** - Sala Apolo, Razzmatazz
- **Vienna** - Arena Wien, Flex
- **Amsterdam** - Paradiso, Melkweg
- **Brussels** - Ancienne Belgique, Botanique

### Asia (4 cities, 8 venues)

**Korea (1 city):**
- **Seoul** - Olympic Hall, Rolling Hall

**Japan (3 cities):**
- **Tokyo** - Shibuya WWW, Liquidroom
- **Osaka** - Namba Hatch, Shangri-La
- **Nagoya** - Diamond Hall, APOLLO BASE

## Data Model Changes

### Updated Venue Interface

```typescript
interface Venue {
  name: string;
  city: string;
  continent: string;  // NEW: "North America", "South America", "Europe", "Asia"
  capacity?: string;
}
```

### Continent Values (Standardized)

- `"North America"` - USA, Canada, Mexico
- `"South America"` - Brazil, Argentina, Chile, Colombia
- `"Europe"` - European cities including Spain
- `"Asia"` - Korea, Japan

### Example Venue Entry

```json
{
  "name": "Madison Square Garden",
  "city": "New York",
  "continent": "North America"
}
```

### Benefits of Continent Field

- Enables future continent-based filtering/reporting
- Can announce region-specific tours ("North American tour")
- Analytics by geographic region
- Easy to extend with additional continents
- No breaking changes to existing interfaces

## Implementation Changes

### Files to Modify

1. **`src/types.ts`**:
   - Add `continent: string` to Venue interface
   - No changes to Concert or State interfaces

2. **`config/venues.json`**:
   - Replace 13 existing Spanish venues
   - Add 60 new global venues with continent field
   - Format: `{ "name": "...", "city": "...", "continent": "..." }`

3. **`src/venues.ts`**:
   - Update validation to check for `continent` field
   - Add error message if continent missing or invalid
   - No logic changes needed

4. **Test files** (`src/__tests__/*.test.ts`):
   - Update mock venue fixtures to include `continent` field
   - Update `src/__tests__/fixtures.ts` helper functions
   - No test logic changes required

5. **Documentation files**:
   - `README.md`: Update venue list, population criteria, feature descriptions
   - `docs/superpowers/specs/2026-03-12-morriliebers-bluesky-bot-design.md`: Update venue section

### Files NOT Modified

- `src/concertGenerator.ts` - No changes (venue selection logic unchanged)
- `src/scheduler.ts` - No changes (scheduling logic unchanged)
- `src/blueskyClient.ts` - No changes (messages already in English)
- `src/storage.ts` - No changes (data structure compatible)
- `src/index.ts` - No changes (orchestration unchanged)

## Migration and Compatibility

### Backward Compatibility

- Existing `data/concerts.json` state files remain valid
- Adding `continent` field is non-breaking (TypeScript types are compatible)
- Concerts in flight will complete normally with old venue data
- No database migration needed (JSON file-based storage)

### Deployment Strategy

1. Stop bot if running (`pm2 stop morriliebers-bot`)
2. Deploy code changes
3. Update venues.json with new data
4. Restart bot (`pm2 restart morriliebers-bot`)
5. Future concerts will use new global venues
6. Existing scheduled concerts complete with original venues

### Testing Strategy

1. Run existing test suite after fixture updates
2. Verify all 75 tests pass
3. Spot-check venue selection includes global cities
4. Verify continent field is present in selected venues
5. Test that venue validation catches missing continent

## What Stays the Same

- Bot scheduling behavior (42-minute checks)
- Weekly announcement logic (Monday 10:00-14:00)
- Concert generation rules (1-3 per week, Wed-Sun, 17:00-23:30)
- Cancellation timing (20-24h before concert)
- Pin/unpin behavior
- State persistence mechanism
- Message templates (already in English)
- Bluesky API integration
- Error handling
- Deployment process

## Documentation Updates

### README.md Changes

- Update "Features" section: "Spanish venues" → "global cities"
- Update venue list section with new city/venue counts
- Update population criteria: "500k+" → "1M+"
- Update venue distribution by region
- Clarify that messages are in English (not Spanish as docs currently suggest)

### Design Doc Updates

- Update original design doc to reflect implemented state
- Add reference to this expansion design doc

## Future Enhancements Enabled

With the `continent` field, future features become possible:

- **Regional tours**: "Morriliebers announces South American tour" with multiple cities
- **Analytics**: Track cancellations by continent
- **Filtering**: Generate concerts for specific regions
- **Themed weeks**: "This week: European venues only"
- **User preferences**: Allow followers to filter by continent (future feature)

## Risks and Mitigations

### Risk: Larger venue list affects randomness
- **Impact**: Low - larger pool increases variety
- **Mitigation**: Monitor that all continents get representation over time

### Risk: International time zones
- **Impact**: None - concert times are local to venue (implementation already handles this)
- **Mitigation**: Not applicable

### Risk: Venue name accuracy
- **Impact**: Low - cosmetic only, doesn't affect bot function
- **Mitigation**: Venues are all real, well-known music venues

## Success Criteria

1. ✓ Bot successfully generates concerts across all continents
2. ✓ All 75 existing tests pass
3. ✓ Venue selection includes cities from all regions
4. ✓ State files remain compatible
5. ✓ No runtime errors or crashes
6. ✓ Documentation accurately reflects global nature

## Complexity Assessment

- **Complexity**: Low
- **Risk**: Low
- **Effort**: Small (primarily data entry)
- **Breaking Changes**: None
- **Test Coverage**: High (75 existing tests validate behavior)
