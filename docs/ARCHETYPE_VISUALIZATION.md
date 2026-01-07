# 🎨 Archetype Visualization - Feature Documentation

## Overview

Added visual archetype indicators throughout the app to help users understand player types and team composition at a glance.

---

## ✨ Features Added

### 1. **Archetype Color Tags** (Draft Page)

**Location:** Player table in draft interface

**What it shows:**
- Top 3 archetypes for each player
- Color-coded by category:
  - 🔵 **Blue** = Offensive (PrimaryCreator, Slasher, etc.)
  - 🔴 **Red** = Defensive (POAStopper, RimProtector, etc.)
  - 🟢 **Green** = Hybrid (ThreeAndD, StretchBig, etc.)
- Hover for full archetype name and percentage

**Example:**
```
Luka Doncic
[Primary Creator] [Secondary Creator] [Connector]
```

**Benefits:**
- Quickly identify player styles during draft
- Compare players at a glance
- Make informed draft decisions based on fit

---

### 2. **Team Composition Analysis** (Draft Recap)

**Location:** Team cards after draft completion

**What it shows:**

#### **Ball Handlers** (Creators)
- Percentage: PrimaryCreator + SecondaryCreator
- Status indicators:
  - ✅ Green: < 30% (balanced)
  - ⚠️ Orange: 30-40% (warning)
  - 🚨 Red: > 40% (penalty active)
- Warning: "⚠️ Creator penalty active!"

#### **Shooting/Spacing**
- Percentage: OffBallShooter + MovementShooter
- Status indicators:
  - ✅ Green: > 25% (excellent)
  - ⚠️ Orange: 15-25% (decent)
  - 🚨 Red: < 15% (poor spacing)
- Bonus: "✨ Spacing bonus active!"

#### **Rim Protection**
- Percentage: RimProtector + DefAnchor
- Status indicators:
  - ✅ Green: > 10% (solid)
  - ⚠️ Orange: 5-10% (vulnerable)
  - 🚨 Red: < 5% (major weakness)
- Warning: "⚠️ Rim protection penalty!"

**Example Display:**
```
┌─────────────────────────────────────┐
│  Your Team                          │
├─────────────────────────────────────┤
│  Team Composition                   │
│                                     │
│  Ball Handlers    [32.5%] ⚠️        │
│  ████████████████░░░░░░░░           │
│  ⚠️ Creator penalty active!          │
│                                     │
│  Shooting/Spacing [28.3%] ✅        │
│  ██████████████████████████         │
│  ✨ Spacing bonus active!            │
│                                     │
│  Rim Protection   [7.2%] ⚠️         │
│  ███░░░░░░░░░░░░░░░░░░░░░░          │
│  ⚠️ Low rim protection.              │
└─────────────────────────────────────┘
```

**Benefits:**
- Understand team strengths/weaknesses instantly
- See which modifiers are active
- Identify roster imbalances
- Learn which teams might perform better

---

## 🎯 How It Works

### Archetype Color Coding

```typescript
Offensive Archetypes (Blue):
- PrimaryCreator
- SecondaryCreator
- Connector
- OffBallShooter
- MovementShooter
- Slasher
- PostScorer
- PlaymakingBig

Defensive Archetypes (Red):
- POAStopper
- HelpDefender
- RimProtector
- DefAnchor
- DefPlaymaker

Hybrid Archetypes (Green):
- ThreeAndD
- StretchBig
- VerticalRoller
- Rebounder
- UtilityWing
```

### Composition Calculation

**Weighted by Impact Rating:**
```typescript
// Each player's contribution is weighted by their impact
weight = player.impactRating / totalTeamImpact

creators = Σ (PrimaryCreator% + SecondaryCreator%) × weight
shooting = Σ (OffBallShooter% + MovementShooter%) × weight
rimProtection = Σ (RimProtector% + DefAnchor%) × weight
```

### Anti-Domination Thresholds

**From simulation engine:**
- Creator Penalty: > 30%
- Shooting Bonus: > 15%
- Rim Protection Penalty: < 10%

---

## 📱 User Experience

### During Draft

**Before:**
```
Luka Doncic | PG | DAL | 28.4 PTS | 9.1 REB | 9.8 AST | [Pick]
```

**After:**
```
Luka Doncic | PG | DAL
[Primary Creator] [Secondary Creator] [Connector]
28.4 PTS | 9.1 REB | 9.8 AST | [Pick]
```

Users can now:
- See player style instantly
- Compare archetypes between players
- Build balanced teams strategically

---

### After Draft

**Before:**
```
Team 1
- Luka Doncic (PG - DAL) 28.4 PTS
- Giannis Antetokounmpo (PF - MIL) 30.0 PTS
- ...
```

**After:**
```
Team 1

Team Composition:
Ball Handlers     [35.2%] ⚠️
⚠️ Creator penalty active!

Shooting/Spacing  [18.5%] ⚠️
✅ Decent shooting distribution.

Rim Protection    [12.1%] ✅
✅ Solid rim protection.

Players:
- Luka Doncic (PG - DAL) 28.4 PTS
- Giannis Antetokounmpo (PF - MIL) 30.0 PTS
- ...
```

Users can now:
- Understand why their team might struggle (too many creators)
- See what bonuses/penalties apply
- Learn from team composition for future drafts

---

## 🔧 Technical Implementation

### New Files

1. **`client/src/utils/archetypes.ts`** (220 lines)
   - `getTopArchetypes()` - Get top N archetypes
   - `getArchetypeColor()` - Color by category
   - `formatArchetypeName()` - Display formatting
   - `calculateTeamComposition()` - Weighted aggregation
   - `getCompositionStatus()` - Good/Warning/Danger
   - `getCompositionMessage()` - User-friendly messages

### Updated Files

2. **`client/src/pages/DraftPage.tsx`**
   - Added "Archetypes" column to player table
   - Shows top 3 archetypes with color tags
   - Hover tooltip with percentages

3. **`client/src/pages/DraftRecapPage.tsx`**
   - Added composition analysis section to each team card
   - Shows 3 key metrics with progress bars
   - Color-coded status indicators
   - Warning/bonus messages

---

## 🎨 Visual Design

### Color Palette

```css
/* Offensive (Blue) */
bg-blue-100 text-blue-800 border-blue-200

/* Defensive (Red) */
bg-red-100 text-red-800 border-red-200

/* Hybrid (Green) */
bg-green-100 text-green-800 border-green-200

/* Status Colors */
Good:    bg-green-50 text-green-600 border-green-200
Warning: bg-orange-50 text-orange-600 border-orange-200
Danger:  bg-red-50 text-red-600 border-red-200
```

### Progress Bars

- Background: `bg-gray-200`
- Fill colors match status (green/orange/red)
- Height: 8px (h-2)
- Rounded corners for polish

---

## 📊 Examples

### Balanced Team
```
Ball Handlers     [25.0%] ✅
Shooting/Spacing  [30.0%] ✅ ✨
Rim Protection    [15.0%] ✅
```
**Result:** No penalties, shooting bonus active = Strong team!

### Unbalanced Team (Too Many Creators)
```
Ball Handlers     [45.0%] 🚨 ⚠️
Shooting/Spacing  [12.0%] 🚨
Rim Protection    [8.0%] ⚠️
```
**Result:** Creator penalty + rim protection penalty = Struggles expected

### Shooting-Heavy Team
```
Ball Handlers     [20.0%] ✅
Shooting/Spacing  [35.0%] ✅ ✨
Rim Protection    [5.0%] 🚨 ⚠️
```
**Result:** Great spacing bonus, but vulnerable inside

---

## 🚀 Future Enhancements

Possible additions:
- [ ] Player detail modal with full archetype breakdown (all 18)
- [ ] Radar chart for archetype visualization
- [ ] Compare two players side-by-side
- [ ] Team composition during draft (preview)
- [ ] Advanced archetype filtering in player search
- [ ] Archetype-based recommendations ("You need more shooting")

---

## ✅ Testing Checklist

- [ ] Archetype tags display for all players
- [ ] Colors match archetype categories
- [ ] Hover tooltips work
- [ ] Team composition calculates correctly
- [ ] Progress bars render properly
- [ ] Warning messages appear when appropriate
- [ ] Bonus/penalty indicators show correctly
- [ ] Responsive on mobile devices

---

## 🎓 Educational Value

This feature helps users learn:
1. **What archetypes mean** - Visual indicators make abstract concepts concrete
2. **Team building** - See the impact of composition choices
3. **Why teams win/lose** - Connect roster decisions to simulation results
4. **Draft strategy** - Make informed picks based on team needs

**Result:** Users become better at the game through visual feedback!
